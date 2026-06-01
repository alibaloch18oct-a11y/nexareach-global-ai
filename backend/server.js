import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const useSupabase = Boolean(supabaseUrl && supabaseKey);
const supabase = useSupabase ? createClient(supabaseUrl, supabaseKey) : null;

const defaultProfile = {
  id: "default",
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
  projects:
    "NexaPOS Pro, ShopVision AI, NexaAgent AI, RealityDesk AI, Portfolio Website, School Management System, FBR AI Assistant",
  bio: "I build AI-powered software, business automation tools, dashboards, and modern web applications."
};

const productCatalog = [
  {
    name: "NexaPOS Pro",
    categories: ["restaurant", "cafe", "fast food", "hotel", "food"],
    pitch:
      "Restaurant POS with billing, orders, KDS, staff, inventory, table management and reports."
  },
  {
    name: "ShopVision AI",
    categories: ["shop", "store", "retail", "mobile", "electronics", "clothing", "supermarket"],
    pitch:
      "AI product content, customer management, product posts, captions, SEO and shop growth tools."
  },
  {
    name: "RepairVision AI",
    categories: ["repair", "mobile repair", "electronics repair", "service center"],
    pitch:
      "Repair ticketing, customer updates, inventory, technician tracking and service reports."
  },
  {
    name: "NexaAgent AI",
    categories: ["business", "company", "agency", "support", "customer service"],
    pitch:
      "AI customer support and WhatsApp-style business agent for answering customers and capturing leads."
  },
  {
    name: "AutoProposal AI",
    categories: ["agency", "freelancer", "consulting", "software", "company"],
    pitch:
      "AI proposal and quotation generator for businesses and service providers."
  },
  {
    name: "Portfolio/Business Website",
    categories: ["all", "business", "shop", "clinic", "restaurant", "real estate", "school", "company"],
    pitch:
      "Professional business website with portfolio, services, lead forms and SEO-ready pages."
  },
  {
    name: "School Management System / EduOffice AI",
    categories: ["school", "academy", "college", "university", "education"],
    pitch:
      "Student records, fees, attendance, results, staff, reports and AI office assistant."
  },
  {
    name: "ClinicDesk AI",
    categories: ["clinic", "doctor", "hospital", "medical", "pharmacy"],
    pitch:
      "Clinic records, appointments, patient management, billing and AI support."
  },
  {
    name: "SalonBoss AI",
    categories: ["salon", "spa", "beauty", "barber"],
    pitch:
      "Appointments, customer records, packages, staff scheduling and marketing messages."
  },
  {
    name: "RentGuard AI",
    categories: ["real estate", "property", "estate agent", "rent", "dealer"],
    pitch:
      "Property leads, rent reminders, client management, listings and follow-ups."
  },
  {
    name: "Shazee AI FBR / Office Assistant",
    categories: ["office", "tax", "lawyer", "accountant", "finance", "consultant"],
    pitch:
      "AI office assistant for documents, reports, FBR/tax workflows and admin automation."
  },
  {
    name: "RealityDesk AI",
    categories: ["computer", "office", "education", "support", "training"],
    pitch:
      "Desktop AI assistant that helps users understand screen tasks and workflow guidance."
  },
  {
    name: "Custom AI Business Automation",
    categories: ["all"],
    pitch:
      "Custom dashboards, CRMs, automation, AI agents and business software built for specific needs."
  }
];

const discoveryCategories = [
  "business",
  "software houses",
  "IT companies",
  "company offices",
  "restaurants",
  "cafes",
  "banks",
  "schools",
  "clinics",
  "hospitals",
  "pharmacies",
  "hotels",
  "shops",
  "mobile shops",
  "electronics shops",
  "real estate agencies",
  "travel agencies",
  "salons",
  "repair shops",
  "law offices",
  "accounting offices",
  "fuel stations",
  "gyms"
];

function ensureFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

ensureFile(PROFILE_FILE, defaultProfile);
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

app.use(express.json({ limit: "40mb" }));
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

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
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

  const nonEmptyRows = rows.filter((r) =>
    r.some((cell) => String(cell || "").trim() !== "")
  );
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

function csvValue(row, keys) {
  for (const key of keys) {
    const k = normalizeHeader(key);
    if (row[k]) return row[k];
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

function toDbLead(lead) {
  return {
    id: lead.id,
    business_name: lead.businessName || lead.business_name || lead.name || "",
    contact_person: lead.contactPerson || lead.contact_person || "",
    phone: lead.phone || "",
    whatsapp: lead.whatsapp || lead.phone || "",
    email: lead.email || "",
    website: lead.website || "",
    instagram: lead.instagram || "",
    facebook: lead.facebook || "",
    linkedin: lead.linkedin || "",
    country: lead.country || "",
    city: lead.city || "",
    category: lead.category || "Business",
    business_size: lead.businessSize || lead.business_size || "",
    source: lead.source || "Manual",
    notes: lead.notes || "",
    status: lead.status || "New",
    lead_score: Number(lead.leadScore ?? lead.lead_score ?? 0),
    lead_temperature: lead.leadTemperature || lead.lead_temperature || "Cold",
    recommended_product: lead.recommendedProduct || lead.recommended_product || "",
    ai_reason: lead.aiReason || lead.ai_reason || "",
    ai_problem: lead.aiProblem || lead.ai_problem || "",
    ai_outreach_angle: lead.aiOutreachAngle || lead.ai_outreach_angle || "",
    last_message: lead.lastMessage || lead.last_message || "",
    last_message_mode: lead.lastMessageMode || lead.last_message_mode || "",
    last_contacted_at: lead.lastContactedAt || lead.last_contacted_at || null,
    next_follow_up_at: lead.nextFollowUpAt || lead.next_follow_up_at || null,
    conversation_notes: lead.conversationNotes || lead.conversation_notes || "",
    customer_reply: lead.customerReply || lead.customer_reply || "",
    reply_analysis: lead.replyAnalysis || lead.reply_analysis || "",
    next_action: lead.nextAction || lead.next_action || "",
    estimated_deal_value: Number(lead.estimatedDealValue ?? lead.estimated_deal_value ?? 0),
    created_at: lead.createdAt || lead.created_at || nowIso(),
    updated_at: nowIso()
  };
}

function fromDbLead(row) {
  return {
    id: row.id,
    businessName: row.business_name || "",
    name: row.business_name || "",
    contactPerson: row.contact_person || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || "",
    website: row.website || "",
    instagram: row.instagram || "",
    facebook: row.facebook || "",
    linkedin: row.linkedin || "",
    country: row.country || "",
    city: row.city || "",
    location: [row.city, row.country].filter(Boolean).join(", "),
    address: row.notes || "",
    category: row.category || "Business",
    businessSize: row.business_size || "",
    source: row.source || "",
    notes: row.notes || "",
    status: row.status || "New",
    leadScore: row.lead_score || 0,
    leadTemperature: row.lead_temperature || "Cold",
    recommendedProduct: row.recommended_product || "",
    aiReason: row.ai_reason || "",
    aiProblem: row.ai_problem || "",
    aiOutreachAngle: row.ai_outreach_angle || "",
    lastMessage: row.last_message || "",
    lastMessageMode: row.last_message_mode || "",
    lastContactedAt: row.last_contacted_at || "",
    nextFollowUpAt: row.next_follow_up_at || "",
    conversationNotes: row.conversation_notes || "",
    customerReply: row.customer_reply || "",
    replyAnalysis: row.reply_analysis || "",
    nextAction: row.next_action || "",
    estimatedDealValue: Number(row.estimated_deal_value || 0),
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

function toDbProfile(profile) {
  return {
    id: "default",
    full_name: profile.fullName || profile.full_name || "",
    title: profile.title || "",
    email: profile.email || "",
    phone: profile.phone || "",
    whatsapp: profile.whatsapp || "",
    location: profile.location || "",
    portfolio: profile.portfolio || "",
    linkedin: profile.linkedin || "",
    github: profile.github || "",
    resume_url: profile.resumeUrl || profile.resume_url || "",
    skills: profile.skills || "",
    projects: profile.projects || "",
    bio: profile.bio || "",
    updated_at: nowIso()
  };
}

function fromDbProfile(row) {
  if (!row) return defaultProfile;
  return {
    id: "default",
    fullName: row.full_name || "",
    title: row.title || "",
    email: row.email || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    location: row.location || "",
    portfolio: row.portfolio || "",
    linkedin: row.linkedin || "",
    github: row.github || "",
    resumeUrl: row.resume_url || "",
    skills: row.skills || "",
    projects: row.projects || "",
    bio: row.bio || ""
  };
}

function csvRowToLead(row) {
  const businessName = csvValue(row, [
    "business name",
    "business_name",
    "name",
    "company",
    "company name",
    "title",
    "place",
    "place name"
  ]);

  const contactPerson = csvValue(row, ["owner", "contact person", "contact_person", "person"]);
  const phone = csvValue(row, ["phone", "mobile", "telephone", "contact phone"]);
  const whatsapp = csvValue(row, ["whatsapp", "whatsapp number", "whatsapp_number"]) || phone;
  const country = csvValue(row, ["country"]);
  const city = csvValue(row, ["city"]);
  const category = csvValue(row, ["category", "business category", "type", "business type"]);

  return {
    id: csvValue(row, ["id"]) || id("lead"),
    businessName,
    contactPerson,
    phone,
    whatsapp,
    email: csvValue(row, ["email", "mail"]),
    website: csvValue(row, ["website", "url", "web"]),
    instagram: csvValue(row, ["instagram"]),
    facebook: csvValue(row, ["facebook"]),
    linkedin: csvValue(row, ["linkedin"]),
    country,
    city,
    category: category || "Business",
    businessSize: csvValue(row, ["business size", "size"]),
    source: csvValue(row, ["source"]) || "CSV Import",
    notes: csvValue(row, ["notes", "note", "address"]) || "",
    status: csvValue(row, ["status"]) || "New",
    leadScore: Number(csvValue(row, ["lead score", "score"]) || 0),
    recommendedProduct: csvValue(row, ["recommended product", "product"]),
    estimatedDealValue: Number(csvValue(row, ["estimated deal value", "deal value"]) || 0),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    lastMessage: "",
    conversationNotes: "",
    nextFollowUpAt: ""
  };
}

function matchProduct(lead) {
  const text = `${lead.businessName || ""} ${lead.category || ""} ${lead.notes || ""}`.toLowerCase();

  const best = productCatalog.find((product) =>
    product.categories.some((cat) => cat !== "all" && text.includes(cat))
  );

  return best || productCatalog.find((product) => product.name === "Custom AI Business Automation");
}

function scoreLead(lead) {
  const text = `${lead.businessName || ""} ${lead.category || ""} ${lead.website || ""} ${lead.phone || ""} ${lead.email || ""} ${lead.notes || ""}`.toLowerCase();
  const product = matchProduct(lead);

  let score = 35;

  if (lead.phone || lead.whatsapp) score += 15;
  if (lead.email) score += 10;
  if (lead.website) score += 10;
  if (lead.country && lead.city) score += 5;
  if (lead.category) score += 10;

  const hotWords = [
    "restaurant",
    "clinic",
    "school",
    "shop",
    "mobile",
    "real estate",
    "salon",
    "software",
    "company",
    "repair",
    "hotel",
    "cafe",
    "pharmacy"
  ];

  if (hotWords.some((word) => text.includes(word))) score += 10;

  score = Math.max(0, Math.min(100, score));
  const temperature = score >= 75 ? "Hot" : score >= 55 ? "Warm" : "Cold";

  const problemMap = {
    "NexaPOS Pro":
      "They may need better billing, order tracking, inventory, staff reports and daily sales control.",
    "ShopVision AI":
      "They may need better product promotion, content, customer replies and online visibility.",
    "RepairVision AI":
      "They may need repair ticket tracking, customer updates and technician workflow control.",
    "School Management System / EduOffice AI":
      "They may need student records, attendance, fees, reports and admin automation.",
    "ClinicDesk AI":
      "They may need appointment management, patient records and billing workflow.",
    "SalonBoss AI":
      "They may need appointment scheduling, customer records and staff/package management.",
    "RentGuard AI":
      "They may need property lead tracking, follow-ups and client management.",
    "Custom AI Business Automation":
      "They may need custom automation, CRM, dashboard or AI support system."
  };

  return {
    leadScore: score,
    leadTemperature: temperature,
    recommendedProduct: product.name,
    aiReason: `${lead.businessName || "This business"} matches ${product.name} because its category and business type can benefit from ${product.pitch}`,
    aiProblem: problemMap[product.name] || "They may need smoother business operations and automation.",
    aiOutreachAngle: `Offer a quick demo of ${product.name} and explain how it can save time, organize work and improve customer handling.`
  };
}

function buildMessage({ profile, lead, mode = "short_whatsapp" }) {
  const product = lead.recommendedProduct || matchProduct(lead).name;
  const portfolio = profile.portfolio || "[Portfolio Link]";
  const linkedin = profile.linkedin || "[LinkedIn Link]";
  const resume = profile.resumeUrl || profile.resume_url || "[Resume Link]";

  const baseIntro = `Hi, I came across ${lead.businessName || "your business"} and wanted to share something that could help you manage customers, sales, operations and follow-ups more smoothly.`;

  const productLine = `I build AI-powered business software, and for your type of business I think ${product} could be useful.`;

  const proofLine = `Portfolio: ${portfolio}
LinkedIn: ${linkedin}
Resume: ${resume}`;

  if (mode === "email_pitch") {
    return `Subject: Software solution for ${lead.businessName || "your business"}

Hello ${lead.contactPerson || "Team"},

${baseIntro}

${productLine}

I can help with custom software such as POS systems, AI chatbots, lead management tools, websites, dashboards and automation systems.

${proofLine}

If you are open to it, I can share a quick demo or explain how this can help your business.

Best regards,
${profile.fullName || "Shahzaib Ali"}`;
  }

  if (mode === "international_formal") {
    return `Hello ${lead.contactPerson || "Team"}, I came across ${lead.businessName || "your business"} and wanted to introduce myself. I build professional AI-powered business software including POS systems, CRM tools, websites, dashboards and automation systems.

For your business, ${product} may help improve operations, customer handling and daily management.

${proofLine}

If you are open to it, I can share a short demo.`;
  }

  if (mode === "pakistani_friendly") {
    return `Assalamualaikum, I came across ${lead.businessName || "your business"}. I build websites, POS systems, AI chatbots, dashboards and business automation software.

Aap ke business ke liye ${product} useful ho sakta hai because it can help manage customers, sales, orders and follow-ups.

${proofLine}

Agar aap interested hon to main quick demo share kar sakta hoon.`;
  }

  if (mode === "follow_up") {
    return `Hi, just following up on my previous message. I wanted to check if you would be open to seeing a quick demo of ${product}. It may help ${lead.businessName || "your business"} manage customers, sales and operations more smoothly.

${proofLine}`;
  }

  if (mode === "final_reminder") {
    return `Hi, this is my final follow-up. I build AI-powered business software and thought ${product} could be useful for ${lead.businessName || "your business"}. If now is not the right time, no problem at all. Wishing you success.

${proofLine}`;
  }

  if (mode === "call_script") {
    return `Call Script:
Hello, am I speaking with ${lead.contactPerson || "the owner/manager"} of ${lead.businessName || "the business"}?

My name is ${profile.fullName || "Shahzaib Ali"}. I build business software and AI automation tools. I wanted to ask if you currently use any system to manage customers, sales, orders, staff or follow-ups.

For your business, I believe ${product} could help. Would you be open to a quick demo?

Portfolio: ${portfolio}
LinkedIn: ${linkedin}
Resume: ${resume}`;
  }

  return `${baseIntro}

${productLine}

I build custom AI-powered business software such as POS systems, customer support agents, lead management tools, websites and automation dashboards.

${proofLine}

If you are open to it, I can share a quick demo.`;
}

function analyzeReplyText(reply) {
  const text = String(reply || "").toLowerCase();

  let interestLevel = "Cold";
  let updatedStatus = "Follow Up";
  let nextAction = "Send a polite follow-up later.";
  let bestReply =
    "Thank you for your reply. I can share a quick demo and explain how it can help your business.";

  if (text.includes("price") || text.includes("cost") || text.includes("charges")) {
    interestLevel = "Warm";
    updatedStatus = "Interested";
    nextAction = "Send price range and demo offer.";
    bestReply =
      "Thanks for asking. The price depends on features, but I can first show you a quick demo and then suggest a suitable package for your business.";
  }

  if (text.includes("demo") || text.includes("show") || text.includes("interested")) {
    interestLevel = "Hot";
    updatedStatus = "Demo Booked";
    nextAction = "Send demo link or schedule a call.";
    bestReply =
      "Great. I can share a quick demo. Please tell me what time is suitable for you, or I can send a short overview first.";
  }

  if (text.includes("not interested") || text.includes("no need") || text.includes("don't need")) {
    interestLevel = "Cold";
    updatedStatus = "Not Interested";
    nextAction = "Do not follow up soon.";
    bestReply =
      "No problem. Thank you for your time. If you need any software or automation in the future, feel free to contact me.";
  }

  if (text.includes("later") || text.includes("busy") || text.includes("after")) {
    interestLevel = "Warm";
    updatedStatus = "Follow Up";
    nextAction = "Follow up after 3 days.";
    bestReply = "No problem. I will follow up later. Thank you for your time.";
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + (updatedStatus === "Demo Booked" ? 1 : 3));

  return {
    interestLevel,
    updatedStatus,
    nextAction,
    bestReply,
    nextFollowUpAt: nextDate.toISOString(),
    analysis: `Customer reply indicates ${interestLevel} interest. Suggested status: ${updatedStatus}. Next action: ${nextAction}`
  };
}

async function getProfile() {
  if (useSupabase) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", "default").single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) {
      await supabase.from("profiles").upsert(toDbProfile(defaultProfile));
      return defaultProfile;
    }
    return fromDbProfile(data);
  }

  return readJson(PROFILE_FILE);
}

async function saveProfile(profile) {
  if (useSupabase) {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(toDbProfile(profile))
      .select("*")
      .single();

    if (error) throw error;
    return fromDbProfile(data);
  }

  const updated = { ...readJson(PROFILE_FILE), ...profile };
  writeJson(PROFILE_FILE, updated);
  return updated;
}

function countLocal(leads) {
  return {
    total: leads.length,
    readyToWhatsApp: leads.filter((lead) => lead.phone || lead.whatsapp).length,
    needsPhone: leads.filter((lead) => !lead.phone && !lead.whatsapp).length,
    hot: leads.filter((lead) => lead.leadTemperature === "Hot" || Number(lead.leadScore || 0) >= 75).length,
    interested: leads.filter((lead) => lead.status === "Interested").length,
    demoBooked: leads.filter((lead) => lead.status === "Demo Booked").length,
    closedWon: leads.filter((lead) => lead.status === "Closed Won").length,
    estimatedRevenue: leads.reduce((sum, lead) => sum + Number(lead.estimatedDealValue || 0), 0)
  };
}

async function dashboardCounts(filter = {}) {
  if (!useSupabase) return countLocal(readJson(LEADS_FILE));

  let db = supabase.from("leads").select("*");

  if (filter.country && filter.country !== "All Countries") db = db.eq("country", filter.country);
  if (filter.city && filter.city !== "All Cities") db = db.eq("city", filter.city);

  const { data, error } = await db;
  if (error) throw error;

  return countLocal((data || []).map(fromDbLead));
}

async function listLeads(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "50", 10), 10), 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const country = query.country || "All Countries";
  const city = query.city || "All Cities";
  const status = query.status || "All";
  const q = String(query.q || "").trim();

  if (useSupabase) {
    let db = supabase
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (country && country !== "All Countries") db = db.eq("country", country);
    if (city && city !== "All Cities") db = db.eq("city", city);

    if (status && status !== "All") {
      if (status === "Ready to WhatsApp") {
        db = db.not("whatsapp", "eq", "");
      } else if (status === "Needs Phone") {
        db = db.or("phone.is.null,phone.eq.,whatsapp.is.null,whatsapp.eq.");
      } else {
        db = db.eq("status", status);
      }
    }

    if (q) {
      db = db.or(
        `business_name.ilike.%${q}%,category.ilike.%${q}%,country.ilike.%${q}%,city.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    const { data, error, count } = await db.range(from, to);
    if (error) throw error;

    const items = (data || []).map(fromDbLead);
    const total = count || 0;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      counts: await dashboardCounts({ country, city })
    };
  }

  const all = readJson(LEADS_FILE).map((lead) => ({
    ...lead,
    businessName: lead.businessName || lead.name || lead.business_name || ""
  }));

  const filtered = all.filter((lead) => {
    const matchesCountry = country === "All Countries" || !country ? true : lead.country === country;
    const matchesCity = city === "All Cities" || !city ? true : lead.city === city;

    const matchesStatus =
      status === "All"
        ? true
        : status === "Ready to WhatsApp"
        ? Boolean(lead.phone || lead.whatsapp)
        : status === "Needs Phone"
        ? !lead.phone && !lead.whatsapp
        : lead.status === status;

    const haystack = `${lead.businessName} ${lead.category} ${lead.country} ${lead.city} ${lead.email} ${lead.phone}`.toLowerCase();
    const matchesSearch = q ? haystack.includes(q.toLowerCase()) : true;

    return matchesCountry && matchesCity && matchesStatus && matchesSearch;
  });

  const items = filtered.slice(from, from + limit);

  return {
    items,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(Math.ceil(filtered.length / limit), 1),
    counts: countLocal(filtered)
  };
}

async function getLead(leadId) {
  if (useSupabase) {
    const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (error) throw error;
    return fromDbLead(data);
  }

  const lead = readJson(LEADS_FILE).find((item) => item.id === leadId);
  if (!lead) throw new Error("Lead not found");
  return lead;
}

async function saveLead(lead) {
  const prepared = {
    id: lead.id || id("lead"),
    ...lead,
    updatedAt: nowIso()
  };

  if (useSupabase) {
    const { data, error } = await supabase
      .from("leads")
      .upsert(toDbLead(prepared))
      .select("*")
      .single();

    if (error) throw error;
    return fromDbLead(data);
  }

  const leads = readJson(LEADS_FILE);
  const index = leads.findIndex((item) => item.id === prepared.id);

  if (index >= 0) leads[index] = { ...leads[index], ...prepared };
  else leads.unshift(prepared);

  writeJson(LEADS_FILE, leads);
  return prepared;
}

async function deleteLeadById(leadId) {
  if (useSupabase) {
    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) throw error;
    return;
  }

  writeJson(LEADS_FILE, readJson(LEADS_FILE).filter((lead) => lead.id !== leadId));
}

async function logActivity({ leadId, leadName, action, channel = "", details = "" }) {
  const log = {
    id: id("log"),
    lead_id: leadId,
    lead_name: leadName,
    action,
    channel,
    details,
    created_at: nowIso()
  };

  if (useSupabase) {
    await supabase.from("activity_logs").insert(log);
    return;
  }

  const logs = readJson(LOGS_FILE);
  logs.unshift({
    id: log.id,
    leadId,
    leadName,
    action,
    channel,
    details,
    createdAt: log.created_at
  });
  writeJson(LOGS_FILE, logs.slice(0, 500));
}

function getTag(tags, keys) {
  for (const key of keys) {
    if (tags?.[key]) return tags[key];
  }
  return "";
}

function discoverySelector(category) {
  const c = String(category || "business").toLowerCase();

  if (c.includes("software") || c.includes("it")) return [`node["office"~"it|company"]`, `way["office"~"it|company"]`];
  if (c.includes("company") || c.includes("office")) return [`node["office"]`, `way["office"]`];
  if (c.includes("restaurant")) return [`node["amenity"~"restaurant|fast_food"]`, `way["amenity"~"restaurant|fast_food"]`];
  if (c.includes("cafe")) return [`node["amenity"="cafe"]`, `way["amenity"="cafe"]`];
  if (c.includes("bank")) return [`node["amenity"~"bank|atm"]`, `way["amenity"~"bank|atm"]`];
  if (c.includes("school")) return [`node["amenity"~"school|college|university"]`, `way["amenity"~"school|college|university"]`];
  if (c.includes("clinic")) return [`node["amenity"~"clinic|doctors"]`, `way["amenity"~"clinic|doctors"]`];
  if (c.includes("hospital")) return [`node["amenity"="hospital"]`, `way["amenity"="hospital"]`];
  if (c.includes("pharmacy")) return [`node["amenity"="pharmacy"]`, `way["amenity"="pharmacy"]`];
  if (c.includes("hotel")) return [`node["tourism"~"hotel|guest_house|hostel|motel"]`, `way["tourism"~"hotel|guest_house|hostel|motel"]`];
  if (c.includes("mobile")) return [`node["shop"~"mobile_phone|electronics"]`, `way["shop"~"mobile_phone|electronics"]`];
  if (c.includes("electronic")) return [`node["shop"="electronics"]`, `way["shop"="electronics"]`];
  if (c.includes("real")) return [`node["office"="estate_agent"]`, `way["office"="estate_agent"]`];
  if (c.includes("travel")) return [`node["office"="travel_agent"]`, `way["office"="travel_agent"]`];
  if (c.includes("salon")) return [`node["shop"~"hairdresser|beauty"]`, `way["shop"~"hairdresser|beauty"]`];
  if (c.includes("repair")) return [`node["shop"~"mobile_phone|electronics|computer"]`, `way["shop"~"mobile_phone|electronics|computer"]`];
  if (c.includes("law")) return [`node["office"="lawyer"]`, `way["office"="lawyer"]`];
  if (c.includes("account")) return [`node["office"="accountant"]`, `way["office"="accountant"]`];
  if (c.includes("fuel")) return [`node["amenity"="fuel"]`, `way["amenity"="fuel"]`];
  if (c.includes("gym")) return [`node["leisure"="fitness_centre"]`, `way["leisure"="fitness_centre"]`];
  if (c.includes("shop")) return [`node["shop"]`, `way["shop"]`];

  return [
    `node["amenity"~"restaurant|cafe|fast_food|bank|school|college|university|clinic|hospital|doctors|pharmacy|fuel"]`,
    `way["amenity"~"restaurant|cafe|fast_food|bank|school|college|university|clinic|hospital|doctors|pharmacy|fuel"]`,
    `node["shop"]`,
    `way["shop"]`,
    `node["office"]`,
    `way["office"]`,
    `node["tourism"~"hotel|guest_house|hostel|motel"]`,
    `way["tourism"~"hotel|guest_house|hostel|motel"]`
  ];
}

function mapOsmCategory(tags = {}) {
  if (tags.shop) return `Shop - ${tags.shop}`;
  if (tags.office) return `Office - ${tags.office}`;
  if (tags.amenity) return `Amenity - ${tags.amenity}`;
  if (tags.tourism) return `Tourism - ${tags.tourism}`;
  if (tags.leisure) return `Leisure - ${tags.leisure}`;
  return "Business";
}

function buildAddress(tags = {}, fallback = "") {
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

async function geocodeCity(city, country) {
  const query = encodeURIComponent(`${city}, ${country}`);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        "User-Agent": "NexaReachAIPro/2.0 safe public lead discovery"
      }
    },
    45000
  );

  if (!response.ok) throw new Error(`Location lookup failed: ${response.status}`);

  const data = await response.json();

  if (!data.length || !data[0].boundingbox) {
    throw new Error("City/country not found. Try a clearer city and country name.");
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

function buildOverpassQuery({ bbox, category, limit = 100 }) {
  const box = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  const selectors = discoverySelector(category);

  const lines = selectors.map((selector) => `${selector}${box};`).join("\n  ");

  return `
[out:json][timeout:90];
(
  ${lines}
);
out center tags ${limit};
`;
}

async function fetchOsmLeads({ country, city, category, limit = 100 }) {
  const bbox = await geocodeCity(city, country);
  const query = buildOverpassQuery({ bbox, category, limit });

  const endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
            "User-Agent": "NexaReachAIPro/2.0"
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
      console.log(`Overpass endpoint failed: ${endpoint}`, error.message);
    }
  }

  throw lastError || new Error("All public discovery endpoints failed.");
}

function osmElementToLead(element, meta) {
  const tags = element.tags || {};
  const businessName = tags.name || tags["name:en"] || tags.brand || tags.operator || "";

  if (!businessName) return null;

  const phone = getTag(tags, ["phone", "contact:phone", "mobile", "contact:mobile"]);
  const whatsapp = getTag(tags, ["whatsapp", "contact:whatsapp"]) || phone;
  const email = getTag(tags, ["email", "contact:email"]);
  const website = getTag(tags, ["website", "contact:website", "url"]);
  const facebook = getTag(tags, ["contact:facebook", "facebook"]);
  const instagram = getTag(tags, ["contact:instagram", "instagram"]);
  const linkedin = getTag(tags, ["contact:linkedin", "linkedin"]);

  const lat = element.lat || element.center?.lat || "";
  const lon = element.lon || element.center?.lon || "";
  const osmId = `${element.type}/${element.id}`;
  const category = mapOsmCategory(tags);
  const notes = buildAddress(tags, `${meta.city}, ${meta.country}`);

  const lead = {
    id: `osm-${element.type}-${element.id}`,
    businessName,
    contactPerson: "",
    phone,
    whatsapp,
    email,
    website,
    instagram,
    facebook,
    linkedin,
    country: meta.country,
    city: meta.city,
    category,
    businessSize: "",
    source: "OpenStreetMap / Overpass",
    notes,
    status: "New",
    estimatedDealValue: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    osmId,
    lat,
    lon
  };

  return {
    ...lead,
    ...scoreLead(lead),
    enrichmentLinks: buildEnrichmentLinks(lead)
  };
}

function buildEnrichmentLinks(lead) {
  const q = encodeURIComponent(
    `${lead.businessName || ""} ${lead.city || ""} ${lead.country || ""}`.trim()
  );

  return {
    google: `https://www.google.com/search?q=${q}`,
    maps: `https://www.google.com/maps/search/${q}`,
    facebook: `https://www.facebook.com/search/pages/?q=${q}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${q}`,
    instagram: `https://www.instagram.com/explore/search/keyword/?q=${q}`
  };
}

async function leadExists(lead) {
  const name = String(lead.businessName || "").toLowerCase().trim();

  if (!name) return true;

  if (useSupabase) {
    const { data, error } = await supabase
      .from("leads")
      .select("id")
      .ilike("business_name", lead.businessName)
      .eq("country", lead.country || "")
      .eq("city", lead.city || "")
      .limit(1);

    if (error) throw error;
    return Boolean(data && data.length);
  }

  const existing = readJson(LEADS_FILE);

  return existing.some((item) => {
    const itemName = String(item.businessName || item.name || "").toLowerCase().trim();
    return itemName === name && item.country === lead.country && item.city === lead.city;
  });
}

app.get("/", (req, res) => {
  res.json({
    app: "NexaReach AI Pro — Global AutoClient Hunter",
    status: "running",
    phase: "2-safe-public-discovery",
    database: useSupabase ? "supabase" : "local-json"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "NexaReach AI Pro",
    phase: "2",
    database: useSupabase ? "supabase" : "local-json",
    time: nowIso()
  });
});

app.get("/api/products", (req, res) => {
  res.json(productCatalog);
});

app.get("/api/discovery/categories", (req, res) => {
  res.json(discoveryCategories);
});

app.post("/api/discovery/search", async (req, res) => {
  try {
    const country = req.body.country || "";
    const city = req.body.city || "";
    const category = req.body.category || "business";
    const limit = Math.min(Math.max(Number(req.body.limit || 100), 10), 250);

    if (!country || !city) {
      return res.status(400).json({ error: "Country and city are required." });
    }

    const { bbox, elements } = await fetchOsmLeads({ country, city, category, limit });

    const leads = elements
      .map((element) => osmElementToLead(element, { country, city }))
      .filter(Boolean)
      .filter((lead) => lead.businessName && lead.businessName.length > 1);

    const seen = new Set();
    const unique = leads.filter((lead) => {
      const key = `${lead.businessName}-${lead.city}-${lead.country}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json({
      message: "Discovery completed",
      country,
      city,
      category,
      location: bbox.displayName,
      fetched: elements.length,
      found: unique.length,
      leads: unique
    });
  } catch (error) {
    res.status(500).json({
      error: "Discovery search failed",
      details: error.message
    });
  }
});

app.post("/api/discovery/import", async (req, res) => {
  try {
    const leads = Array.isArray(req.body.leads) ? req.body.leads : [];

    if (!leads.length) {
      return res.status(400).json({ error: "No leads provided to import." });
    }

    let imported = 0;
    let skippedDuplicates = 0;

    for (const raw of leads) {
      const scored = {
        ...raw,
        id: raw.id || id("lead"),
        ...scoreLead(raw),
        status: raw.status || "New",
        source: raw.source || "Public Discovery",
        createdAt: raw.createdAt || nowIso(),
        updatedAt: nowIso()
      };

      const exists = await leadExists(scored);
      if (exists) {
        skippedDuplicates++;
        continue;
      }

      await saveLead(scored);
      imported++;
    }

    await logActivity({
      leadId: "",
      leadName: "Discovery Import",
      action: "Public Leads Imported",
      details: `Imported ${imported}, skipped ${skippedDuplicates}`
    });

    res.json({
      message: "Discovery leads imported",
      imported,
      skippedDuplicates
    });
  } catch (error) {
    res.status(500).json({
      error: "Discovery import failed",
      details: error.message
    });
  }
});

app.post("/api/discovery/campaign", async (req, res) => {
  try {
    const country = req.body.country || "";
    const city = req.body.city || "";
    const categories = Array.isArray(req.body.categories) && req.body.categories.length
      ? req.body.categories
      : ["restaurants", "shops", "clinics", "schools"];

    if (!country || !city) {
      return res.status(400).json({ error: "Country and city are required." });
    }

    const report = [];

    for (const category of categories.slice(0, 8)) {
      try {
        const { elements } = await fetchOsmLeads({ country, city, category, limit: 80 });

        const found = elements
          .map((element) => osmElementToLead(element, { country, city }))
          .filter(Boolean)
          .filter((lead) => lead.businessName && lead.businessName.length > 1);

        let imported = 0;
        let skippedDuplicates = 0;

        for (const lead of found) {
          const exists = await leadExists(lead);
          if (exists) {
            skippedDuplicates++;
            continue;
          }

          await saveLead(lead);
          imported++;
        }

        report.push({
          category,
          found: found.length,
          imported,
          skippedDuplicates
        });
      } catch (error) {
        report.push({
          category,
          found: 0,
          imported: 0,
          skippedDuplicates: 0,
          error: error.message
        });
      }
    }

    res.json({
      message: "Campaign discovery completed",
      country,
      city,
      report
    });
  } catch (error) {
    res.status(500).json({
      error: "Campaign discovery failed",
      details: error.message
    });
  }
});

app.get("/api/profile", async (req, res) => {
  try {
    res.json(await getProfile());
  } catch (error) {
    res.status(500).json({ error: "Could not load profile", details: error.message });
  }
});

app.put("/api/profile", async (req, res) => {
  try {
    res.json(await saveProfile(req.body));
  } catch (error) {
    res.status(500).json({ error: "Could not save profile", details: error.message });
  }
});

app.post("/api/upload/resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No resume uploaded" });

    const profile = await getProfile();
    const resumeUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const updated = await saveProfile({ ...profile, resumeUrl });

    res.json({ message: "Resume uploaded", resumeUrl: updated.resumeUrl });
  } catch (error) {
    res.status(500).json({ error: "Resume upload failed", details: error.message });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    res.json(await listLeads(req.query));
  } catch (error) {
    res.status(500).json({ error: "Could not load leads", details: error.message });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const scored = scoreLead(req.body);
    const lead = await saveLead({
      ...req.body,
      id: req.body.id || id("lead"),
      ...scored,
      status: req.body.status || "New",
      createdAt: nowIso()
    });

    await logActivity({
      leadId: lead.id,
      leadName: lead.businessName,
      action: "Lead Created"
    });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: "Could not create lead", details: error.message });
  }
});

app.put("/api/leads/:id", async (req, res) => {
  try {
    const current = await getLead(req.params.id);
    const updated = await saveLead({ ...current, ...req.body, id: req.params.id });

    await logActivity({
      leadId: updated.id,
      leadName: updated.businessName,
      action: "Lead Updated"
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Could not update lead", details: error.message });
  }
});

app.delete("/api/leads/:id", async (req, res) => {
  try {
    await deleteLeadById(req.params.id);
    res.json({ message: "Lead deleted" });
  } catch (error) {
    res.status(500).json({ error: "Could not delete lead", details: error.message });
  }
});

app.post("/api/leads/import-csv", upload.single("csv"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No CSV file uploaded" });

    const text = fs.readFileSync(req.file.path, "utf-8");
    const rows = parseCsv(text);

    if (!rows.length) return res.status(400).json({ error: "CSV has no business rows" });

    const prepared = rows
      .map(csvRowToLead)
      .filter((lead) => lead.businessName && lead.businessName.trim().length > 1)
      .map((lead) => ({ ...lead, ...scoreLead(lead) }));

    let imported = 0;
    let skippedDuplicates = 0;

    for (const lead of prepared) {
      const exists = await leadExists(lead);

      if (exists) {
        skippedDuplicates++;
        continue;
      }

      await saveLead(lead);
      imported++;
    }

    res.json({
      message: "CSV imported successfully",
      imported,
      skippedDuplicates,
      readyToWhatsApp: prepared.filter((lead) => lead.whatsapp || lead.phone).length,
      needsPhone: prepared.filter((lead) => !lead.whatsapp && !lead.phone).length
    });
  } catch (error) {
    res.status(500).json({ error: "CSV import failed", details: error.message });
  }
});

app.post("/api/leads/bulk-status", async (req, res) => {
  try {
    const { ids = [], status } = req.body;
    if (!status) return res.status(400).json({ error: "Status required" });

    if (useSupabase) {
      const { error } = await supabase
        .from("leads")
        .update({ status, updated_at: nowIso() })
        .in("id", ids);

      if (error) throw error;
    } else {
      const leads = readJson(LEADS_FILE).map((lead) =>
        ids.includes(lead.id) ? { ...lead, status, updatedAt: nowIso() } : lead
      );
      writeJson(LEADS_FILE, leads);
    }

    res.json({ message: "Bulk status updated", count: ids.length });
  } catch (error) {
    res.status(500).json({ error: "Bulk update failed", details: error.message });
  }
});

app.post("/api/leads/:id/score", async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    const scored = scoreLead(lead);
    const updated = await saveLead({ ...lead, ...scored });

    await logActivity({
      leadId: updated.id,
      leadName: updated.businessName,
      action: "Lead Scored",
      details: `Score: ${updated.leadScore}, Product: ${updated.recommendedProduct}`
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Scoring failed", details: error.message });
  }
});

app.post("/api/leads/:id/generate-message", async (req, res) => {
  try {
    const profile = await getProfile();
    const lead = await getLead(req.params.id);
    const scored = lead.recommendedProduct ? lead : { ...lead, ...scoreLead(lead) };
    const mode = req.body.mode || "short_whatsapp";
    const message = buildMessage({ profile, lead: scored, mode });
    const url = createWhatsAppUrl(scored.whatsapp || scored.phone, message);

    const updated = await saveLead({
      ...scored,
      lastMessage: message,
      lastMessageMode: mode,
      status: scored.status === "New" ? "Message Generated" : scored.status,
      whatsappUrl: url
    });

    await logActivity({
      leadId: updated.id,
      leadName: updated.businessName,
      action: "Message Generated",
      channel: mode
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Message generation failed", details: error.message });
  }
});

app.post("/api/leads/:id/mark-sent", async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    const next = new Date();
    next.setDate(next.getDate() + 3);

    const updated = await saveLead({
      ...lead,
      status: "Sent",
      lastContactedAt: nowIso(),
      nextFollowUpAt: next.toISOString()
    });

    await logActivity({
      leadId: updated.id,
      leadName: updated.businessName,
      action: "Message Sent",
      channel: req.body.channel || "WhatsApp"
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Mark sent failed", details: error.message });
  }
});

app.post("/api/leads/:id/analyze-reply", async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    const reply = req.body.reply || "";
    const analysis = analyzeReplyText(reply);

    const updated = await saveLead({
      ...lead,
      customerReply: reply,
      replyAnalysis: analysis.analysis,
      leadTemperature: analysis.interestLevel,
      status: analysis.updatedStatus,
      nextAction: analysis.nextAction,
      nextFollowUpAt: analysis.nextFollowUpAt,
      conversationNotes: `${lead.conversationNotes || ""}\n\nCustomer reply: ${reply}\nAI Analysis: ${analysis.analysis}\nSuggested reply: ${analysis.bestReply}`.trim()
    });

    await logActivity({
      leadId: updated.id,
      leadName: updated.businessName,
      action: "Reply Analyzed",
      details: analysis.analysis
    });

    res.json({
      lead: updated,
      ...analysis
    });
  } catch (error) {
    res.status(500).json({ error: "Reply analysis failed", details: error.message });
  }
});

app.get("/api/followups", async (req, res) => {
  try {
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let all = [];

    if (useSupabase) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      all = (data || []).map(fromDbLead);
    } else {
      all = readJson(LEADS_FILE);
    }

    res.json({
      dueToday: all.filter((lead) => lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) <= end),
      hotLeads: all.filter((lead) => lead.leadTemperature === "Hot" || Number(lead.leadScore || 0) >= 75).slice(0, 100),
      noResponse: all.filter((lead) => lead.status === "Sent").slice(0, 100),
      interested: all.filter((lead) => lead.status === "Interested").slice(0, 100),
      demoBooked: all.filter((lead) => lead.status === "Demo Booked").slice(0, 100),
      closedWon: all.filter((lead) => lead.status === "Closed Won").slice(0, 100),
      lost: all.filter((lead) => lead.status === "Lost" || lead.status === "Not Interested").slice(0, 100)
    });
  } catch (error) {
    res.status(500).json({ error: "Could not load follow-ups", details: error.message });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    let all = [];

    if (useSupabase) {
      const { data, error } = await supabase.from("leads").select("*");
      if (error) throw error;
      all = (data || []).map(fromDbLead);
    } else {
      all = readJson(LEADS_FILE);
    }

    const byCountry = {};
    const byCategory = {};

    for (const lead of all) {
      const country = lead.country || "Unknown";
      const category = lead.category || "Unknown";
      byCountry[country] = (byCountry[country] || 0) + 1;
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    const counts = countLocal(all);

    res.json({
      ...counts,
      byCountry,
      byCategory,
      mission: `Today focus on ${counts.hot} hot leads, follow up interested clients, and generate demos for warm businesses. Estimated pipeline value: ${counts.estimatedRevenue}.`
    });
  } catch (error) {
    res.status(500).json({ error: "Dashboard failed", details: error.message });
  }
});

app.get("/api/logs", async (req, res) => {
  try {
    if (useSupabase) {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      res.json(data || []);
      return;
    }

    res.json(readJson(LOGS_FILE).slice(0, 100));
  } catch (error) {
    res.status(500).json({ error: "Logs failed", details: error.message });
  }
});

app.get("/api/export/leads.json", async (req, res) => {
  try {
    let all = [];

    if (useSupabase) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      all = (data || []).map(fromDbLead);
    } else {
      all = readJson(LEADS_FILE);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=nexareach-leads-backup.json");
    res.send(JSON.stringify(all, null, 2));
  } catch (error) {
    res.status(500).json({ error: "Export failed", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`NexaReach AI Pro backend running on http://localhost:${PORT}`);
  console.log(`Phase: 2 Safe Public Discovery`);
  console.log(`Database mode: ${useSupabase ? "Supabase/PostgreSQL" : "Local JSON fallback"}`);
});

