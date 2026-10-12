import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public");
const dashboard = path.join(root, "data", "dashboard.json");

if (!fs.existsSync(dashboard)) throw new Error("data/dashboard.json is required. Run npm run sync-data before building the production site.");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, "data"), { recursive: true });
fs.cpSync(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
for (const file of ["index.html", "login.html"]) fs.copyFileSync(path.join(root, file), path.join(output, file));
fs.copyFileSync(dashboard, path.join(output, "data", "dashboard.json"));
console.log("Production static files built in public/");
