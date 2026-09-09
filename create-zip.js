/**
 * create-zip.js
 * Packages the project into a distributable ZIP file, excluding
 * node_modules, build artifacts, and any real .env secrets.
 *
 * Usage: npm run zip
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const OUTPUT_NAME = "AI-MERN-Application-Final.zip";
const OUTPUT_PATH = path.join(ROOT, OUTPUT_NAME);

const EXCLUDES = [
  "node_modules/*",
  "*/node_modules/*",
  "*/*/node_modules/*",
  "client/dist/*",
  "*.zip",
  "**/.env",
  "**/.DS_Store",
  "**/npm-debug.log*",
];

function main() {
  if (fs.existsSync(OUTPUT_PATH)) {
    fs.unlinkSync(OUTPUT_PATH);
  }

  const excludeArgs = EXCLUDES.map((pattern) => `-x "${pattern}"`).join(" ");
  const cmd = `cd "${ROOT}" && zip -r "${OUTPUT_NAME}" . ${excludeArgs}`;

  console.log("Creating zip archive...");
  execSync(cmd, { stdio: "inherit" });
  console.log(`\nDone! Created ${OUTPUT_NAME}`);
}

main();
