$ErrorActionPreference = "Stop"

Write-Host "Fixing NexaReach message generation..." -ForegroundColor Cyan

$backend = "backend\server.js"
$frontend = "frontend\src\App.jsx"

if (!(Test-Path $backend)) { throw "backend/server.js not found" }
if (!(Test-Path $frontend)) { throw "frontend/src/App.jsx not found" }

$server = Get-Content $backend -Raw
$app = Get-Content $frontend -Raw

# Replace complete buildMessage function safely
$pattern = 'function buildMessage\(\{ profile, lead, mode = "short_whatsapp" \}\) \{.*?\n\}'
$replacement = @'
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
'@

$newServer = [regex]::Replace($server, $pattern, $replacement, "Singleline")

if ($newServer -eq $server) {
  throw "Could not replace buildMessage function. Pattern not found."
}

Set-Content $backend $newServer -Encoding UTF8

# Improve frontend API error so it shows backend details, not only generic error
$app = $app -replace 'throw new Error\(data\.error \|\| data\.details \|\| `Request failed \$\{res\.status\}`\);', 'throw new Error(data.details || data.error || `Request failed ${res.status}`);'

Set-Content $frontend $app -Encoding UTF8

Write-Host "Message generation fix completed." -ForegroundColor Green
Write-Host "Now test locally, then push and redeploy Render/Vercel."