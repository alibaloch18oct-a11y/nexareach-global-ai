$ErrorActionPreference = "Stop"

Write-Host "Fixing AI Studio Gmail buttons..." -ForegroundColor Cyan

$frontend = "frontend\src\App.jsx"

if (!(Test-Path $frontend)) {
  throw "frontend/src/App.jsx not found"
}

$app = Get-Content $frontend -Raw

# 1. Add Gmail helper if missing
if ($app -notmatch "function splitEmailMessage") {
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

function buildGmailComposeUrl(lead, message) {
  if (!lead?.email || !message) return "";

  const { subject, body } = splitEmailMessage(message, lead);

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: lead.email,
    su: subject,
    body
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

function buildEmailOpenUrl(lead, message) {
  if (!lead?.email || !message) return "";

  const { subject, body } = splitEmailMessage(message, lead);

  return `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

'@

  $app = $app -replace "function whatsappUrl\(phone, message\) \{", "$helpers`nfunction whatsappUrl(phone, message) {"
}

# 2. Add Gmail action functions if missing
if ($app -notmatch "async function generateEmailAndOpenGmail") {
  $gmailFunctions = @'

  async function generateEmailAndOpenGmail(lead) {
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
      notify("Email generated. Opening Gmail compose...");

      const gmailLink = buildGmailComposeUrl(updated, updated.lastMessage);

      if (gmailLink) {
        window.open(gmailLink, "_blank", "noopener,noreferrer");
      }

      await loadLeads(page);
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
  }

  function openCurrentGmailDraft() {
    if (!selectedLead?.email) {
      notify("This lead has no email. Add email first.");
      return;
    }

    if (!selectedLead?.lastMessage) {
      notify("Generate an email message first.");
      return;
    }

    const gmailLink = buildGmailComposeUrl(selectedLead, selectedLead.lastMessage);

    if (gmailLink) {
      window.open(gmailLink, "_blank", "noopener,noreferrer");
    }
  }

  function openCurrentDefaultEmailDraft() {
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

  $app = $app -replace "  async function copyMessage\(\) \{", "$gmailFunctions`n  async function copyMessage() {"
}

# 3. Make markSent accept channel
$app = $app -replace "async function markSent\(lead\) \{", "async function markSent(lead, channel = `"WhatsApp`") {"
$app = $app -replace 'body: JSON\.stringify\(\{ channel: "WhatsApp" \}\)', 'body: JSON.stringify({ channel })'
$app = $app -replace 'notify\("Marked as sent\. Follow-up scheduled\."\);', 'notify(`${channel} marked as sent. Follow-up scheduled.`);'

# 4. Replace the exact studio-actions block
$pattern = '<div className="studio-actions">.*?</div>\s*<div className="edit-lead-box">'
$replacement = @'
<div className="studio-actions">
                    {openWhatsapp ? (
                      <a className="whatsapp-btn" href={openWhatsapp} target="_blank" rel="noreferrer">
                        <MessageCircle size={18} />
                        Open WhatsApp
                      </a>
                    ) : (
                      <button className="disabled-btn" disabled>
                        <MessageCircle size={18} />
                        Add WhatsApp First
                      </button>
                    )}

                    {selectedLead.email ? (
                      <button className="email-btn" onClick={() => generateEmailAndOpenGmail(selectedLead)}>
                        <Mail size={18} />
                        Generate Email + Open Gmail
                      </button>
                    ) : (
                      <button className="disabled-btn" disabled>
                        <Mail size={18} />
                        Add Email First
                      </button>
                    )}

                    {selectedLead.email && selectedLead.lastMessage && (
                      <button className="secondary-btn" onClick={openCurrentGmailDraft}>
                        <Mail size={18} />
                        Open Gmail
                      </button>
                    )}

                    {selectedLead.email && selectedLead.lastMessage && (
                      <button className="secondary-btn" onClick={openCurrentDefaultEmailDraft}>
                        <Mail size={18} />
                        Default Email
                      </button>
                    )}

                    <button className="secondary-btn" onClick={copyMessage}>
                      <Copy size={18} />
                      Copy
                    </button>

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

                    <button className="ghost-btn" onClick={() => updateLead(selectedLead.id, { status: "Replied" })}>
                      <CheckCircle2 size={18} />
                      Replied
                    </button>

                    <button className="ghost-btn" onClick={() => updateLead(selectedLead.id, { status: "Interested" })}>
                      <Target size={18} />
                      Interested
                    </button>

                    <button className="danger-btn" onClick={() => updateLead(selectedLead.id, { status: "Not Interested" })}>
                      Not Interested
                    </button>
                  </div>

                  <div className="edit-lead-box">
'@

$newApp = [regex]::Replace($app, $pattern, $replacement, "Singleline")

if ($newApp -eq $app) {
  throw "Could not find studio-actions block. Your App.jsx layout is different."
}

Set-Content $frontend $newApp -Encoding UTF8

Write-Host "AI Studio Gmail buttons fixed." -ForegroundColor Green