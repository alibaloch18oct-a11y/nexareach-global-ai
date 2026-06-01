$ErrorActionPreference = "Stop"

Write-Host "Adding Gmail compose button to NexaReach AI Pro..." -ForegroundColor Cyan

$frontend = "frontend\src\App.jsx"

if (!(Test-Path $frontend)) {
  throw "frontend/src/App.jsx not found"
}

$app = Get-Content $frontend -Raw

# ============================================================
# 1. Add Gmail compose helper function
# ============================================================

if ($app -notmatch "function buildGmailComposeUrl") {
  $gmailHelper = @'

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

'@

  $app = $app -replace "function buildEmailOpenUrl\(lead, message\) \{", "$gmailHelper`nfunction buildEmailOpenUrl(lead, message) {"
}

# ============================================================
# 2. Add Generate Email + Open Gmail function
# ============================================================

if ($app -notmatch "async function generateEmailAndOpenGmail") {
  $gmailFunction = @'

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

'@

  $app = $app -replace "  async function generateEmailAndOpen\(lead\) \{", "$gmailFunction`n  async function generateEmailAndOpen(lead) {"
}

# ============================================================
# 3. Add Gmail buttons near email buttons
# ============================================================

if ($app -notmatch "Open Gmail") {
  $oldButtons = @'
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
'@

  $newButtons = @'
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
                      <button className="secondary-btn" onClick={openCurrentEmailDraft}>
                        <Mail size={18} />
                        Open Default Email
                      </button>
                    )}
'@

  $app = $app.Replace($oldButtons, $newButtons)
}

Set-Content $frontend $app -Encoding UTF8

Write-Host "Gmail compose button added successfully." -ForegroundColor Green
Write-Host "Now restart frontend and test Generate Email + Open Gmail."