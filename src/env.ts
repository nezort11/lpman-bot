import path from "path";
import * as dotenv from "dotenv";

export const LAMBDA_TASK_ROOT = false; //process.env.LAMBDA_TASK_ROOT;
export const MOUNT_ROOT_DIR_PATH = LAMBDA_TASK_ROOT ? "../storage/" : "./";

dotenv.config({ path: path.join(MOUNT_ROOT_DIR_PATH, "./env/.env") });

// console.log("process env", process.env);

export const APP_ENV = process.env.APP_ENV;

export const BOT_TOKEN =
  APP_ENV === "local" ? process.env.BOT_TOKEN_DEV : process.env.BOT_TOKEN;

export const YDB_ENDPOINT = process.env.YDB_ENDPOINT;
export const YDB_DATABASE = process.env.YDB_DATABASE;
