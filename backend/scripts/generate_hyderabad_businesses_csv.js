import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_FILE = path.join(DATA_DIR, "hyderabad_businesses.csv");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const bbox = {
  south: 25.3200,
  west: 68.2500,
  north: 25.4700,
  east: 68.4700
};

const overpassQuery = `
[out:json][timeout:60];
(
  node["amenity"~"restaurant|cafe|fast_food|bank|school|college|clinic|hospital|pharmacy"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["shop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["office"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  node["tourism"~"hotel|guest_house|hostel|motel"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out tags;
`;

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
  if (tags.shop) {
    const shopMap = {
      mobile_phone: "Mobile Shop",
      electronics: "Electronics Shop",
      computer: "Computer Shop",
      supermarket: "Supermarket",
      convenience: "Shop",
      clothes: "Clothing Shop",
      shoes: "Shoe Shop",
      bakery: "Bakery",
      mall: "Shopping Mall",
      department_store: "Department Store"
    };
    return shopMap[tags.shop] || `Shop - ${tags.shop}`;
  }

  if (tags.office) {
    const officeMap = {
      company: "Company Office",
      estate_agent: "Real Estate",
      travel_agent: "Travel Agency",
      it: "IT Company",
      insurance: "Insurance Office",
      lawyer: "Law Office",
      accountant: "Accounting Office"
    };
    return officeMap[tags.office] || `Office - ${tags.office}`;
  }

  if (tags.amenity) {
    const amenityMap = {
      restaurant: "Restaurant",
      cafe: "Cafe",
      fast_food: "Fast Food",
      bank: "Bank",
      school: "School",
      college: "College",
      clinic: "Clinic",
      hospital: "Hospital",
      pharmacy: "Pharmacy"
    };
    return amenityMap[tags.amenity] || `Amenity - ${tags.amenity}`;
  }

  if (tags.tourism) {
    const tourismMap = {
      hotel: "Hotel",
      guest_house: "Guest House",
      hostel: "Hostel",
      motel: "Motel"
    };
    return tourismMap[tags.tourism] || `Tourism - ${tags.tourism}`;
  }

  return "Business";
}

function buildAddress(tags = {}) {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:district"],
    tags["addr:state"]
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Hyderabad, Sindh, Pakistan";
}

function elementToRow(element) {
  const tags = element.tags || {};
  const name = tags.name || tags["name:en"] || tags.brand || tags.operator || "";

  if (!name) return null;

  const phone = getTag(tags, [
    "phone",
    "contact:phone",
    "mobile",
    "contact:mobile",
    "whatsapp",
    "contact:whatsapp"
  ]);

  const email = getTag(tags, ["email", "contact:email"]);
  const website = getTag(tags, ["website", "contact:website", "url"]);
  const category = mapCategory(tags);
  const address = buildAddress(tags);
  const lat = element.lat || "";
  const lon = element.lon || "";
  const osmId = `${element.type}/${element.id}`;
  const source = "OpenStreetMap / Overpass";
  const status = phone ? "Ready to WhatsApp" : "Needs Phone";

  return {
    name,
    category,
    phone,
    email,
    website,
    location: "Hyderabad, Sindh, Pakistan",
    address,
    status,
    priority:
      category.includes("IT") ||
      category.includes("Company") ||
      category.includes("School")
        ? "High"
        : "Medium",
    source,
    osmId,
    lat,
    lon,
    notes: `Real public OSM lead. OSM ID: ${osmId}`
  };
}

async function fetchWithTimeout(url, options, timeoutMs = 90000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function fetchOverpass() {
  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying Overpass endpoint: ${endpoint}`);

      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "NexaReachAI/1.0"
        },
        body: new URLSearchParams({ data: overpassQuery })
      });

      console.log(`Response status: ${response.status}`);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      console.log(`Fetched OSM elements: ${data.elements?.length || 0}`);
      return data.elements || [];
    } catch (error) {
      console.log(`Failed endpoint: ${endpoint}`);
      console.log(`Reason: ${error.message}`);
    }
  }

  throw new Error("All Overpass endpoints failed.");
}

function removeDuplicates(rows) {
  const seen = new Set();
  const unique = [];

  for (const row of rows) {
    const key = `${row.osmId || row.name}-${row.address}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }

  return unique;
}

async function main() {
  console.log("Starting Hyderabad business CSV generator...");
  console.log("Fetching real public businesses from OpenStreetMap...");

  const elements = await fetchOverpass();

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