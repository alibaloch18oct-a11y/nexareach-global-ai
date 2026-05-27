import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.NEXAREACH_DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function ensureFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

ensureFile(PROFILE_FILE, {
  fullName: "Shahzaib Ali",
  title: "Information Technology Graduate | AI & Full Stack Developer",
  email: "alibaloch18oct@gmail.com",
  phone: "",
  whatsapp: "",
  location: "Pakistan",
  portfolio: "",
  linkedin: "",
  github: "",
  resumeUrl: "",
  skills: "React, Node.js, AI Apps, Dashboards, Automation, JavaScript, Express",
  projects: "NexaAgent AI, Jarvis AI Assistant, School Management System, FBR AI Assistant, Portfolio Website",
  bio: "I build AI-powered software, business automation tools, dashboards, and modern web applications."
});

ensureFile(LEADS_FILE, []);
ensureFile(LOGS_FILE, []);

app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5179"]
      : true,
    credentials: true
  })
);
app.use(express.json({ limit: "30mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage });

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
}

function normalizeHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .replace(/^"|"$/g, "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeCell(value) {
  return String(value || "")
    .replace(/^\uFEFF/, "")
    .replace(/^"|"$/g, "")
    .trim();
}

function detectDelimiter(firstLine) {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

function parseCsv(text) {
  const cleanText = String(text || "").replace(/^\uFEFF/, "");
  const firstLine = cleanText.split(/\r?\n/)[0] || "";
  const delimiter = detectDelimiter(firstLine);

  const rows = [];
  let row = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const next = cleanText[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (value || row.length) {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      }
      if (char === "\r" && next === "\n") i++;
    } else {
      value += char;
    }
  }

  if (value || row.length) rows.push([...row, value]);

  const nonEmptyRows = rows.filter((r) => r.some((cell) => String(cell || "").trim() !== ""));
  if (nonEmptyRows.length < 2) return [];

  const headers = nonEmptyRows[0].map(normalizeHeader);

  return nonEmptyRows.slice(1).map((cells) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = normalizeCell(cells[index]);
    });
    return item;
  });
}

function getCsvValue(row, keys) {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    if (row[normalizedKey]) return row[normalizedKey];
  }
  return "";
}

function normalizePhone(phone) {
  if (!phone) return "";
  let cleaned = String(phone).replace(/[^\d]/g, "");
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("0")) cleaned = "92" + cleaned.slice(1);
  return cleaned;
}

function createWhatsAppUrl(phone, message) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || !message) return "";
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

function csvRowToLead(row, index) {
  const name = getCsvValue(row, [
    "name",
    "business name",
    "company",
    "company name",
    "title",
    "place",
    "place name"
  ]);

  const phone = getCsvValue(row, [
    "phone",
    "whatsapp",
    "mobile",
    "contact",
    "contact phone",
    "contact:phone",
    "telephone"
  ]);

  const country = getCsvValue(row, ["country"]);
  const city = getCsvValue(row, ["city"]);
  const location = getCsvValue(row, ["location"]) || [city, country].filter(Boolean).join(", ");

  return {
    id: getCsvValue(row, ["id"]) || `csv-${Date.now()}-${index}`,
    osmId: getCsvValue(row, ["osmid", "osm id", "osm"]),
    name,
    category: getCsvValue(row, ["category", "type", "business type"]) || "Business",
    phone,
    email: getCsvValue(row, ["email", "mail", "contact email"]),
    website: getCsvValue(row, ["website", "url", "web"]),
    country: country || "",
    city: city || "",
    location: location || "Global",
    address: getCsvValue(row, ["address", "addr", "street"]) || location || "Global",
    contactPerson: getCsvValue(row, ["contact person", "contactperson"]) || "",
    notes: getCsvValue(row, ["notes", "note"]) || "Imported from CSV.",
    status: phone ? "Ready to WhatsApp" : "Needs Phone",
    priority: getCsvValue(row, ["priority"]) || "Medium",
    source: getCsvValue(row, ["source"]) || "CSV Import",
    lat: getCsvValue(row, ["lat", "latitude"]),
    lon: getCsvValue(row, ["lon", "lng", "longitude"]),
    lastMessage: "",
    whatsappUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function filterLeads(leads, query) {
  const country = query.country || "All Countries";
  const city = query.city || "All Cities";
  const status = query.status || "All";
  const q = String(query.q || "").toLowerCase().trim();

  return leads.filter((lead) => {
    const matchesCountry = country === "All Countries" || !country ? true : lead.country === country;
    const matchesCity = city === "All Cities" || !city ? true : lead.city === city;

    const matchesStatus =
      status === "All"
        ? true
        : status === "Ready to WhatsApp"
        ? Boolean(lead.phone)
        : status === "Needs Phone"
        ? !lead.phone
        : lead.status === status;

    const haystack = `${lead.name} ${lead.category} ${lead.phone} ${lead.email} ${lead.status} ${lead.address} ${lead.source} ${lead.city} ${lead.country}`.toLowerCase();

    const matchesSearch = q ? haystack.includes(q) : true;

    return matchesCountry && matchesCity && matchesStatus && matchesSearch;
  });
}

function getFilteredCounts(leads) {
  return {
    total: leads.length,
    readyToWhatsApp: leads.filter((lead) => lead.phone).length,
    needsPhone: leads.filter((lead) => !lead.phone).length,
    generated: leads.filter((lead) => String(lead.status || "").includes("Generated")).length,
    sent: leads.filter((lead) => lead.status === "Sent").length,
    interested: leads.filter((lead) => lead.status === "Interested").length,
    followUp: leads.filter((lead) => lead.status === "Follow Up").length
  };
}

function getTag(tags, keys) {
  for (const key of keys) {
    if (tags?.[key]) return tags[key];
  }
  return "";
}

function mapOsmCategory(tags = {}) {
  if (tags.shop) return `Shop - ${tags.shop}`;
  if (tags.office) return `Office - ${tags.office}`;
  if (tags.amenity) return `Amenity - ${tags.amenity}`;
  if (tags.tourism) return `Tourism - ${tags.tourism}`;
  return "Business";
}

function buildAddress(tags = {}, fallback = "Global") {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:district"],
    tags["addr:state"],
    tags["addr:country"]
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : fallback;
}

function osmElementToLead(element, meta) {
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
  const category = mapOsmCategory(tags);
  const address = buildAddress(tags, `${meta.city}, ${meta.country}`);
  const lat = element.lat || element.center?.lat || "";
  const lon = element.lon || element.center?.lon || "";

  return {
    id: `osm-${element.type}-${element.id}`,
    osmId: `${element.type}/${element.id}`,
    name,
    category,
    phone,
    email,
    website,
    country: meta.country,
    city: meta.city,
    location: `${meta.city}, ${meta.country}`,
    address,
    contactPerson: "",
    notes: `Real public OpenStreetMap lead. OSM ID: ${element.type}/${element.id}.`,
    status: phone ? "Ready to WhatsApp" : "Needs Phone",
    priority: category.includes("IT") || category.includes("Company") || category.includes("School") ? "High" : "Medium",
    source: "OpenStreetMap / Overpass",
    lat,
    lon,
    lastMessage: "",
    whatsappUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function dedupeLeads(existing, incoming) {
  const seen = new Set(
    existing.map((lead) => {
      if (lead.osmId) return `osm:${lead.osmId}`;
      return `${lead.name}-${lead.address}-${lead.city}-${lead.country}`.toLowerCase().trim();
    })
  );

  const unique = [];

  for (const lead of incoming) {
    const key = lead.osmId
      ? `osm:${lead.osmId}`
      : `${lead.name}-${lead.address}-${lead.city}-${lead.country}`.toLowerCase().trim();

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(lead);
    }
  }

  return unique;
}

function categoryToOverpass(category) {
  const c = String(category || "business").toLowerCase();

  if (c.includes("restaurant")) return `node["amenity"~"restaurant|fast_food|cafe"]`;
  if (c.includes("cafe")) return `node["amenity"~"cafe|restaurant|fast_food"]`;
  if (c.includes("bank")) return `node["amenity"~"bank|atm"]`;
  if (c.includes("school")) return `node["amenity"~"school|college|university"]`;
  if (c.includes("clinic")) return `node["amenity"~"clinic|hospital|doctors|pharmacy"]`;
  if (c.includes("hotel")) return `node["tourism"~"hotel|guest_house|hostel|motel"]`;
  if (c.includes("real")) return `node["office"="estate_agent"]`;
  if (c.includes("travel")) return `node["office"="travel_agent"]`;
  if (c.includes("software") || c.includes("it")) return `node["office"~"it|company"]`;
  if (c.includes("office") || c.includes("company")) return `node["office"]`;
  if (c.includes("shop") || c.includes("store")) return `node["shop"]`;

  return `
node["amenity"~"restaurant|cafe|fast_food|bank|atm|school|college|university|clinic|hospital|doctors|pharmacy|fuel|marketplace"]
node["shop"]
node["office"]
node["tourism"~"hotel|guest_house|hostel|motel"]
`;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 90000) {
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

async function geocodeLocation(city, country) {
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

  const response = await fetchJsonWithTimeout(
    url,
    {
      headers: {
        "User-Agent": "NexaReachGlobalAI/2.0 local outreach CRM"
      }
    },
    45000
  );

  if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);

  const data = await response.json();

  if (!data.length || !data[0].boundingbox) {
    throw new Error("City/country not found. Try another spelling.");
  }

  const [south, north, west, east] = data[0].boundingbox.map(Number);

  return {
    displayName: data[0].display_name,
    south,
    north,
    west,
    east
  };
}

function buildOverpassQueryFromBBox(bbox, category) {
  const selector = categoryToOverpass(category);
  const box = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;

  const selectorLines = selector
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

async function fetchGlobalBusinesses({ city, country, category }) {
  const bbox = await geocodeLocation(city, country);
  const query = buildOverpassQueryFromBBox(bbox, category);

  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchJsonWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "NexaReachGlobalAI/2.0"
          },
          body: new URLSearchParams({ data: query })
        },
        90000
      );

      if (!response.ok) throw new Error(`Overpass failed: ${response.status}`);

      const data = await response.json();

      return {
        bbox,
        elements: data.elements || []
      };
    } catch (error) {
      lastError = error;
      console.log(`Overpass failed: ${endpoint}`, error.message);
    }
  }

  throw lastError || new Error("All Overpass endpoints failed.");
}

function buildFallbackMessage(profile, lead, goal = "business") {
  const name = profile.fullName || "Shahzaib Ali";
  const portfolio = profile.portfolio || "[Portfolio Link]";
  const linkedin = profile.linkedin || "[LinkedIn Link]";
  const resume = profile.resumeUrl || "[Resume Link]";
  const skills = profile.skills || "AI apps, websites, dashboards, automation";

  if (goal === "job") {
    return `Dear ${lead.contactPerson || "Hiring Team"},

My name is ${name}. I am an Information Technology graduate and I build AI-powered software, dashboards, web applications, and business automation tools.

I am looking for a suitable opportunity in software development, AI automation, frontend development, full-stack development, IT support, internship, freelance work, or project collaboration.

Skills: ${skills}

Portfolio: ${portfolio}
LinkedIn: ${linkedin}
Resume: ${resume}

Please contact me if there is any suitable opportunity.

Best regards,
${name}`;
  }

  return `Hello ${lead.contactPerson || "Team"},

My name is ${name}. I build AI-powered software, websites, dashboards, WhatsApp-style business agents, and automation tools.

I found ${lead.name} in ${lead.location || "your area"} and wanted to share my work in case your business needs a website, AI chatbot, customer support system, lead capture system, or business dashboard.

Skills: ${skills}

Portfolio: ${portfolio}
LinkedIn: ${linkedin}
Resume: ${resume}

Please contact me if you need any software or AI automation service.

Best regards,
${name}`;
}

async function generateGroqMessage(profile, lead, goal) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return buildFallbackMessage(profile, lead, goal);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
              "You are NexaReach Global AI. Write short, respectful, personalized outreach messages. Do not sound spammy. Do not make fake claims. Use simple professional English. Always include portfolio, LinkedIn and resume if available. Make it suitable for WhatsApp."
          },
          {
            role: "user",
            content: `
Profile:
Name: ${profile.fullName}
Title: ${profile.title}
Email: ${profile.email}
Portfolio: ${profile.portfolio}
LinkedIn: ${profile.linkedin}
Resume: ${profile.resumeUrl}
Skills: ${profile.skills}
Projects: ${profile.projects}

Lead:
Name: ${lead.name}
Category: ${lead.category}
Location: ${lead.location}
Website: ${lead.website}
Notes: ${lead.notes}

Goal: ${goal}
Create one message.
`
          }
        ],
        temperature: 0.55,
        max_tokens: 650
      })
    });

    const data = await response.json();

    if (!response.ok) return buildFallbackMessage(profile, lead, goal);

    return data.choices?.[0]?.message?.content || buildFallbackMessage(profile, lead, goal);
  } catch {
    return buildFallbackMessage(profile, lead, goal);
  }
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "NexaReach Global AI",
    time: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
  res.json({
    app: "NexaReach Global AI",
    status: "running",
    mode: "paginated-fast"
  });
});

app.get("/api/profile", (req, res) => {
  res.json(readJson(PROFILE_FILE));
});

app.put("/api/profile", (req, res) => {
  const current = readJson(PROFILE_FILE);
  const updated = { ...current, ...req.body };
  writeJson(PROFILE_FILE, updated);
  res.json(updated);
});

app.post("/api/upload/resume", upload.single("resume"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No resume uploaded" });

  const profile = readJson(PROFILE_FILE);
  profile.resumeUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  writeJson(PROFILE_FILE, profile);

  res.json({
    message: "Resume uploaded",
    resumeUrl: profile.resumeUrl
  });
});

app.get("/api/leads", (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 10), 100);

  const leads = readJson(LEADS_FILE);
  const filtered = filterLeads(leads, req.query);

  const total = filtered.length;
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);

  res.json({
    items,
    total,
    page: safePage,
    limit,
    totalPages,
    counts: getFilteredCounts(filtered)
  });
});

app.get("/api/leads/:id", (req, res) => {
  const leads = readJson(LEADS_FILE);
  const lead = leads.find((item) => item.id === req.params.id);

  if (!lead) return res.status(404).json({ error: "Lead not found" });

  res.json(lead);
});

app.delete("/api/leads/clear-all", (req, res) => {
  writeJson(LEADS_FILE, []);
  writeJson(LOGS_FILE, []);
  res.json({ message: "All leads and logs cleared" });
});

app.post("/api/leads/import-csv", upload.single("csv"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });

    const text = fs.readFileSync(req.file.path, "utf-8");
    const rows = parseCsv(text);

    if (!rows.length) return res.status(400).json({ error: "CSV has no business rows" });

    const existing = readJson(LEADS_FILE);
    const existingKeys = new Set(
      existing.map((lead) =>
        `${lead.osmId || ""}-${lead.name}-${lead.address}-${lead.city}-${lead.country}`.toLowerCase().trim()
      )
    );

    const prepared = rows
      .map(csvRowToLead)
      .filter((lead) => lead.name && lead.name.trim().length > 1);

    if (!prepared.length) {
      return res.status(400).json({
        error: "CSV rows found, but no valid business names detected."
      });
    }

    const unique = prepared.filter((lead) => {
      const key = `${lead.osmId || ""}-${lead.name}-${lead.address}-${lead.city}-${lead.country}`.toLowerCase().trim();

      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });

    writeJson(LEADS_FILE, [...unique, ...existing]);

    res.json({
      message: "CSV imported successfully",
      imported: unique.length,
      skippedDuplicates: prepared.length - unique.length,
      readyToWhatsApp: unique.filter((lead) => lead.phone).length,
      needsPhone: unique.filter((lead) => !lead.phone).length
    });
  } catch (error) {
    res.status(500).json({
      error: "CSV import failed",
      details: error.message
    });
  }
});

app.post("/api/import/global", async (req, res) => {
  try {
    const city = req.body.city || "Dubai";
    const country = req.body.country || "United Arab Emirates";
    const category = req.body.category || "business";

    const existing = readJson(LEADS_FILE);
    const { bbox, elements } = await fetchGlobalBusinesses({ city, country, category });

    const imported = elements
      .map((element) => osmElementToLead(element, { city, country }))
      .filter(Boolean)
      .filter((lead) => lead.name && lead.name.trim().length > 1);

    const uniqueImported = dedupeLeads(existing, imported);
    writeJson(LEADS_FILE, [...uniqueImported, ...existing]);

    res.json({
      message: "Global businesses imported",
      city,
      country,
      category,
      bbox: bbox.displayName,
      fetchedElements: elements.length,
      validBusinesses: imported.length,
      imported: uniqueImported.length,
      skippedDuplicates: imported.length - uniqueImported.length,
      readyToWhatsApp: uniqueImported.filter((lead) => lead.phone).length,
      needsPhone: uniqueImported.filter((lead) => !lead.phone).length
    });
  } catch (error) {
    res.status(500).json({
      error: "Global import failed",
      details: error.message
    });
  }
});

app.post("/api/leads", (req, res) => {
  const leads = readJson(LEADS_FILE);

  const lead = {
    id: Date.now().toString(),
    osmId: "",
    name: req.body.name || "",
    category: req.body.category || "Business",
    phone: req.body.phone || "",
    email: req.body.email || "",
    website: req.body.website || "",
    country: req.body.country || "",
    city: req.body.city || "",
    location: req.body.location || [req.body.city, req.body.country].filter(Boolean).join(", ") || "Global",
    address: req.body.address || "",
    contactPerson: req.body.contactPerson || "",
    notes: req.body.notes || "",
    status: req.body.phone ? "Ready to WhatsApp" : "Needs Phone",
    priority: req.body.priority || "Medium",
    source: "Manual Real Lead",
    lat: "",
    lon: "",
    lastMessage: "",
    whatsappUrl: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  leads.unshift(lead);
  writeJson(LEADS_FILE, leads);
  res.json(lead);
});

app.put("/api/leads/:id", (req, res) => {
  const leads = readJson(LEADS_FILE);
  const index = leads.findIndex((lead) => lead.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: "Lead not found" });

  leads[index] = {
    ...leads[index],
    ...req.body,
    status:
      req.body.status ||
      (req.body.phone || leads[index].phone ? "Ready to WhatsApp" : "Needs Phone"),
    updatedAt: new Date().toISOString()
  };

  if (leads[index].lastMessage && leads[index].phone) {
    leads[index].whatsappUrl = createWhatsAppUrl(leads[index].phone, leads[index].lastMessage);
  }

  writeJson(LEADS_FILE, leads);
  res.json(leads[index]);
});

app.delete("/api/leads/:id", (req, res) => {
  const leads = readJson(LEADS_FILE);
  writeJson(
    LEADS_FILE,
    leads.filter((lead) => lead.id !== req.params.id)
  );
  res.json({ message: "Lead deleted" });
});

app.post("/api/leads/:id/generate-message", async (req, res) => {
  const leads = readJson(LEADS_FILE);
  const profile = readJson(PROFILE_FILE);
  const index = leads.findIndex((lead) => lead.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: "Lead not found" });

  const goal = req.body.goal || "business";
  const lead = leads[index];
  const message = await generateGroqMessage(profile, lead, goal);
  const whatsappUrl = createWhatsAppUrl(lead.phone, message);

  leads[index] = {
    ...lead,
    lastMessage: message,
    whatsappUrl,
    status: lead.phone ? "Message Generated" : "Generated - Needs Phone",
    updatedAt: new Date().toISOString()
  };

  writeJson(LEADS_FILE, leads);
  res.json(leads[index]);
});

app.post("/api/leads/:id/mark-sent", (req, res) => {
  const leads = readJson(LEADS_FILE);
  const logs = readJson(LOGS_FILE);
  const index = leads.findIndex((lead) => lead.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: "Lead not found" });

  leads[index] = {
    ...leads[index],
    status: "Sent",
    updatedAt: new Date().toISOString()
  };

  logs.unshift({
    id: Date.now().toString(),
    leadId: leads[index].id,
    leadName: leads[index].name,
    action: "Message Sent",
    channel: req.body.channel || "WhatsApp",
    location: leads[index].location,
    createdAt: new Date().toISOString()
  });

  writeJson(LEADS_FILE, leads);
  writeJson(LOGS_FILE, logs);

  res.json(leads[index]);
});

app.post("/api/search-links", (req, res) => {
  const city = req.body.city || "";
  const country = req.body.country || "";
  const category = req.body.category || "businesses";
  const query = encodeURIComponent(`${category} in ${city} ${country}`.trim());

  res.json({
    maps: `https://www.google.com/maps/search/${query}`,
    google: `https://www.google.com/search?q=${query}`,
    facebook: `https://www.facebook.com/search/pages/?q=${query}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${query}`
  });
});

app.get("/api/logs", (req, res) => {
  const logs = readJson(LOGS_FILE);
  res.json(logs.slice(0, 100));
});

app.get("/api/analytics", (req, res) => {
  const leads = readJson(LEADS_FILE);
  const filtered = filterLeads(leads, req.query);
  const countries = [...new Set(leads.map((lead) => lead.country).filter(Boolean))];
  const cities = [...new Set(leads.map((lead) => lead.city).filter(Boolean))];

  res.json({
    ...getFilteredCounts(filtered),
    allLeads: leads.length,
    countries: countries.length,
    cities: cities.length,
    highPriority: filtered.filter((lead) => lead.priority === "High").length
  });
});
app.get('/api/health', async (req, res) => {
  try {
    res.json({
      status: 'ok',
      app: 'NexaReach AI',
      backend: 'online',
      database: 'connected',
      platform: 'Render',
      time: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      app: 'NexaReach AI',
      backend: 'online',
      database: 'error',
      error: error.message,
      time: new Date().toISOString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`NexaReach Global AI backend running on http://localhost:${PORT}`);
  console.log("Mode: fast paginated loading enabled");
});
