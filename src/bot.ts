import { type Context, Telegraf, session, Markup } from "telegraf";
import { message } from "telegraf/filters";
import { round } from "lodash";

import chromium from "@sparticuz/chromium";
import puppeteer, { Page } from "puppeteer-core";

import { APP_ENV, BOT_TOKEN } from "./env";
import { sessionStore } from "./db";
import { BotContext, BotSession } from "./types";
import { SceneId, stage } from "./scenes";
import { delay, importPTimeout } from "./utils";
import { getActivePositions } from "./subgraph";

const ERROR_FORBIDDEN_BOT_WAS_BLOCKED_BY_THE_USER =
  "403: Forbidden: bot was blocked by the user";

const replyError = (
  context: Context,
  ...replyArgs: Parameters<typeof Context.prototype.reply>
) => {
  replyArgs[0] = `⚠️  ${replyArgs[0]}`;
  return context.reply(...replyArgs);
};

const handleError = async (error: unknown, context: Context) => {
  if (typeof error === "object" && error !== null) {
    if (
      "message" in error &&
      error.message === ERROR_FORBIDDEN_BOT_WAS_BLOCKED_BY_THE_USER
    ) {
      return console.warn(error);
    }
    const { TimeoutError } = await importPTimeout();
    // p-timeout error thrown by telegraf based on `handlerTimeout`
    if ("name" in error && error.name === TimeoutError.name) {
      return await replyError(
        context,
        "Bot takes to much timeout handle this..."
      );
    }
  }

  console.error(error);
  await replyError(context, "Internal error occurred");
};

// Telegram bot server webhook has 60s timeout https://github.com/tdlib/telegram-bot-api/issues/341#issuecomment-1354554550
const BOT_TIMEOUT = 50 * 1000;

export const bot = new Telegraf<BotContext>(BOT_TOKEN, {
  // REQUIRED for `sendChatAction` to work in serverless/webhook environment https://github.com/telegraf/telegraf/issues/1047
  telegram: { webhookReply: false },
  handlerTimeout: BOT_TIMEOUT,
});

bot.use(async (ctx, next) => {
  if (
    ctx.message &&
    "text" in ctx.message &&
    ctx.message.text.startsWith("/")
  ) {
    delete ctx.session?.__scenes;
  }

  return await next();
});

bot.command("cancel", async (context) => {
  // delete context.session.__scenes;
  await context.reply("Left this dialog", {
    ...Markup.removeKeyboard(),
    disable_notification: true,
  });
});

bot.use(
  session({ store: sessionStore, defaultSession: (): BotSession => ({}) })
);

bot.use(stage.middleware());

bot.use(async (context, next) => {
  await context.persistentChatAction("typing", async () => {
    await next();
  });
});

bot.start(async (context) => {
  await context.reply(
    "Hi there, I am LP Man! I can help you manage your Liquidity Provider position in various DEX pair pools\n\n/setaddress - Set your crypto address\n/positions - Display active position for owner address"
  );
});

bot.command("setaddress", async (context) => {
  await context.scene.enter(SceneId.EnterAddress);
});

bot.command("positions", async (context) => {
  const ownerAddress = context.session.ownerAddress;
  if (!ownerAddress) {
    return await context.reply(
      "Please set your crypto address first. /setaddress"
    );
  }

  const activePositions = await getActivePositions(ownerAddress);
  console.log("activePositions", activePositions);
  if (activePositions.length === 0) {
    return await context.reply(
      `No active positions found for your address ${ownerAddress}`
    );
  }

  const position = activePositions[0];

  console.log("chromium executable path...");
  const chromiumPath = await chromium.executablePath();
  console.log("chromiumPath", chromiumPath, chromium.args);

  console.log("puppeteer launch");
  const browser = await puppeteer.launch(
    APP_ENV === "local"
      ? {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          headless: false,
          devtools: true,
        }
      : {
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: chromiumPath,
          headless: chromium.headless as "shell",
          // ignoreHTTPSErrors: true,
        }
  );

  console.log("browser newPage");
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
  });

  console.log("page goto");
  await page.goto(
    `https://pancakeswap.finance/liquidity/${position.id}?chain=bsc&persistChain=1`,
    {
      waitUntil: "networkidle2",
      timeout: 0,
    }
  );

  await delay(5000);

  const pageContent = await page.content();
  console.log("pageContent", pageContent.length);

  const positionCardSelector =
    "#__next > div.sc-988a99b1-0.eofyWz._1a5xov70._1qhetbf15i._1qhetbf16q > div.sc-3fcdcbc5-1.sc-988a99b1-4.jvEjwn.lnsiAZ > div > div > div.sc-3fcdcbc5-1.jrystL > div > div";
  const positionCardHeaderSelector = `${positionCardSelector} > div.sc-3fcdcbc5-1.sc-9cde33ed-0.sc-f27bab7e-0.gbBSci.hJpHKU.eflpCB > div > div > div > div.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.kdVScb > div`;
  const positionCardBodyLiquiditySelector = `${positionCardSelector} > div.sc-924b0d3b-0.fkmAJX > div._1a5xov70._1qhetbf6._1qhetbf1q0._1qhetbf2o._1qhetbf7i._1qhetbft6._1qhetbf46 > div`;
  const positionCardPriceRangeSelector = `${positionCardSelector} > div.sc-924b0d3b-0.fkmAJX > div.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.fAzhcp > div.sc-3fcdcbc5-1.doPGMl`;

  const positionTitleElement = await page.$(
    `${positionCardHeaderSelector} > div.sc-3fcdcbc5-1.sc-9cde33ed-0.gbBSci.bhTcKs > h2`
  );
  const positionInfoElement = await page.$(
    `${positionCardHeaderSelector} > div._1a5xov70._1qhetbf6._1qhetbf1q0._1qhetbf2o._1qhetbf8i._1qhetbft6._1qhetbf4c._1qhetbf22u > div`
  );
  const liquidityElement = await page.$(
    `${positionCardBodyLiquiditySelector} > div.sc-3fcdcbc5-1.crdkdg > div.sc-1e14ff52-0.fusaTy`
  );
  const unclaimedFeesElement = await page.$(
    `${positionCardBodyLiquiditySelector} > div.sc-3fcdcbc5-1.doPGMl > div._1a5xov70._1qhetbfg0._1qhetbf6._1qhetbf1q0._1qhetbf2o._1qhetbf8i._1qhetbft6._1qhetbf46 > div`
  );
  const aprElement = await page.$(
    `${positionCardBodyLiquiditySelector} > div.sc-3fcdcbc5-1.crdkdg > div.sc-3fcdcbc5-1.sc-9cde33ed-0.cEoyjA.hJpHKU > div > div:nth-child(2) > div > div > span > div`
  );
  const minPriceRangeElement = await page.$(
    `${positionCardPriceRangeSelector} > div._1a5xov70._1qhetbfg0._1qhetbf6._1qhetbf1q0._1qhetbf2o._1qhetbf7i._1qhetbft6._1qhetbf46 > div > div.sc-3fcdcbc5-1.sc-2340fd50-0.sc-2340fd50-2.lpuOsy.dkMNzI.eEPkok > h2`
  );
  const maxPriceRangeElement = await page.$(
    `${positionCardPriceRangeSelector} > div._1a5xov70._1qhetbfg0._1qhetbf6._1qhetbf1q0._1qhetbf2o._1qhetbf7i._1qhetbft6._1qhetbf46 > div > div.sc-3fcdcbc5-1.sc-2340fd50-0.sc-2340fd50-2.hKMEfs.dkMNzI.eEPkok > h2`
  );
  const currentPriceElement = await page.$(
    `${positionCardPriceRangeSelector} > div.sc-3fcdcbc5-1.sc-2340fd50-0.sc-2340fd50-2.gbBSci.dkMNzI.eEPkok > h2`
  );

  const positionTitleValue = await page.evaluate(
    (el) => el!.textContent!.trim(),
    positionTitleElement
  );
  const positionInfoValue = await page.evaluate(
    (el) => el!.textContent!.trim(),
    positionInfoElement
  );
  const liquidityValue = await page.evaluate(
    (el) => el!.textContent!.trim(),
    liquidityElement
  );
  const unclaimedFeesValue = await page.evaluate(
    (el) => el!.textContent!.trim(),
    unclaimedFeesElement
  );
  const aprValue = await page.evaluate(
    (el) => el!.textContent!.trim(),
    aprElement
  );
  const minPriceRangeValue = +(await page.evaluate(
    (el) => el!.textContent!.trim(),
    minPriceRangeElement
  ));
  const maxPriceRangeValue = +(await page.evaluate(
    (el) => el!.textContent!.trim(),
    maxPriceRangeElement
  ));
  const currentPriceValue = +(await page.evaluate(
    (el) => el!.textContent!.trim(),
    currentPriceElement
  ));

  await browser.close();

  const priceRangeLength = maxPriceRangeValue - minPriceRangeValue;
  const currentPriceStartDifference =
    currentPriceValue - minPriceRangeValue;
  const currentPriceStartOffset =
    currentPriceStartDifference / priceRangeLength;

  await context.replyWithHTML(`
Here is the liquidity provider 🗄️ positions for address ${ownerAddress}:

💰 <b>${positionTitleValue} (${positionInfoValue})</b>:
Liquidity: ${liquidityValue}
APR: ${aprValue}
Unclaimed fees: ${unclaimedFeesValue}
Price range: ${minPriceRangeValue} — ${maxPriceRangeValue}
Current price: ${currentPriceValue} (${round(
    currentPriceStartOffset * 100,
    2
  )}%)
`);
});

bot.on(message("text"), async (context) => {
  try {
    const url = new URL(context.message.text);

    await context.reply(url.href, {
      reply_markup: {
        inline_keyboard: [[{ text: "Open", web_app: { url: url.href } }]],
      },
    });
  } catch (error) {
    console.error(error);
    await context.telegram.sendMessage(
      context.chat.id,
      "Please provide a valid HTTPS URL."
    );
  }
});

bot.catch(async (error, context) => {
  await handleError(error, context);
});
