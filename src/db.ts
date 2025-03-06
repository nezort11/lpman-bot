import { Driver, getCredentialsFromEnv, TypedValues } from "ydb-sdk";
import { Ydb } from "telegraf-session-store-ydb";
import path from "path";
import { MOUNT_ROOT_DIR_PATH, YDB_DATABASE, YDB_ENDPOINT } from "./env";
import type { Update } from "telegraf/types";

process.env.YDB_SERVICE_ACCOUNT_KEY_FILE_CREDENTIALS = path.resolve(
  MOUNT_ROOT_DIR_PATH,
  "./env/yc_sakey.json"
);
export const driver = new Driver({
  // connectionString does not work for some reason
  // connectionString: "",
  endpoint: YDB_ENDPOINT,
  database: YDB_DATABASE,
  authService: getCredentialsFromEnv(),
});

// // Generic Redis-like store-table in YDB
// export const store = Ydb<any>({
//   driver,
//   driverOptions: { enableReadyCheck: true },
//   tableOptions: {
//     shouldCreateTable: true,
//     tableName: "store",
//     keyColumnName: "key",
//     sessionColumnName: "value",
//   },
// });

export const sessionStore = Ydb<any>({
  driver,
  driverOptions: { enableReadyCheck: true },
  tableOptions: {
    shouldCreateTable: true,
    tableName: "sessions",
  },
});
