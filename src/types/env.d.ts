export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      APP_ENV: "local" | undefined;

      YDB_ENDPOINT: string;
      YDB_DATABASE: string;
    }
  }
}
