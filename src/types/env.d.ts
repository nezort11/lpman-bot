export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APP_ENV: "local" | undefined;
      BOT_TOKEN: string;
      BOT_TOKEN_DEV: string;

      YDB_ENDPOINT: string;
      YDB_DATABASE: string;
    }
  }
}
