import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const city = process.argv[2] || "Dubai";
const country = process.argv[3] || "United Arab Emirates";
const category = process.argv[4] || "business";

const fileSafe = `${city}_${country}_${category}`
  .replace(/[^a-z0-9]+/gi, "_")
  .toLowerCase();

const CSV_FILE = path.join(DATA_DIR, `${fileSafe}_businesses.csv`);

function csvSafe(value) {
  const text = String(value || "").replace(/\r?\n|\r/g, " ").trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function getTag(tags, keys) {
  for (const key of keys) {
    if (tags?.[key]) return tags[key];
  }
  return "";
}

function mapCategory(tags = {}) {
  if (tags.shop) return `Shop - ${tags.shop}`;
  if (tags.office) return `Office - ${tags.office}`;
  if (tags.amenity) return `Amenity - ${tags.amenity}`;
  if (tags.tourism) return `Tourism - ${tags.tourism}`;
  return "Business";
}

function categoryToOverpass(category) {
  const c = String(category || "business").toLowerCase();

  if (c.includes("restaurant")) return `node["amenity"~"restaurant|fast_food|cafe"]`;
  if (c.includes("bank")) return `node["amenity"~"bank|atm"]`;
  if (c.includes("school")) return `node["amenity"~"school|college|university"]`;
  if (c.includes("clinic")) return `node["amenity"~"clinic|hospital|doctors|pharmacy"]`;
  if (c.includes("hotel")) return `node["tourism"~"hotel|guest_house|hostel|motel"]`;
  if (c.includes("real")) return `node["office"="estate_agent"]`;
  if (c.includes("travel")) return `node["office"="travel_agent"]`;
  if (c.includes("software") || c.includes("it")) return `node["office"~"it|company"]`;
  if (c.includes("shop") || c.includes("store")) return `node["shop"]`;

  return `
node["amenity"~"restaurant|cafe|fast_food|bank|atm|school|college|university|clinic|hospital|doctors|pharmacy|fuel|marketplace"]
node["shop"]
node["office"]
node["tourism"~"hotel|guest_house|hostel|motel"]
`;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function geocode() {
  const q = encodeURIComponent(`${city}, ${country}`);
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
    {
      headers: {
        "User-Agent": "NexaReachGlobalAI/2.0"
      }
    },
    45000
  );

  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

  const data = await response.json();
  if (!data.length) throw new Error("Location not found");

  const [south, north, west, east] = data[0].boundingbox.map(Number);
  return { south, north, west, east, displayName: data[0].display_name };
}

function buildQuery(bbox) {
  const box = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;

  const selectorLines = categoryToOverpass(category)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `${line}${box};`)
    .join("\n  ");

  return `
[out:json][timeout:90];
(
  ${selectorLines}
);
out center tags;
`;
}

async function fetchOverpass(query) {
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying: ${endpoint}`);

      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "NexaReachGlobalAI/2.0"
        },
        body: new URLSearchParams({ data: query })
      });

      console.log(`Status: ${response.status}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      return data.elements || [];
    } catch (error) {
      console.log(`Failed: ${error.message}`);
    }
  }

  throw new Error("All Overpass endpoints failed");
}

function buildAddress(tags = {}) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:district"],
    tags["addr:state"],
    tags["addr:country"]
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : `${city}, ${country}`;
}

function elementToRow(element) {
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || tags.brand || tags.operator || "";
  if (!name) return null;

  const phone = getTag(tags, ["phone", "contact:phone", "mobile", "contact:mobile", "whatsapp", "contact:whatsapp"]);
  const email = getTag(tags, ["email", "contact:email"]);
  const website = getTag(tags, ["website", "contact:website", "url"]);
  const lat = element.lat || element.center?.lat || "";
  const lon = element.lon || element.center?.lon || "";
  const osmId = `${element.type}/${element.id}`;

  return {
    name,
    category: mapCategory(tags),
    phone,
    email,
    website,
    country,
    city,
    location: `${city}, ${country}`,
    address: buildAddress(tags),
    status: phone ? "Ready to WhatsApp" : "Needs Phone",
    priority: "Medium",
    source: "OpenStreetMap / Overpass",
    osmId,
    lat,
    lon,
    notes: `Real public OSM lead. OSM ID: ${osmId}`
  };
}

function removeDuplicates(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.osmId || row.name}-${row.address}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  console.log(`Generating global CSV for ${category} in ${city}, ${country}`);

  const bbox = await geocode();
  console.log(`Found location: ${bbox.displayName}`);

  const query = buildQuery(bbox);
  const elements = await fetchOverpass(query);

  const rows = removeDuplicates(
    elements
      .map(elementToRow)
      .filter(Boolean)
      .filter((row) => row.name.length > 1)
  );

  const headers = [
    "name",
    "category",
    "phone",
    "email",
    "website",
    "country",
    "city",
    "location",
    "address",
    "status",
    "priority",
    "source",
    "osmId",
    "lat",
    "lon",
    "notes"
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvSafe(row[header])).join(","))
  ].join("\n");

  fs.writeFileSync(CSV_FILE, csv, "utf-8");

  console.log("Done.");
  console.log(`CSV saved: ${CSV_FILE}`);
  console.log(`Total businesses: ${rows.length}`);
  console.log(`Ready to WhatsApp: ${rows.filter((row) => row.phone).length}`);
  console.log(`Needs phone: ${rows.filter((row) => !row.phone).length}`);
}

main().catch((error) => {
  console.error("CSV generation failed:", error.message);
});