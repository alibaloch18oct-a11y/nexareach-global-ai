$ErrorActionPreference = "Stop"

Write-Host "Fixing NexaReach resume URL + resume in generated messages..." -ForegroundColor Cyan

$frontend = "frontend\src\App.jsx"
$backend = "backend\server.js"

if (!(Test-Path $frontend)) {
  throw "frontend/src/App.jsx not found"
}

if (!(Test-Path $backend)) {
  throw "backend/server.js not found"
}

$app = Get-Content $frontend -Raw
$server = Get-Content $backend -Raw

# -------------------------------------------------------
# 1. Add uploadResume function in App.jsx if missing
# -------------------------------------------------------
if ($app -notmatch "async function uploadResume") {
  $uploadFunction = @'

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = await fetch(`${API}/api/upload/resume`, {
        method: "POST",
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || "Resume upload failed");

      setProfile((prev) => ({
        ...prev,
        resumeUrl: data.resumeUrl
      }));

      notify("Resume uploaded and saved in profile.");
      await loadBase();
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
    event.target.value = "";
  }

'@

  $app = $app -replace "  async function importCsv\(event\) \{", "$uploadFunction`n  async function importCsv(event) {"
}

# -------------------------------------------------------
# 2. Add Resume URL input after GitHub input if missing
# -------------------------------------------------------
if ($app -notmatch "Resume URL") {
  $githubLine = '<Input label="GitHub" value={profile.github} onChange={(v) => setProfile({ ...profile, github: v })} />'
  $resumeLine = @'
                <Input label="GitHub" value={profile.github} onChange={(v) => setProfile({ ...profile, github: v })} />
                <Input label="Resume URL" value={profile.resumeUrl} onChange={(v) => setProfile({ ...profile, resumeUrl: v })} />
'@
  $app = $app.Replace($githubLine, $resumeLine)
}

# -------------------------------------------------------
# 3. Add upload resume box in profile if missing
# -------------------------------------------------------
if ($app -notmatch "Upload Resume PDF") {
  $bioBlock = '<Textarea label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} />'

  $resumeUploadBlock = @'
              <Textarea label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} />

              <div className="upload-box">
                <div>
                  <h4>Resume</h4>
                  <p>{profile.resumeUrl || "No resume URL added yet. Upload PDF or paste Google Drive resume link above."}</p>
                </div>
                <label className="upload-btn">
                  <Upload size={18} />
                  Upload Resume PDF
                  <input hidden type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} />
                </label>
              </div>
'@

  $app = $app.Replace($bioBlock, $resumeUploadBlock)
}

# -------------------------------------------------------
# 4. Ensure backend message generator has resume line
# -------------------------------------------------------
if ($server -notmatch "const resume = profile.resumeUrl") {
  $server = $server -replace 'const linkedin = profile\.linkedin \|\| "\[LinkedIn Link\]";', 'const linkedin = profile.linkedin || "[LinkedIn Link]";
  const resume = profile.resumeUrl || "[Resume Link]";'
}

# Add resume to proof line
$server = $server -replace 'const proofLine = `You can see my work here: \$\{portfolio\}`;', 'const proofLine = `Portfolio: ${portfolio}
LinkedIn: ${linkedin}
Resume: ${resume}`;'

# Replace old individual LinkedIn duplication in email mode if present
$server = $server -replace 'Portfolio: \$\{portfolio\}\r?\nLinkedIn: \$\{linkedin\}\r?\n', '${proofLine}
'

# Add Resume line after LinkedIn in international formal if missing
$server = $server -replace 'LinkedIn: \$\{linkedin\}\r?\n\r?\nIf you are open to it, I can share a short demo\.', 'LinkedIn: ${linkedin}
Resume: ${resume}

If you are open to it, I can share a short demo.'

# Add Resume line in Pakistani friendly mode if missing
$server = $server -replace 'Portfolio: \$\{portfolio\}\r?\n\r?\nAgar aap interested hon', 'Portfolio: ${portfolio}
Resume: ${resume}

Agar aap interested hon'

# Add Resume in default fallback by making proofLine include it already.
# This is enough for short WhatsApp/default and email_pitch.

Set-Content $frontend $app -Encoding UTF8
Set-Content $backend $server -Encoding UTF8

Write-Host "Resume fix completed." -ForegroundColor Green
Write-Host "Updated frontend profile: Resume URL + Upload Resume PDF."
Write-Host "Updated backend messages: Resume included in generated outreach."