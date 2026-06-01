$ErrorActionPreference = "Stop"

Write-Host "Fixing missing openCurrentDefaultEmailDraft function..." -ForegroundColor Cyan

$frontend = "frontend\src\App.jsx"

if (!(Test-Path $frontend)) {
  throw "frontend/src/App.jsx not found"
}

$app = Get-Content $frontend -Raw

# Add splitEmailMessage if missing
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

function buildEmailOpenUrl(lead, message) {
  if (!lead?.email || !message) return "";

  const { subject, body } = splitEmailMessage(message, lead);

  return `mailto:${encodeURIComponent(lead.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

'@

  $app = $app -replace "function whatsappUrl\(phone, message\) \{", "$helpers`nfunction whatsappUrl(phone, message) {"
}

# Add missing frontend function inside App component
if ($app -notmatch "function openCurrentDefaultEmailDraft") {
  $missingFunction = @'

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

  $app = $app -replace "  async function copyMessage\(\) \{", "$missingFunction`n  async function copyMessage() {"
}

# Add Gmail draft function too if button exists but function missing
if ($app -match "openCurrentGmailDraft" -and $app -notmatch "function openCurrentGmailDraft") {
  $gmailFunction = @'

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

  $app = $app -replace "  function openCurrentDefaultEmailDraft\(\) \{", "$gmailFunction`n  function openCurrentDefaultEmailDraft() {"
}

Set-Content $frontend $app -Encoding UTF8

Write-Host "Missing email draft functions fixed." -ForegroundColor Green