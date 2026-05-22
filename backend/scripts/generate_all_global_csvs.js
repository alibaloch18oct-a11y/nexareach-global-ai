import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const jobs = [
  ["Pakistan", "Karachi"],
  ["Pakistan", "Lahore"],
  ["Pakistan", "Islamabad"],
  ["Pakistan", "Hyderabad"],
  ["United Arab Emirates", "Dubai"],
  ["United Arab Emirates", "Abu Dhabi"],
  ["United Arab Emirates", "Sharjah"],
  ["Qatar", "Doha"],
  ["Saudi Arabia", "Riyadh"],
  ["Saudi Arabia", "Jeddah"],
  ["Malaysia", "Kuala Lumpur"],
  ["United Kingdom", "London"],
  ["United States", "New York"],
  ["Canada", "Toronto"],
  ["Australia", "Sydney"]
];

const categories = [
  "software houses",
  "IT companies",
  "company offices",
  "restaurants",
  "banks",
  "clinics",
  "schools",
  "hotels",
  "shops",
  "real estate agencies",
  "travel agencies"
];

const root = process.cwd();
const script = path.join(root, "scripts", "generate_global_csv.js");

if (!fs.existsSync(script)) {
  console.error("Missing scripts/generate_global_csv.js. Create that file first.");
  process.exit(1);
}

for (const [country, city] of jobs) {
  for (const category of categories) {
    console.log(`\n==============================`);
    console.log(`Generating: ${city}, ${country} - ${category}`);
    console.log(`==============================`);

    const result = spawnSync(
      "node",
      [script, city, country, category],
      {
        cwd: root,
        stdio: "inherit",
        shell: true
      }
    );

    if (result.status !== 0) {
      console.log(`Skipped/failed: ${city}, ${country} - ${category}`);
    }
  }
}

console.log("\nAll CSV generation jobs completed.");
console.log("Check backend/data folder for generated CSV files.");
