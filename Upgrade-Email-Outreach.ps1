$ErrorActionPreference = "Stop"

Write-Host "Adding Email Outreach flow to NexaReach AI Pro..." -ForegroundColor Cyan

$frontend = "frontend\src\App.jsx"
$css = "frontend\src\index.css"

if (!(Test-Path $frontend)) { throw "frontend/src/App.jsx not found" }
if (!(Test-Path $css)) { throw "frontend/src/index.css not found" }

$app = Get-Content $frontend -Raw
$style = Get-Content $css -Raw

# ============================================================
# 1. Add email helper functions
# ============================================================

if ($app -notmatch "function buildEmailOpenUrl") {
  $helpers = @'

function splitEmailMessage(message, lead) {
  const raw = String(message || "").trim();
  const lines = raw.split(/\r?\n/);
  let subject = `Software solution for ${lead?.businessName || "your business"}`;
  let body = raw;

  if (lines[0]?.toLowerCase().startsWith("subject:")) {
    subject = lines[0].replace(/^subject:\s*/i, "").trim() || subject;
    body = lines.slice(1).join("\n").trim();
  }

  return { subject, body };
}

function buildEmailOpenUrl(lead, message) {
  if (!lead?.email || !message) return "";

  const { subject, body } = splitEmailMessage(message, lead);

  return `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

'@

  $app = $app -replace "function whatsappUrl\(phone, message\) \{", "$helpers`nfunction whatsappUrl(phone, message) {"
}

# ============================================================
# 2. Upgrade markSent function to support channel parameter
# ============================================================

$app = $app -replace "async function markSent\(lead\) \{", "async function markSent(lead, channel = `"WhatsApp`") {"
$app = $app -replace 'body: JSON\.stringify\(\{ channel: "WhatsApp" \}\)', 'body: JSON.stringify({ channel })'
$app = $app -replace 'notify\("Marked as sent\. Follow-up scheduled\."\);', 'notify(`${channel} marked as sent. Follow-up scheduled.`);'

# ============================================================
# 3. Add generateEmailAndOpen function
# ============================================================

if ($app -notmatch "async function generateEmailAndOpen") {
  $fn = @'

  async function generateEmailAndOpen(lead) {
    if (!lead?.email) {
      notify("This lead has no email. Add email first.");
      return;
    }

    setLoading(true);

    try {
      const updated = await api(`/api/leads/${lead.id}/generate-message`, {
        method: "POST",
        body: JSON.stringify({ mode: "email_pitch" })
      });

      setSelectedLead(updated);
      notify("Email generated. Opening email app...");

      const emailLink = buildEmailOpenUrl(updated, updated.lastMessage);

      if (emailLink) {
        window.location.href = emailLink;
      }

      await loadLeads(page);
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
  }

  function openCurrentEmailDraft() {
    if (!selectedLead?.email) {
      notify("This lead has no email. Add email first.");
      return;
    }

    if (!selectedLead?.lastMessage) {
      notify("Generate an email message first.");
      return;
    }

    const emailLink = buildEmailOpenUrl(selectedLead, selectedLead.lastMessage);

    if (emailLink) {
      window.location.href = emailLink;
    }
  }

'@

  $app = $app -replace "  async function markSent\(lead, channel = `"WhatsApp`"\) \{", "$fn`n  async function markSent(lead, channel = `"WhatsApp`") {"
}

# ============================================================
# 4. Add email buttons inside AI Studio actions
# ============================================================

if ($app -notmatch "Generate Email") {
  $old = @'
                    <button className="ghost-btn" onClick={() => markSent(selectedLead)}>
                      <Send size={18} />
                      Mark Sent
                    </button>
'@

  $new = @'
                    {selectedLead.email ? (
                      <button className="email-btn" onClick={() => generateEmailAndOpen(selectedLead)}>
                        <Mail size={18} />
                        Generate Email + Open
                      </button>
                    ) : (
                      <button className="disabled-btn" disabled>
                        <Mail size={18} />
                        Add Email First
                      </button>
                    )}

                    {selectedLead.email && selectedLead.lastMessage && (
                      <button className="secondary-btn" onClick={openCurrentEmailDraft}>
                        <Mail size={18} />
                        Open Email
                      </button>
                    )}

                    <button className="ghost-btn" onClick={() => markSent(selectedLead, "WhatsApp")}>
                      <Send size={18} />
                      Mark WhatsApp Sent
                    </button>

                    {selectedLead.email && (
                      <button className="ghost-btn" onClick={() => markSent(selectedLead, "Email")}>
                        <Send size={18} />
                        Mark Email Sent
                      </button>
                    )}
'@

  $app = $app.Replace($old, $new)
}

# ============================================================
# 5. Add email quick action to lead cards
# ============================================================

if ($app -notmatch "Email Outreach") {
  $oldCard = @'
            {lead.email && <a href={`mailto:${lead.email}`}>Email</a>}
'@

  $newCard = @'
            {lead.email && <a href={`mailto:${lead.email}`}>Email</a>}
            {lead.email && <a href={`mailto:${lead.email}?subject=${encodeURIComponent(`Software solution for ${lead.businessName || "your business"}`)}`}>Email Outreach</a>}
'@

  $app = $app.Replace($oldCard, $newCard)
}

Set-Content $frontend $app -Encoding UTF8

# ============================================================
# 6. Add CSS
# ============================================================

if ($style -notmatch "email-btn") {
  $style += @'

.email-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  color: #ffffff;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(56, 189, 248, 0.18);
}

.email-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

'@
}

Set-Content $css $style -Encoding UTF8

Write-Host "Email Outreach upgrade completed." -ForegroundColor Green
Write-Host "Now restart frontend/backend and test Generate Email + Open."