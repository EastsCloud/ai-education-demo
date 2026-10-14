import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serverDirectory = dirname(fileURLToPath(import.meta.url));
const contracts = readdirSync(serverDirectory)
  .filter((fileName) => fileName.endsWith("-contract.mjs"))
  .sort();

for (const fileName of contracts) {
  const result = spawnSync(process.execPath, [resolve(serverDirectory, fileName)], {
    cwd: resolve(serverDirectory, ".."),
    encoding: "utf8",
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  if (result.status !== 0) {
    console.error(`contract failed: ${fileName}`);
    if (result.error) console.error(result.error.message);
    if (output) console.error(output);
    process.exit(result.status || 1);
  }
  console.log(output || `${fileName}: passed`);
}

console.log(`contract-suite: ${contracts.length} passed`);
