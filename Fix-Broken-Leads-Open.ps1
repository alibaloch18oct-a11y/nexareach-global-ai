$ErrorActionPreference = "Stop"

Write-Host "Fixing broken/mixed lead records so every lead opens safely..." -ForegroundColor Cyan

$backend = "backend\server.js"
$frontend = "frontend\src\App.jsx"

if (!(Test-Path $backend)) { throw "backend/server.js not found" }
if (!(Test-Path $frontend)) { throw "frontend/src/App.jsx not found" }

$server = Get-Content $backend -Raw
$app = Get-Content $frontend -Raw

# ============================================================
# BACKEND: Add normalizeLeadForApp helper
# ============================================================

if ($server -notmatch "function normalizeLeadForApp") {
  $helper = @'

function normalizeLeadForApp(lead = {}) {
  const businessName =
    lead.businessName ||
    lead.business_name ||
    lead.name ||
    lead.company ||
    lead.title ||
    "Unnamed Business";

  const safeId =
    lead.id ||
    lead.osmId ||
    lead.osm_id ||
    `lead-${Buffer.from(`${businessName}-${lead.city || ""}-${lead.country || ""}`).toString("hex").slice(0, 20)}`;

  return {
    id: String(safeId),
    businessName: String(businessName || "Unnamed Business"),
    name: String(businessName || "Unnamed Business"),
    contactPerson: lead.contactPerson || lead.contact_person || "",
    phone: lead.phone || "",
    whatsapp: lead.whatsapp || lead.phone || "",
    email: lead.email || "",
    website: lead.website || "",
    instagram: lead.instagram || "",
    facebook: lead.facebook || "",
    linkedin: lead.linkedin || "",
    country: lead.country || "",
    city: lead.city || "",
    location: lead.location || [lead.city, lead.country].filter(Boolean).join(", "),
    address: lead.address || lead.notes || "",
    category: lead.category || lead.type || lead.businessType || "Business",
    businessSize: lead.businessSize || lead.business_size || "",
    source: lead.source || "Imported/Legacy",
    notes: lead.notes || lead.address || "",
    status: lead.status || "New",
    leadScore: Number(lead.leadScore ?? lead.lead_score ?? 0),
    leadTemperature: lead.leadTemperature || lead.lead_temperature || "Cold",
    recommendedProduct: lead.recommendedProduct || lead.recommended_product || "",
    aiReason: lead.aiReason || lead.ai_reason || "",
    aiProblem: lead.aiProblem || lead.ai_problem || "",
    aiOutreachAngle: lead.aiOutreachAngle || lead.ai_outreach_angle || "",
    lastMessage: lead.lastMessage || lead.last_message || "",
    lastMessageMode: lead.lastMessageMode || lead.last_message_mode || "",
    lastContactedAt: lead.lastContactedAt || lead.last_contacted_at || "",
    nextFollowUpAt: lead.nextFollowUpAt || lead.next_follow_up_at || "",
    conversationNotes: lead.conversationNotes || lead.conversation_notes || "",
    customerReply: lead.customerReply || lead.customer_reply || "",
    replyAnalysis: lead.replyAnalysis || lead.reply_analysis || "",
    nextAction: lead.nextAction || lead.next_action || "",
    estimatedDealValue: Number(lead.estimatedDealValue ?? lead.estimated_deal_value ?? 0),
    createdAt: lead.createdAt || lead.created_at || nowIso(),
    updatedAt: lead.updatedAt || lead.updated_at || nowIso()
  };
}

'@

  $server = $server -replace "function toDbLead\(lead\) \{", "$helper`nfunction toDbLead(lead) {"
}

# ============================================================
# BACKEND: Make fromDbLead normalized
# ============================================================

if ($server -match "function fromDbLead\(row\) \{") {
  $pattern = 'function fromDbLead\(row\) \{.*?\n\}'
  $replacement = @'
function fromDbLead(row) {
  return normalizeLeadForApp({
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
  });
}
'@
  $server = [regex]::Replace($server, $pattern, $replacement, "Singleline")
}

# ============================================================
# BACKEND: Normalize local JSON leads in listLeads
# ============================================================

$server = $server -replace 'const all = readJson\(LEADS_FILE\)\.map\(\(lead\) => \(\{\r?\n    \.\.\.lead,\r?\n    businessName: lead\.businessName \|\| lead\.name \|\| lead\.business_name \|\| ""\r?\n  \}\)\);', 'const all = readJson(LEADS_FILE).map((lead) => normalizeLeadForApp(lead));'

# ============================================================
# BACKEND: Normalize local JSON getLead
# ============================================================

$server = $server -replace 'return lead;\r?\n\}', 'return normalizeLeadForApp(lead);
}'

Set-Content $backend $server -Encoding UTF8

# ============================================================
# FRONTEND: Add normalizeLead helper
# ============================================================

if ($app -notmatch "function normalizeLead") {
  $frontHelper = @'

function normalizeLead(lead = {}) {
  const businessName =
    lead.businessName ||
    lead.business_name ||
    lead.name ||
    lead.company ||
    lead.title ||
    "Unnamed Business";

  return {
    id: String(lead.id || `${businessName}-${lead.city || ""}-${lead.country || ""}`),
    businessName: String(businessName),
    name: String(businessName),
    contactPerson: lead.contactPerson || lead.contact_person || "",
    phone: lead.phone || "",
    whatsapp: lead.whatsapp || lead.phone || "",
    email: lead.email || "",
    website: lead.website || "",
    instagram: lead.instagram || "",
    facebook: lead.facebook || "",
    linkedin: lead.linkedin || "",
    country: lead.country || "",
    city: lead.city || "",
    category: lead.category || lead.type || "Business",
    businessSize: lead.businessSize || lead.business_size || "",
    source: lead.source || "",
    notes: lead.notes || lead.address || "",
    status: lead.status || "New",
    leadScore: Number(lead.leadScore ?? lead.lead_score ?? 0),
    leadTemperature: lead.leadTemperature || lead.lead_temperature || "Cold",
    recommendedProduct: lead.recommendedProduct || lead.recommended_product || "",
    aiReason: lead.aiReason || lead.ai_reason || "",
    aiProblem: lead.aiProblem || lead.ai_problem || "",
    aiOutreachAngle: lead.aiOutreachAngle || lead.ai_outreach_angle || "",
    lastMessage: lead.lastMessage || lead.last_message || "",
    lastMessageMode: lead.lastMessageMode || lead.last_message_mode || "",
    lastContactedAt: lead.lastContactedAt || lead.last_contacted_at || "",
    nextFollowUpAt: lead.nextFollowUpAt || lead.next_follow_up_at || "",
    conversationNotes: lead.conversationNotes || lead.conversation_notes || "",
    customerReply: lead.customerReply || lead.customer_reply || "",
    replyAnalysis: lead.replyAnalysis || lead.reply_analysis || "",
    nextAction: lead.nextAction || lead.next_action || "",
    estimatedDealValue: Number(lead.estimatedDealValue ?? lead.estimated_deal_value ?? 0),
    createdAt: lead.createdAt || lead.created_at || "",
    updatedAt: lead.updatedAt || lead.updated_at || ""
  };
}

'@

  $app = $app -replace "function whatsappUrl\(phone, message\) \{", "$frontHelper`nfunction whatsappUrl(phone, message) {"
}

# ============================================================
# FRONTEND: Normalize leads loaded from API
# ============================================================

$app = $app -replace 'setLeads\(data\.items \|\| \[\]\);', 'setLeads((data.items || []).map(normalizeLead));'

# ============================================================
# FRONTEND: Normalize selected lead assignments
# ============================================================

$app = $app -replace 'setSelectedLead\(lead\);', 'setSelectedLead(normalizeLead(lead));'
$app = $app -replace 'setSelectedLead\(created\);', 'setSelectedLead(normalizeLead(created));'
$app = $app -replace 'setSelectedLead\(updated\);', 'setSelectedLead(normalizeLead(updated));'
$app = $app -replace 'setSelectedLead\(result\.lead\);', 'setSelectedLead(normalizeLead(result.lead));'

Set-Content $frontend $app -Encoding UTF8

Write-Host "Broken lead opening repair completed." -ForegroundColor Green
Write-Host "Every lead will now be normalized before opening."