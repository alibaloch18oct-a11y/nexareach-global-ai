$ErrorActionPreference = "Stop"

Write-Host "Upgrading NexaReach AI Pro: Contact Enrichment & Multi-Channel Outreach..." -ForegroundColor Cyan

$backend = "backend\server.js"
$frontend = "frontend\src\App.jsx"
$css = "frontend\src\index.css"

if (!(Test-Path $backend)) { throw "backend/server.js not found" }
if (!(Test-Path $frontend)) { throw "frontend/src/App.jsx not found" }
if (!(Test-Path $css)) { throw "frontend/src/index.css not found" }

$server = Get-Content $backend -Raw
$app = Get-Content $frontend -Raw
$style = Get-Content $css -Raw

# ============================================================
# BACKEND FIX 1: Add contact helper functions
# ============================================================

if ($server -notmatch "function contactQuality") {
  $helpers = @'

function contactQuality(lead) {
  const hasWhatsapp = Boolean(lead.whatsapp || lead.phone);
  const hasEmail = Boolean(lead.email);
  const hasWebsite = Boolean(lead.website);
  const hasSocial = Boolean(lead.instagram || lead.facebook || lead.linkedin);

  if (hasWhatsapp) return "Ready WhatsApp";
  if (hasEmail && hasWebsite) return "Email + Website";
  if (hasEmail) return "Has Email";
  if (hasWebsite) return "Has Website";
  if (hasSocial) return "Has Social";
  return "Needs Contact";
}

function applyContactStatus(lead) {
  const quality = contactQuality(lead);

  if ((lead.whatsapp || lead.phone) && ["New", "Needs Contact", "Needs Phone", "No Contact"].includes(lead.status || "New")) {
    return {
      ...lead,
      status: "Ready to WhatsApp"
    };
  }

  if (!lead.whatsapp && !lead.phone && !lead.email && !lead.website && !lead.instagram && !lead.facebook && !lead.linkedin) {
    if (["New", "Needs Phone"].includes(lead.status || "New")) {
      return {
        ...lead,
        status: "Needs Contact"
      };
    }
  }

  return lead;
}

function buildLeadLinks(lead) {
  const q = encodeURIComponent(`${lead.businessName || lead.name || ""} ${lead.city || ""} ${lead.country || ""}`.trim());
  const website = lead.website || "";

  return {
    google: `https://www.google.com/search?q=${q}`,
    maps: `https://www.google.com/maps/search/${q}`,
    facebook: `https://www.facebook.com/search/pages/?q=${q}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${q}`,
    instagram: `https://www.instagram.com/explore/search/keyword/?q=${q}`,
    website,
    email: lead.email ? `mailto:${lead.email}` : ""
  };
}

'@

  $server = $server -replace "function countLocal\(leads\) \{", "$helpers`nfunction countLocal(leads) {"
}

# ============================================================
# BACKEND FIX 2: Add contact counts in countLocal
# ============================================================

$server = $server -replace 'readyToWhatsApp: leads\.filter\(\(lead\) => lead\.phone \|\| lead\.whatsapp\)\.length,\r?\n    needsPhone: leads\.filter\(\(lead\) => !lead\.phone && !lead\.whatsapp\)\.length,', 'readyToWhatsApp: leads.filter((lead) => lead.phone || lead.whatsapp).length,
    needsPhone: leads.filter((lead) => !lead.phone && !lead.whatsapp).length,
    needsContact: leads.filter((lead) => contactQuality(lead) === "Needs Contact").length,
    hasEmail: leads.filter((lead) => lead.email).length,
    hasWebsite: leads.filter((lead) => lead.website).length,
    noContact: leads.filter((lead) => !lead.phone && !lead.whatsapp && !lead.email && !lead.website && !lead.instagram && !lead.facebook && !lead.linkedin).length,'

# ============================================================
# BACKEND FIX 3: Add status filters for contact quality in Supabase and JSON
# ============================================================

if ($server -notmatch 'status === "Needs Contact"') {
  $server = $server -replace 'if \(status === "Ready to WhatsApp"\) \{\r?\n        db = db\.not\("whatsapp", "eq", ""\);\r?\n      \} else if \(status === "Needs Phone"\) \{\r?\n        db = db\.or\("phone\.is\.null,phone\.eq\.,whatsapp\.is\.null,whatsapp\.eq\."\);\r?\n      \} else \{', 'if (status === "Ready to WhatsApp") {
        db = db.or("phone.not.is.null,whatsapp.not.is.null");
      } else if (status === "Needs Phone" || status === "Needs Contact" || status === "No Contact") {
        db = db.or("phone.is.null,phone.eq.,whatsapp.is.null,whatsapp.eq.");
      } else if (status === "Has Email") {
        db = db.not("email", "eq", "");
      } else if (status === "Has Website") {
        db = db.not("website", "eq", "");
      } else {'
}

$server = $server -replace ': status === "Ready to WhatsApp"\r?\n        \? Boolean\(lead\.phone \|\| lead\.whatsapp\)\r?\n        : status === "Needs Phone"\r?\n        \? !lead\.phone && !lead\.whatsapp\r?\n        : lead\.status === status;', ': status === "Ready to WhatsApp"
        ? Boolean(lead.phone || lead.whatsapp)
        : status === "Needs Phone" || status === "Needs Contact"
        ? !lead.phone && !lead.whatsapp
        : status === "Has Email"
        ? Boolean(lead.email)
        : status === "Has Website"
        ? Boolean(lead.website)
        : status === "No Contact"
        ? !lead.phone && !lead.whatsapp && !lead.email && !lead.website && !lead.instagram && !lead.facebook && !lead.linkedin
        : lead.status === status;'

# ============================================================
# BACKEND FIX 4: Apply contact status before saving leads
# ============================================================

$server = $server -replace 'const prepared = \{\r?\n    id: lead\.id \|\| id\("lead"\),\r?\n    \.\.\.lead,\r?\n    updatedAt: nowIso\(\)\r?\n  \};', 'const prepared = applyContactStatus({
    id: lead.id || id("lead"),
    ...lead,
    updatedAt: nowIso()
  });'

# ============================================================
# BACKEND FIX 5: Add endpoint for lead enrichment links
# ============================================================

if ($server -notmatch 'app.get\("/api/leads/:id/enrichment"') {
  $endpoint = @'

app.get("/api/leads/:id/enrichment", async (req, res) => {
  try {
    const lead = await getLead(req.params.id);
    res.json({
      contactQuality: contactQuality(lead),
      links: buildLeadLinks(lead)
    });
  } catch (error) {
    res.status(500).json({ error: "Could not build enrichment links", details: error.message });
  }
});

'@

  $server = $server -replace 'app.post\("/api/leads/:id/score"', "$endpoint`napp.post(`"/api/leads/:id/score`""
}

Set-Content $backend $server -Encoding UTF8

# ============================================================
# FRONTEND FIX 1: Add contact statuses
# ============================================================

$app = $app -replace '"Ready to WhatsApp",\r?\n  "Needs Phone"', '"Ready to WhatsApp",
  "Needs Contact",
  "Has Email",
  "Has Website",
  "No Contact",
  "Needs Phone"'

# ============================================================
# FRONTEND FIX 2: Add lead helper functions
# ============================================================

if ($app -notmatch "function getContactQuality") {
  $frontHelpers = @'

function getContactQuality(lead) {
  if (lead?.whatsapp || lead?.phone) return "Ready WhatsApp";
  if (lead?.email && lead?.website) return "Email + Website";
  if (lead?.email) return "Has Email";
  if (lead?.website) return "Has Website";
  if (lead?.instagram || lead?.facebook || lead?.linkedin) return "Has Social";
  return "Needs Contact";
}

function buildEnrichmentLinks(lead) {
  const q = encodeURIComponent(`${lead?.businessName || ""} ${lead?.city || ""} ${lead?.country || ""}`.trim());

  return {
    google: `https://www.google.com/search?q=${q}`,
    maps: `https://www.google.com/maps/search/${q}`,
    facebook: `https://www.facebook.com/search/pages/?q=${q}`,
    linkedin: `https://www.linkedin.com/search/results/companies/?keywords=${q}`,
    instagram: `https://www.instagram.com/explore/search/keyword/?q=${q}`,
    website: lead?.website || "",
    email: lead?.email ? `mailto:${lead.email}` : ""
  };
}

function ContactBadge({ lead }) {
  const quality = getContactQuality(lead);
  const className =
    quality === "Ready WhatsApp"
      ? "contact-badge ready"
      : quality === "Needs Contact"
      ? "contact-badge needs"
      : "contact-badge partial";

  return <span className={className}>{quality}</span>;
}

'@

  $app = $app -replace 'export default function App\(\) \{', "$frontHelpers`nexport default function App() {"
}

# ============================================================
# FRONTEND FIX 3: Add manual contact save function
# ============================================================

if ($app -notmatch "async function saveSelectedContact") {
  $saveContactFunction = @'

  async function saveSelectedContact() {
    if (!selectedLead) return;

    const nextStatus =
      selectedLead.whatsapp || selectedLead.phone
        ? "Ready to WhatsApp"
        : selectedLead.email || selectedLead.website
        ? selectedLead.status || "New"
        : "Needs Contact";

    await updateLead(selectedLead.id, {
      ...selectedLead,
      status: nextStatus
    });
  }

'@

  $app = $app -replace '  async function analyzeReply\(\) \{', "$saveContactFunction`n  async function analyzeReply() {"
}

# ============================================================
# FRONTEND FIX 4: Add contact quality badge in LeadGrid badges
# ============================================================

if ($app -notmatch "<ContactBadge lead=\{lead\}") {
  $app = $app -replace '<span>\{lead\.recommendedProduct \|\| "No product"\}</span>', '<span>{lead.recommendedProduct || "No product"}</span>
              <ContactBadge lead={lead} />'
}

# ============================================================
# FRONTEND FIX 5: Add Find Contact buttons to LeadGrid card
# ============================================================

if ($app -notmatch "Find Contact") {
  $oldCardActions = @'
          <div className="card-actions">
            <button className="mini-btn" onClick={() => onScore(lead)}>
              <Target size={15} />
              Score
            </button>
            <button className="mini-btn" onClick={() => onGenerate(lead)}>
              <Wand2 size={15} />
              Generate
            </button>
            <button className="danger-btn" onClick={() => onDelete(lead.id)}>
              <Trash2 size={15} />
            </button>
          </div>
'@

  $newCardActions = @'
          <div className="contact-actions">
            <a href={buildEnrichmentLinks(lead).google} target="_blank" rel="noreferrer">Find Contact</a>
            <a href={buildEnrichmentLinks(lead).maps} target="_blank" rel="noreferrer">Maps</a>
            {lead.website && <a href={lead.website} target="_blank" rel="noreferrer">Website</a>}
            {lead.email && <a href={`mailto:${lead.email}`}>Email</a>}
          </div>

          <div className="card-actions">
            <button className="mini-btn" onClick={() => onScore(lead)}>
              <Target size={15} />
              Score
            </button>
            <button className="mini-btn" onClick={() => onGenerate(lead)}>
              <Wand2 size={15} />
              Generate
            </button>
            <button className="danger-btn" onClick={() => onDelete(lead.id)}>
              <Trash2 size={15} />
            </button>
          </div>
'@

  $app = $app.Replace($oldCardActions, $newCardActions)
}

# ============================================================
# FRONTEND FIX 6: Add contact editor + enrichment panel in AI Studio
# ============================================================

if ($app -notmatch "Contact Enrichment") {
  $target = @'
                  <div className="ai-box">
                    <h4>AI Lead Intelligence</h4>
                    <p><b>Problem:</b> {selectedLead.aiProblem || "Score lead to generate problem insight."}</p>
                    <p><b>Why good:</b> {selectedLead.aiReason || "Score lead to generate reason."}</p>
                    <p><b>Best angle:</b> {selectedLead.aiOutreachAngle || "Score lead to generate outreach angle."}</p>
                    <p><b>Next action:</b> {selectedLead.nextAction || "Generate message or follow up."}</p>
                  </div>
'@

  $insert = @'
                  <div className="ai-box">
                    <h4>AI Lead Intelligence</h4>
                    <p><b>Problem:</b> {selectedLead.aiProblem || "Score lead to generate problem insight."}</p>
                    <p><b>Why good:</b> {selectedLead.aiReason || "Score lead to generate reason."}</p>
                    <p><b>Best angle:</b> {selectedLead.aiOutreachAngle || "Score lead to generate outreach angle."}</p>
                    <p><b>Next action:</b> {selectedLead.nextAction || "Generate message or follow up."}</p>
                  </div>

                  <div className="ai-box contact-enrichment-box">
                    <h4>Contact Enrichment</h4>
                    <p><b>Contact Quality:</b> <ContactBadge lead={selectedLead} /></p>

                    <div className="form-grid">
                      <Input label="WhatsApp Number" value={selectedLead.whatsapp} onChange={(v) => setSelectedLead({ ...selectedLead, whatsapp: v })} />
                      <Input label="Phone Number" value={selectedLead.phone} onChange={(v) => setSelectedLead({ ...selectedLead, phone: v })} />
                      <Input label="Email" value={selectedLead.email} onChange={(v) => setSelectedLead({ ...selectedLead, email: v })} />
                      <Input label="Website" value={selectedLead.website} onChange={(v) => setSelectedLead({ ...selectedLead, website: v })} />
                      <Input label="Instagram" value={selectedLead.instagram} onChange={(v) => setSelectedLead({ ...selectedLead, instagram: v })} />
                      <Input label="Facebook" value={selectedLead.facebook} onChange={(v) => setSelectedLead({ ...selectedLead, facebook: v })} />
                      <Input label="LinkedIn" value={selectedLead.linkedin} onChange={(v) => setSelectedLead({ ...selectedLead, linkedin: v })} />
                    </div>

                    <button className="secondary-btn" onClick={saveSelectedContact}>
                      <Save size={17} />
                      Save Contact Details
                    </button>

                    <div className="enrichment-row">
                      <a href={buildEnrichmentLinks(selectedLead).google} target="_blank" rel="noreferrer">Google Search</a>
                      <a href={buildEnrichmentLinks(selectedLead).maps} target="_blank" rel="noreferrer">Google Maps</a>
                      <a href={buildEnrichmentLinks(selectedLead).facebook} target="_blank" rel="noreferrer">Facebook</a>
                      <a href={buildEnrichmentLinks(selectedLead).linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
                      <a href={buildEnrichmentLinks(selectedLead).instagram} target="_blank" rel="noreferrer">Instagram</a>
                      {selectedLead.website && <a href={selectedLead.website} target="_blank" rel="noreferrer">Website</a>}
                      {selectedLead.email && <a href={`mailto:${selectedLead.email}`}>Email</a>}
                    </div>
                  </div>
'@

  $app = $app.Replace($target, $insert)
}

Set-Content $frontend $app -Encoding UTF8

# ============================================================
# CSS FIX
# ============================================================

if ($style -notmatch "contact-badge") {
  $style += @'

.contact-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.02em;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.contact-badge.ready {
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
  border-color: rgba(34, 197, 94, 0.28);
}

.contact-badge.partial {
  background: rgba(59, 130, 246, 0.15);
  color: #bfdbfe;
  border-color: rgba(59, 130, 246, 0.28);
}

.contact-badge.needs {
  background: rgba(251, 191, 36, 0.15);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.28);
}

.contact-actions {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
  margin: 12px 0 8px;
}

.contact-actions a {
  display: inline-flex;
  align-items: center;
  padding: 7px 9px;
  border-radius: 999px;
  background: rgba(0, 240, 255, 0.09);
  color: #dffbff;
  border: 1px solid rgba(0, 240, 255, 0.18);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
}

.contact-enrichment-box {
  border-color: rgba(251, 191, 36, 0.25) !important;
  background: rgba(251, 191, 36, 0.06) !important;
}

'@
}

Set-Content $css $style -Encoding UTF8

Write-Host "Phase 2.1 Contact Enrichment upgrade completed." -ForegroundColor Green
Write-Host "Now restart backend/frontend and test Ready WhatsApp + Needs Contact filters."