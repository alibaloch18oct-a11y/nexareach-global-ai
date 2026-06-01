$ErrorActionPreference = "Stop"

Write-Host "Fixing Discover category accuracy and CRM category dropdown..." -ForegroundColor Cyan

$backend = "backend\server.js"
$frontend = "frontend\src\App.jsx"

if (!(Test-Path $backend)) { throw "backend/server.js not found" }
if (!(Test-Path $frontend)) { throw "frontend/src/App.jsx not found" }

$server = Get-Content $backend -Raw
$app = Get-Content $frontend -Raw

# ============================================================
# BACKEND FIX 1: Add strict category matcher before osmElementToLead
# ============================================================

if ($server -notmatch "function strictBusinessCategoryMatch") {
  $strictMatcher = @'

function strictBusinessCategoryMatch(element, selectedCategory = "business") {
  const tags = element.tags || {};
  const category = String(selectedCategory || "business").toLowerCase();

  const text = [
    tags.name,
    tags["name:en"],
    tags.brand,
    tags.operator,
    tags.office,
    tags.shop,
    tags.amenity,
    tags.tourism,
    tags.leisure,
    tags.website,
    tags["contact:website"],
    tags.description
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const hasAny = (words) => words.some((word) => text.includes(word));

  if (category.includes("software") || category.includes("it companies") || category.includes("it company")) {
    return (
      tags.office === "it" ||
      hasAny([
        "software",
        "technology",
        "tech",
        "it ",
        " i.t",
        "computer",
        "web",
        "digital",
        "solutions",
        "systems",
        "apps",
        "app development",
        "development",
        "programming",
        "code",
        "cyber",
        "network"
      ])
    );
  }

  if (category.includes("company offices") || category.includes("company office")) {
    return Boolean(tags.office);
  }

  if (category.includes("restaurant")) {
    return tags.amenity === "restaurant" || tags.amenity === "fast_food";
  }

  if (category.includes("cafe")) {
    return tags.amenity === "cafe";
  }

  if (category.includes("bank")) {
    return tags.amenity === "bank" || tags.amenity === "atm";
  }

  if (category.includes("school")) {
    return ["school", "college", "university"].includes(tags.amenity);
  }

  if (category.includes("clinic")) {
    return ["clinic", "doctors"].includes(tags.amenity);
  }

  if (category.includes("hospital")) {
    return tags.amenity === "hospital";
  }

  if (category.includes("pharmacy")) {
    return tags.amenity === "pharmacy";
  }

  if (category.includes("hotel")) {
    return ["hotel", "guest_house", "hostel", "motel"].includes(tags.tourism);
  }

  if (category.includes("mobile")) {
    return tags.shop === "mobile_phone" || hasAny(["mobile", "phone", "cell"]);
  }

  if (category.includes("electronics")) {
    return tags.shop === "electronics" || hasAny(["electronics", "electronic"]);
  }

  if (category.includes("real estate")) {
    return tags.office === "estate_agent" || hasAny(["real estate", "property", "estate"]);
  }

  if (category.includes("travel")) {
    return tags.office === "travel_agent" || hasAny(["travel", "tour", "visa"]);
  }

  if (category.includes("salon")) {
    return tags.shop === "hairdresser" || tags.shop === "beauty" || hasAny(["salon", "beauty", "spa", "barber"]);
  }

  if (category.includes("repair")) {
    return hasAny(["repair", "service center", "service centre"]) || ["computer", "electronics", "mobile_phone"].includes(tags.shop);
  }

  if (category.includes("law")) {
    return tags.office === "lawyer" || hasAny(["law", "legal", "lawyer", "advocate"]);
  }

  if (category.includes("account")) {
    return tags.office === "accountant" || hasAny(["account", "tax", "audit"]);
  }

  if (category.includes("fuel")) {
    return tags.amenity === "fuel";
  }

  if (category.includes("gym")) {
    return tags.leisure === "fitness_centre" || hasAny(["gym", "fitness"]);
  }

  if (category.includes("shop")) {
    return Boolean(tags.shop);
  }

  return true;
}

'@

  $server = $server -replace "function osmElementToLead\(element, meta\) \{", "$strictMatcher`nfunction osmElementToLead(element, meta) {"
}

# ============================================================
# BACKEND FIX 2: Make discovered lead category equal selected business type
# ============================================================

$server = $server -replace 'const category = mapOsmCategory\(tags\);', 'const category = meta.category || mapOsmCategory(tags);'

# ============================================================
# BACKEND FIX 3: Pass category into osmElementToLead and filter strictly
# ============================================================

$oldSearchBlock = @'
    const leads = elements
      .map((element) => osmElementToLead(element, { country, city }))
      .filter(Boolean)
      .filter((lead) => lead.businessName && lead.businessName.length > 1);
'@

$newSearchBlock = @'
    const leads = elements
      .filter((element) => strictBusinessCategoryMatch(element, category))
      .map((element) => osmElementToLead(element, { country, city, category }))
      .filter(Boolean)
      .filter((lead) => lead.businessName && lead.businessName.length > 1);
'@

$server = $server.Replace($oldSearchBlock, $newSearchBlock)

$oldCampaignBlock = @'
        const found = elements
          .map((element) => osmElementToLead(element, { country, city }))
          .filter(Boolean)
          .filter((lead) => lead.businessName && lead.businessName.length > 1);
'@

$newCampaignBlock = @'
        const found = elements
          .filter((element) => strictBusinessCategoryMatch(element, category))
          .map((element) => osmElementToLead(element, { country, city, category }))
          .filter(Boolean)
          .filter((lead) => lead.businessName && lead.businessName.length > 1);
'@

$server = $server.Replace($oldCampaignBlock, $newCampaignBlock)

# ============================================================
# BACKEND FIX 4: Add category filter to /api/leads listLeads
# ============================================================

if ($server -notmatch 'const categoryFilter = query.category') {
  $server = $server -replace 'const status = query\.status \|\| "All";\r?\n  const q = String\(query\.q \|\| ""\)\.trim\(\);', 'const status = query.status || "All";
  const categoryFilter = query.category || "All Categories";
  const q = String(query.q || "").trim();'
}

if ($server -notmatch 'categoryFilter && categoryFilter !== "All Categories"') {
  $server = $server -replace 'if \(status && status !== "All"\) \{', 'if (categoryFilter && categoryFilter !== "All Categories") {
      db = db.ilike("category", `%${categoryFilter}%`);
    }

    if (status && status !== "All") {'
}

if ($server -notmatch 'const matchesCategory =') {
  $server = $server -replace 'const matchesStatus =\r?\n      status === "All"', 'const matchesCategory =
      categoryFilter === "All Categories" || !categoryFilter
        ? true
        : String(lead.category || "").toLowerCase().includes(String(categoryFilter).toLowerCase());

    const matchesStatus =
      status === "All"'
}

$server = $server -replace 'return matchesCountry && matchesCity && matchesStatus && matchesSearch;', 'return matchesCountry && matchesCity && matchesCategory && matchesStatus && matchesSearch;'

Set-Content $backend $server -Encoding UTF8

# ============================================================
# FRONTEND FIX 1: Add selectedCategory state
# ============================================================

if ($app -notmatch 'const \[selectedCategory, setSelectedCategory\]') {
  $app = $app -replace 'const \[statusFilter, setStatusFilter\] = useState\("All"\);', 'const [statusFilter, setStatusFilter] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");'
}

# ============================================================
# FRONTEND FIX 2: Add category to lead query
# ============================================================

if ($app -notmatch 'category: selectedCategory') {
  $app = $app -replace 'status: statusFilter,\r?\n      q: searchText', 'status: statusFilter,
      category: selectedCategory,
      q: searchText'
}

# ============================================================
# FRONTEND FIX 3: Add selectedCategory to reload dependencies
# ============================================================

$app = $app -replace '\[selectedCountry, selectedCity, statusFilter, searchText\]', '[selectedCountry, selectedCity, statusFilter, selectedCategory, searchText]'

# ============================================================
# FRONTEND FIX 4: Add CRM category dropdown
# ============================================================

if ($app -notmatch 'Business Type</option>') {
  $oldFilter = @'
                  <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
'@

  $newFilter = @'
                  <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>

                  <select className="search-input" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    <option>All Categories</option>
                    <option>software houses</option>
                    <option>IT companies</option>
                    <option>company offices</option>
                    <option>restaurants</option>
                    <option>cafes</option>
                    <option>shops</option>
                    <option>mobile shops</option>
                    <option>electronics shops</option>
                    <option>clinics</option>
                    <option>hospitals</option>
                    <option>pharmacies</option>
                    <option>schools</option>
                    <option>hotels</option>
                    <option>real estate agencies</option>
                    <option>travel agencies</option>
                    <option>salons</option>
                    <option>repair shops</option>
                    <option>law offices</option>
                    <option>accounting offices</option>
                    <option>fuel stations</option>
                    <option>gyms</option>
                  </select>
'@

  $app = $app.Replace($oldFilter, $newFilter)
}

# ============================================================
# FRONTEND FIX 5: When importing from Discover, auto set CRM category too
# ============================================================

if ($app -notmatch 'setSelectedCategory\(discoveryCategory\);') {
  $app = $app -replace 'setStatusFilter\("All"\);\r?\n      setPage\(1\);', 'setStatusFilter("All");
      setSelectedCategory(discoveryCategory);
      setPage(1);'
}

Set-Content $frontend $app -Encoding UTF8

Write-Host "Fix completed." -ForegroundColor Green
Write-Host "Discover now imports stricter selected category only."
Write-Host "Lead CRM now has Business Type/Category dropdown filtering."