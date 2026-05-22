import React, { useEffect, useState } from "react";
import {
  Brain,
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Link as LinkIcon,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  RefreshCcw,
  Rocket,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Upload,
  User,
  Wand2,
  Zap
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const countryCityMap = {
  "All Countries": ["All Cities"],
  Pakistan: ["All Cities", "Karachi", "Lahore", "Islamabad", "Hyderabad", "Rawalpindi", "Faisalabad"],
  "United Arab Emirates": ["All Cities", "Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  "Saudi Arabia": ["All Cities", "Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah"],
  Qatar: ["All Cities", "Doha", "Al Rayyan"],
  Malaysia: ["All Cities", "Kuala Lumpur", "George Town", "Johor Bahru"],
  "United Kingdom": ["All Cities", "London", "Manchester", "Birmingham", "Leeds"],
  "United States": ["All Cities", "New York", "Los Angeles", "Chicago", "Houston"],
  Canada: ["All Cities", "Toronto", "Vancouver", "Montreal", "Calgary"],
  Australia: ["All Cities", "Sydney", "Melbourne", "Brisbane", "Perth"]
};

const categories = [
  "business",
  "software houses",
  "IT companies",
  "company offices",
  "restaurants",
  "cafes",
  "banks",
  "schools",
  "clinics",
  "hotels",
  "shops",
  "real estate agencies",
  "travel agencies"
];

const fallbackProfile = {
  fullName: "Shahzaib Ali",
  title: "Information Technology Graduate | AI & Full Stack Developer",
  email: "alibaloch18oct@gmail.com",
  phone: "",
  whatsapp: "",
  location: "Pakistan",
  portfolio: "",
  linkedin: "",
  github: "",
  resumeUrl: "",
  skills: "React, Node.js, AI Apps, Dashboards, Automation, JavaScript, Express",
  projects:
    "NexaAgent AI, Jarvis AI Assistant, School Management System, FBR AI Assistant, Portfolio Website",
  bio: "I build AI-powered software, business automation tools, dashboards, and modern web applications."
};

const emptyLead = {
  name: "",
  category: "Business",
  phone: "",
  email: "",
  website: "",
  country: "",
  city: "",
  location: "",
  address: "",
  contactPerson: "",
  notes: "",
  priority: "Medium"
};

function makeWhatsAppUrl(phone, message) {
  if (!phone || !message) return "";
  let clean = String(phone).replace(/[^\d]/g, "");
  if (clean.startsWith("00")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = "92" + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function safeMessageFromError(error) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  return error.message || "Unknown error";
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [leads, setLeads] = useState([]);
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    readyToWhatsApp: 0,
    needsPhone: 0,
    sent: 0
  });

  const [leadForm, setLeadForm] = useState(emptyLead);
  const [selectedLead, setSelectedLead] = useState(null);
  const [goal, setGoal] = useState("business");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [backendWarning, setBackendWarning] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [selectedCity, setSelectedCity] = useState("All Cities");

  const [importCountry, setImportCountry] = useState("United Arab Emirates");
  const [importCity, setImportCity] = useState("Dubai");
  const [importCategory, setImportCategory] = useState("software houses");
  const [searchLinks, setSearchLinks] = useState(null);

  const [page, setPage] = useState(1);
  const [leadMeta, setLeadMeta] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 50
  });

  async function api(path, options = {}) {
    const url = `${API}${path}`;

    let response;
    try {
      response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });
    } catch (error) {
      throw new Error(
        `Backend not reachable. Check VITE_API_URL in Vercel or backend URL. Current API: ${API}`
      );
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.details || `Request failed: ${response.status}`);
    }

    return data;
  }

  function notify(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 7000);
  }

  function buildLeadQuery(customPage = page) {
    const params = new URLSearchParams({
      page: String(customPage),
      limit: "50",
      country: selectedCountry,
      city: selectedCity,
      status: statusFilter,
      q: searchText
    });

    return params.toString();
  }

  async function loadLeads(customPage = page) {
    try {
      const data = await api(`/api/leads?${buildLeadQuery(customPage)}`);

      setLeads(data.items || []);
      setLeadMeta({
        total: data.total || 0,
        totalPages: data.totalPages || 1,
        page: data.page || 1,
        limit: data.limit || 50
      });
      setCounts(data.counts || {});
      setBackendWarning("");
    } catch (error) {
      console.error("Lead loading failed:", error);

      setLeads([]);
      setLeadMeta({
        total: 0,
        totalPages: 1,
        page: 1,
        limit: 50
      });
      setCounts({
        total: 0,
        readyToWhatsApp: 0,
        needsPhone: 0,
        sent: 0
      });

      setBackendWarning(
        `Could not load leads. ${safeMessageFromError(error)}`
      );
    }
  }

  async function loadBase() {
    try {
      const [profileData, logsData] = await Promise.all([
        api("/api/profile"),
        api("/api/logs")
      ]);

      setProfile(profileData || fallbackProfile);
      setLogs(Array.isArray(logsData) ? logsData : []);
      setBackendWarning("");
    } catch (error) {
      console.error("Backend connection failed:", error);

      setProfile(fallbackProfile);
      setLogs([]);
      setBackendWarning(
        `Backend connection failed. App opened in safe mode. ${safeMessageFromError(error)}`
      );
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (!profile) return;

    const timeout = setTimeout(() => {
      loadLeads(1);
      setPage(1);
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedCountry, selectedCity, statusFilter, searchText, profile]);

  useEffect(() => {
    if (!profile) return;
    loadLeads(page);
  }, [page]);

  const availableCities = countryCityMap[selectedCountry] || ["All Cities"];
  const importCities = countryCityMap[importCountry]?.filter((city) => city !== "All Cities") || [];

  function handleCountryChange(country) {
    setSelectedCountry(country);
    setSelectedCity("All Cities");
    setSelectedLead(null);
    setPage(1);
  }

  function handleImportCountryChange(country) {
    setImportCountry(country);
    const firstCity = countryCityMap[country]?.find((city) => city !== "All Cities") || "";
    setImportCity(firstCity);
  }

  async function saveProfile() {
    setLoading(true);
    try {
      const updated = await api("/api/profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      });
      setProfile(updated);
      notify("Profile saved.");
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await fetch(`${API}/api/upload/resume`, {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setProfile((prev) => ({ ...prev, resumeUrl: data.resumeUrl }));
      notify("Resume uploaded.");
      await loadBase();
    } catch (error) {
      notify(safeMessageFromError(error));
    }

    setLoading(false);
  }

  async function importCsvFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    notify("Importing CSV file. Large files may take some time...");

    const formData = new FormData();
    formData.append("csv", file);

    try {
      const response = await fetch(`${API}/api/leads/import-csv`, {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || data.details || "CSV import failed");

      notify(
        `CSV imported: ${data.imported}. Ready WhatsApp: ${data.readyToWhatsApp}. Needs phone: ${data.needsPhone}. Duplicates skipped: ${data.skippedDuplicates}.`
      );

      await loadLeads(1);
      setPage(1);
    } catch (error) {
      notify(safeMessageFromError(error));
    }

    setCsvImporting(false);
    event.target.value = "";
  }

  async function importGlobalBusinesses() {
    if (!importCity.trim() || !importCountry.trim()) {
      notify("Country and city are required.");
      return;
    }

    setImporting(true);
    notify(`Importing ${importCategory} in ${importCity}, ${importCountry}...`);

    try {
      const data = await api("/api/import/global", {
        method: "POST",
        body: JSON.stringify({
          city: importCity,
          country: importCountry,
          category: importCategory
        })
      });

      notify(
        `Imported ${data.imported} from ${data.city}, ${data.country}. Ready WhatsApp: ${data.readyToWhatsApp}. Needs phone: ${data.needsPhone}.`
      );

      setSelectedCountry(importCountry);
      setSelectedCity(importCity);
      setPage(1);
      await loadLeads(1);
    } catch (error) {
      notify(safeMessageFromError(error));
    }

    setImporting(false);
  }

  async function clearAllLeads() {
    const confirmDelete = window.confirm("This will delete all leads and logs. Continue?");
    if (!confirmDelete) return;

    setLoading(true);
    try {
      await api("/api/leads/clear-all", { method: "DELETE" });
      setSelectedLead(null);
      notify("All leads cleared.");
      await loadLeads(1);
      await loadBase();
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function addLead() {
    if (!leadForm.name.trim()) {
      notify("Business/company name is required.");
      return;
    }

    const finalLead = {
      ...leadForm,
      country: leadForm.country || selectedCountry.replace("All Countries", ""),
      city: leadForm.city || selectedCity.replace("All Cities", ""),
      location:
        leadForm.location ||
        [
          leadForm.city || selectedCity.replace("All Cities", ""),
          leadForm.country || selectedCountry.replace("All Countries", "")
        ]
          .filter(Boolean)
          .join(", ")
    };

    setLoading(true);
    try {
      await api("/api/leads", {
        method: "POST",
        body: JSON.stringify(finalLead)
      });
      setLeadForm(emptyLead);
      notify("Manual lead added.");
      await loadLeads(1);
      setPage(1);
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function deleteLead(id) {
    setLoading(true);
    try {
      await api(`/api/leads/${id}`, { method: "DELETE" });
      if (selectedLead?.id === id) setSelectedLead(null);
      notify("Lead deleted.");
      await loadLeads(page);
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function updateLead(id, data) {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
      });
      setSelectedLead(updated);
      notify("Lead updated.");
      await loadLeads(page);
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function generateMessage(lead) {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${lead.id}/generate-message`, {
        method: "POST",
        body: JSON.stringify({ goal })
      });

      setSelectedLead(updated);
      notify("Message generated.");
      await loadLeads(page);
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function markSent(lead, channel = "WhatsApp") {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${lead.id}/mark-sent`, {
        method: "POST",
        body: JSON.stringify({ channel })
      });
      setSelectedLead(updated);
      notify("Marked as sent.");
      await loadLeads(page);
      await loadBase();
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function createSearchLinks() {
    setLoading(true);
    try {
      const data = await api("/api/search-links", {
        method: "POST",
        body: JSON.stringify({
          city: importCity,
          country: importCountry,
          category: importCategory
        })
      });
      setSearchLinks(data);
      notify("Search links ready.");
    } catch (error) {
      notify(safeMessageFromError(error));
    }
    setLoading(false);
  }

  async function copyMessage() {
    if (!selectedLead?.lastMessage) return;
    await navigator.clipboard.writeText(selectedLead.lastMessage);
    notify("Message copied.");
  }

  const activeWhatsAppUrl =
    selectedLead?.whatsappUrl || makeWhatsAppUrl(selectedLead?.phone, selectedLead?.lastMessage);

  const tabs = [
    { id: "dashboard", label: "Command", icon: LayoutDashboard },
    { id: "profile", label: "Profile", icon: User },
    { id: "global", label: "Global Finder", icon: Globe2 },
    { id: "leads", label: "CRM", icon: Building2 },
    { id: "studio", label: "AI Studio", icon: Brain },
    { id: "logs", label: "Logs", icon: Zap }
  ];

  if (!profile) {
    return (
      <div className="loading-screen">
        <Loader2 className="spin" size={46} />
        <h1>NexaReach Global AI</h1>
        <p>Starting app...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Rocket size={24} />
          </div>
          <div>
            <h1>NexaReach Global AI</h1>
            <p>Fast Outreach CRM</p>
          </div>
        </div>

        <nav className="nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "nav-btn active" : "nav-btn"}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-card">
          <Sparkles size={20} />
          <h3>Active API</h3>
          <p>{API}</p>
        </div>

        <div className="side-card">
          <Globe2 size={20} />
          <h3>Fast Mode</h3>
          <p>
            Showing 50 leads per page. Active: {selectedCountry} / {selectedCity}
          </p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Paginated Global Outreach</p>
            <h2>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
          </div>

          <div className="global-filter">
            <label>
              <span>Country</span>
              <select value={selectedCountry} onChange={(e) => handleCountryChange(e.target.value)}>
                {Object.keys(countryCityMap).map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </label>

            <label>
              <span>City</span>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedLead(null);
                  setPage(1);
                }}
              >
                {availableCities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>

            <button className="ghost-btn" onClick={() => loadLeads(page)}>
              <RefreshCcw size={17} />
              Refresh
            </button>
          </div>
        </header>

        {backendWarning && (
          <div className="notice danger-notice">
            {backendWarning}
          </div>
        )}

        {notice && <div className="notice">{notice}</div>}

        {activeTab === "dashboard" && (
          <section className="page">
            <div className="hero-card global-hero">
              <div>
                <p className="eyebrow">NexaReach Global AI</p>
                <h1>Fast global outreach without loading crashes.</h1>
                <p>
                  This version opens even if the backend is unreachable. Check the API shown in the sidebar if you see connection warnings.
                </p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => setActiveTab("global")}>
                    <Target size={18} />
                    Import Leads
                  </button>
                  <button className="secondary-btn" onClick={() => setActiveTab("leads")}>
                    <Building2 size={18} />
                    Open CRM
                  </button>
                </div>
              </div>

              <div className="orb-wrap">
                <div className="orb"></div>
                <div className="orbit one"></div>
                <div className="orbit two"></div>
                <div className="orbit three"></div>
              </div>
            </div>

            <div className="stats-grid">
              <Stat title="Filtered Leads" value={counts.total || 0} icon={Building2} />
              <Stat title="Ready WhatsApp" value={counts.readyToWhatsApp || 0} icon={MessageCircle} />
              <Stat title="Needs Phone" value={counts.needsPhone || 0} icon={Phone} />
              <Stat title="Sent" value={counts.sent || 0} icon={Send} />
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="page">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Your global profile</p>
                  <h3>Profile Vault</h3>
                </div>
                <button className="primary-btn" onClick={saveProfile} disabled={loading}>
                  <Save size={17} />
                  Save
                </button>
              </div>

              <div className="form-grid">
                <Input label="Full Name" value={profile.fullName} onChange={(v) => setProfile({ ...profile, fullName: v })} />
                <Input label="Title" value={profile.title} onChange={(v) => setProfile({ ...profile, title: v })} />
                <Input label="Email" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} />
                <Input label="Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} />
                <Input label="WhatsApp" value={profile.whatsapp} onChange={(v) => setProfile({ ...profile, whatsapp: v })} />
                <Input label="Location" value={profile.location} onChange={(v) => setProfile({ ...profile, location: v })} />
                <Input label="Portfolio Link" value={profile.portfolio} onChange={(v) => setProfile({ ...profile, portfolio: v })} />
                <Input label="LinkedIn Link" value={profile.linkedin} onChange={(v) => setProfile({ ...profile, linkedin: v })} />
                <Input label="GitHub Link" value={profile.github} onChange={(v) => setProfile({ ...profile, github: v })} />
              </div>

              <Textarea label="Skills" value={profile.skills} onChange={(v) => setProfile({ ...profile, skills: v })} />
              <Textarea label="Projects" value={profile.projects} onChange={(v) => setProfile({ ...profile, projects: v })} />
              <Textarea label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} />

              <div className="upload-box">
                <div>
                  <h4>Resume</h4>
                  <p>{profile.resumeUrl || "No resume uploaded yet."}</p>
                </div>
                <label className="upload-btn">
                  <Upload size={18} />
                  Upload Resume
                  <input hidden type="file" accept=".pdf,.doc,.docx" onChange={uploadResume} />
                </label>
              </div>
            </div>
          </section>
        )}

        {activeTab === "global" && (
          <section className="page two-col">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Import by country/city</p>
                  <h3>Global Lead Finder</h3>
                </div>
              </div>

              <label className="field">
                <span>Import Country</span>
                <select value={importCountry} onChange={(e) => handleImportCountryChange(e.target.value)}>
                  {Object.keys(countryCityMap)
                    .filter((country) => country !== "All Countries")
                    .map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                </select>
              </label>

              <label className="field">
                <span>Import City</span>
                <select value={importCity} onChange={(e) => setImportCity(e.target.value)}>
                  {importCities.map((city) => (
                    <option key={city}>{city}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Category</span>
                <select value={importCategory} onChange={(e) => setImportCategory(e.target.value)}>
                  {categories.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <button className="primary-btn full" onClick={importGlobalBusinesses} disabled={importing}>
                {importing ? <Loader2 className="spin" size={18} /> : <Globe2 size={18} />}
                {importing ? "Importing Leads..." : "Import Country/City Leads"}
              </button>

              <label className="secondary-btn full">
                <Upload size={18} />
                {csvImporting ? "Importing CSV..." : "Import CSV File"}
                <input hidden type="file" accept=".csv" onChange={importCsvFile} />
              </label>

              <button className="ghost-btn full" onClick={createSearchLinks}>
                <Search size={18} />
                Create Search Links
              </button>

              <button className="danger-btn full" onClick={clearAllLeads} disabled={loading}>
                <Trash2 size={18} />
                Delete All Leads
              </button>

              {searchLinks && (
                <div className="search-links">
                  <a href={searchLinks.maps} target="_blank" rel="noreferrer">
                    <MapPin size={17} />
                    Google Maps
                    <ExternalLink size={14} />
                  </a>
                  <a href={searchLinks.google} target="_blank" rel="noreferrer">
                    <Globe2 size={17} />
                    Google Search
                    <ExternalLink size={14} />
                  </a>
                  <a href={searchLinks.facebook} target="_blank" rel="noreferrer">
                    <LinkIcon size={17} />
                    Facebook Pages
                    <ExternalLink size={14} />
                  </a>
                  <a href={searchLinks.linkedin} target="_blank" rel="noreferrer">
                    <LinkIcon size={17} />
                    LinkedIn Companies
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <div className="panel">
              <h3>Add Manual Lead</h3>

              <div className="form-grid single">
                <Input label="Business / Company Name" value={leadForm.name} onChange={(v) => setLeadForm({ ...leadForm, name: v })} />
                <Input label="Category" value={leadForm.category} onChange={(v) => setLeadForm({ ...leadForm, category: v })} />
                <Input label="Country" value={leadForm.country} onChange={(v) => setLeadForm({ ...leadForm, country: v })} />
                <Input label="City" value={leadForm.city} onChange={(v) => setLeadForm({ ...leadForm, city: v })} />
                <Input label="Phone / WhatsApp" value={leadForm.phone} onChange={(v) => setLeadForm({ ...leadForm, phone: v })} />
                <Input label="Email" value={leadForm.email} onChange={(v) => setLeadForm({ ...leadForm, email: v })} />
                <Input label="Website" value={leadForm.website} onChange={(v) => setLeadForm({ ...leadForm, website: v })} />
                <Input label="Address" value={leadForm.address} onChange={(v) => setLeadForm({ ...leadForm, address: v })} />
              </div>

              <Textarea label="Notes" value={leadForm.notes} onChange={(v) => setLeadForm({ ...leadForm, notes: v })} />

              <button className="primary-btn full" onClick={addLead}>
                <Plus size={18} />
                Save Lead
              </button>
            </div>
          </section>
        )}

        {activeTab === "leads" && (
          <section className="page">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Fast CRM</p>
                  <h3>
                    Leads: {selectedCountry} / {selectedCity}
                  </h3>
                  <p className="muted-line">
                    Showing page {leadMeta.page} of {leadMeta.totalPages} · Total filtered: {leadMeta.total}
                  </p>
                </div>

                <div className="top-actions">
                  <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option>All</option>
                    <option>Ready to WhatsApp</option>
                    <option>Needs Phone</option>
                    <option>Sent</option>
                    <option>Interested</option>
                    <option>Follow Up</option>
                  </select>

                  <input
                    className="search-input"
                    placeholder="Search filtered leads..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  />
                </div>
              </div>

              <LeadGrid
                leads={leads}
                onSelect={(lead) => {
                  setSelectedLead(lead);
                  setActiveTab("studio");
                }}
                onGenerate={(lead) => {
                  setSelectedLead(lead);
                  setActiveTab("studio");
                  generateMessage(lead);
                }}
                onDelete={deleteLead}
              />

              <Pagination page={leadMeta.page} totalPages={leadMeta.totalPages} setPage={setPage} />
            </div>
          </section>
        )}

        {activeTab === "studio" && (
          <section className="page studio-layout">
            <div className="panel lead-list-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Fast target list</p>
                  <h3>{selectedCountry} / {selectedCity}</h3>
                  <p className="muted-line">Page {leadMeta.page} of {leadMeta.totalPages}</p>
                </div>
              </div>

              <input
                className="search-input full-search"
                placeholder="Search target..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <select className="search-input full-search" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Ready to WhatsApp</option>
                <option>Needs Phone</option>
                <option>Sent</option>
                <option>Interested</option>
                <option>Follow Up</option>
              </select>

              <div className="picker-list">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    className={selectedLead?.id === lead.id ? "picker active" : "picker"}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <Building2 size={16} />
                    <span>{lead.name}</span>
                  </button>
                ))}
              </div>

              <Pagination page={leadMeta.page} totalPages={leadMeta.totalPages} setPage={setPage} compact />
            </div>

            <div className="panel message-panel">
              {!selectedLead ? (
                <div className="empty big-empty">
                  <Brain size={50} />
                  <h3>Select a lead</h3>
                  <p>Only 50 leads are loaded at a time for speed.</p>
                </div>
              ) : (
                <>
                  <div className="section-head studio-head">
                    <div>
                      <p className="eyebrow">{selectedLead.category}</p>
                      <h3>{selectedLead.name}</h3>
                    </div>

                    <div className="top-actions">
                      <select className="search-input" value={goal} onChange={(e) => setGoal(e.target.value)}>
                        <option value="business">business</option>
                        <option value="job">job</option>
                      </select>

                      <button className="primary-btn" onClick={() => generateMessage(selectedLead)} disabled={loading}>
                        {loading ? <Loader2 className="spin" size={17} /> : <Wand2 size={17} />}
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="lead-detail-strip">
                    <span><Phone size={14} /> {selectedLead.phone || "No phone"}</span>
                    <span><Mail size={14} /> {selectedLead.email || "No email"}</span>
                    <span><MapPin size={14} /> {selectedLead.location || "Global"}</span>
                  </div>

                  <div className="message-box">
                    {selectedLead.lastMessage || "No message generated yet. Click Generate."}
                  </div>

                  <div className="studio-actions">
                    {activeWhatsAppUrl ? (
                      <a className="whatsapp-btn" href={activeWhatsAppUrl} target="_blank" rel="noreferrer">
                        <MessageCircle size={18} />
                        Open WhatsApp
                      </a>
                    ) : (
                      <button className="disabled-btn" disabled>
                        <MessageCircle size={18} />
                        Add Phone First
                      </button>
                    )}

                    <button className="secondary-btn" onClick={copyMessage} disabled={!selectedLead.lastMessage}>
                      <Copy size={18} />
                      Copy Message
                    </button>

                    <button className="ghost-btn" onClick={() => markSent(selectedLead, "WhatsApp")}>
                      <Send size={18} />
                      Mark Sent
                    </button>

                    <button className="ghost-btn" onClick={() => updateLead(selectedLead.id, { status: "Follow Up" })}>
                      <RefreshCcw size={18} />
                      Follow Up
                    </button>

                    <button className="ghost-btn" onClick={() => updateLead(selectedLead.id, { status: "Interested" })}>
                      <CheckCircle2 size={18} />
                      Interested
                    </button>
                  </div>

                  <div className="edit-lead-box">
                    <h4>Edit selected lead details</h4>
                    <div className="form-grid">
                      <Input label="Phone" value={selectedLead.phone} onChange={(v) => setSelectedLead({ ...selectedLead, phone: v })} />
                      <Input label="Email" value={selectedLead.email} onChange={(v) => setSelectedLead({ ...selectedLead, email: v })} />
                      <Input label="Website" value={selectedLead.website} onChange={(v) => setSelectedLead({ ...selectedLead, website: v })} />
                      <Input label="Address" value={selectedLead.address} onChange={(v) => setSelectedLead({ ...selectedLead, address: v })} />
                    </div>
                    <button className="secondary-btn" onClick={() => updateLead(selectedLead.id, selectedLead)}>
                      <Save size={17} />
                      Save Lead Details
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === "logs" && (
          <section className="page">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">History</p>
                  <h3>Activity Logs</h3>
                </div>
              </div>

              <div className="logs">
                {logs.map((log) => (
                  <div className="log-row" key={log.id}>
                    <div>
                      <h4>{log.action}</h4>
                      <p>{log.leadName} · {log.channel} · {log.location || "Global"}</p>
                    </div>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="empty">
                    <Zap size={44} />
                    <h3>No activity yet</h3>
                    <p>Sent logs will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function LeadGrid({ leads, onSelect, onGenerate, onDelete }) {
  if (!leads.length) {
    return (
      <div className="empty">
        <Building2 size={44} />
        <h3>No leads found</h3>
        <p>Change filters, check backend connection, or import leads from Global Finder.</p>
      </div>
    );
  }

  return (
    <div className="lead-grid">
      {leads.map((lead) => (
        <div className="lead-card" key={lead.id}>
          <div onClick={() => onSelect(lead)} className="lead-click">
            <div className="lead-top">
              <div className="lead-icon">
                <Building2 size={22} />
              </div>
              <div>
                <h4>{lead.name}</h4>
                <p>{lead.category}</p>
              </div>
            </div>

            <div className="badges">
              <span>{lead.status}</span>
              <span>{lead.source}</span>
              <span>{lead.country || "Global"}</span>
              <span>{lead.city || "All Cities"}</span>
            </div>

            <p className="small-line">
              <MapPin size={13} /> {lead.address || lead.location}
            </p>
            <p className="small-line">
              <Phone size={13} /> {lead.phone || "No phone in data"}
            </p>
            <p className="small-line">
              <Mail size={13} /> {lead.email || "No email in data"}
            </p>
          </div>

          <div className="card-actions">
            <button className="mini-btn" onClick={() => onGenerate(lead)}>
              <Wand2 size={15} />
              Generate
            </button>
            <button className="danger-btn" onClick={() => onDelete(lead.id)}>
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, setPage, compact = false }) {
  return (
    <div className={compact ? "pagination compact" : "pagination"}>
      <button
        className="ghost-btn"
        disabled={page <= 1}
        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
      >
        Prev
      </button>

      <span>
        Page {page} / {totalPages}
      </span>

      <button
        className="ghost-btn"
        disabled={page >= totalPages}
        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
      >
        Next
      </button>
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
      </div>
      <Icon size={28} />
    </div>
  );
}

function Input({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Textarea({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}