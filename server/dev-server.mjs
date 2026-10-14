import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createEducationDatabase } from "./database.mjs";
import { createLocalApiServer } from "./local-api-server.mjs";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDirectory, "..");
const port = Number(process.env.PORT || 4176);
const cloudRuntime = process.env.RENDER === "true" || process.env.NODE_ENV === "production";
const host = process.env.HOST || (cloudRuntime ? "0.0.0.0" : "127.0.0.1");
const databasePath = process.env.AI_EDUCATION_DATABASE_PATH || resolve(projectRoot, "data", "ai-education.sqlite");
if (process.env.RENDER === "true" && !process.env.AI_EDUCATION_DATABASE_PATH) {
  throw new Error("Set AI_EDUCATION_DATABASE_PATH to a file on your Render persistent disk.");
}
const database = createEducationDatabase(databasePath, {
  seedDemoAccounts: process.env.AI_EDUCATION_SEED_DEMO_ACCOUNTS === "true" ||
    (!cloudRuntime && process.env.AI_EDUCATION_SEED_DEMO_ACCOUNTS !== "false"),
});
const server = createServer(createLocalApiServer({
  database,
  projectRoot,
  secureCookies: cloudRuntime,
  publicDemo: process.env.AI_EDUCATION_PUBLIC_DEMO === "true",
}));

server.listen(port, host, () => {
  console.log(`AI Education runtime: http://${host}:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});

function closeServer() {
  server.close(() => database.close());
}

process.on("SIGINT", closeServer);
process.on("SIGTERM", closeServer);
