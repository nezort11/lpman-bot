import { Stage, WizardScene } from "telegraf/scenes";
import { BotContext } from "./types";
import { isValidCryptoAddress } from "./utils";

export enum SceneId {
  EnterAddress = "ENTER_ADDRESS",
}

// Address Wizard Scene
const addressWizard = new WizardScene<BotContext>(
  SceneId.EnterAddress,
  async (context) => {
    await context.reply("Please enter your crypto address:");
    return context.wizard.next();
  },
  async (context) => {
    if (!(context.message && "text" in context.message)) {
      return await context.reply(
        "Invalid crypto address. Please try again."
      );
    }

    const address = context.message.text.trim();
    if (!isValidCryptoAddress(address)) {
      await context.reply("Invalid crypto address. Please try again.");
      return;
    }

    context.session.ownerAddress = address;
    await context.reply(`Your address has been saved: ${address}`);
    return await context.scene.leave();
  }
);

// Create stage and register wizard
export const stage = new Stage([addressWizard]);
