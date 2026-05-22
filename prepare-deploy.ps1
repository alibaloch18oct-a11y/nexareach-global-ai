$ErrorActionPreference = "Stop"

Write-Host "Preparing NexaReach Global AI for deployment..." -ForegroundColor Cyan

$backendFile = "backend\server.js"
$frontendFile = "frontend\src\App.jsx"

if (!(Test-Path $backendFile)) {
  throw "backend/server.js not found"
}

if (!(Test-Path $frontendFile)) {
  throw "frontend/src/App.jsx not found"
}

$server = Get-Content $backendFile -Raw

# Replace simple CORS with deployment-safe CORS
$server = $server -replace "app\.use\(cors\(\)\);", @"
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, "http://localhost:5173", "http://localhost:5179"]
      : true,
    credentials: true
  })
);
"@

# Add health route if not already present
if ($server -notmatch 'app\.get\("/health"') {
  $server = $server -replace 'app\.get\("/", \(req, res\) => \{', @'
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    app: "NexaReach Global AI",
    time: new Date().toISOString()
  });
});

app.get("/", (req, res) => {
'@
}

Set-Content $backendFile $server -Encoding UTF8

$app = Get-Content $frontendFile -Raw

# Replace hardcoded API URL with Vite env API URL
$app = $app -replace 'const API = "http://localhost:5000";', 'const API = import.meta.env.VITE_API_URL || "http://localhost:5000";'

Set-Content $frontendFile $app -Encoding UTF8

Write-Host "Deployment preparation completed successfully." -ForegroundColor Green
Write-Host "Backend CORS updated."
Write-Host "Frontend API URL updated."