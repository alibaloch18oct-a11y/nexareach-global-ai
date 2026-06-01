import React, { useEffect, useState } from "react";
import {
  Brain,
  Building2,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  LayoutDashboard,
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
  Pakistan: ["Karachi", "Lahore", "Islamabad", "Hyderabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sukkur"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Dammam", "Makkah", "Madinah", "Khobar", "Tabuk"],
  Qatar: ["Doha", "Al Rayyan", "Al Wakrah", "Umm Salal"],
  Malaysia: ["Kuala Lumpur", "George Town", "Johor Bahru", "Shah Alam", "Petaling Jaya"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Glasgow"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Dallas", "Miami", "San Francisco"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa"],
  Australia: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide"],
  Germany: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
  France: ["Paris", "Lyon", "Marseille", "Toulouse"],
  Italy: ["Rome", "Milan", "Naples", "Turin"],
  Spain: ["Madrid", "Barcelona", "Valencia", "Seville"],
  Netherlands: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"]
};

const filterCountries = ["All Countries", ...Object.keys(countryCityMap)];
const discoveryCountries = Object.keys(countryCityMap);

const statuses = [
  "All",
  "New",
  "Message Generated",
  "Sent",
  "Replied",
  "Interested",
  "Demo Booked",
  "Follow Up",
  "Closed Won",
  "Lost",
  "Not Interested",
  "Ready to WhatsApp",
  "Needs Phone"
];

const businessCategories = [
  "business",
  "restaurants",
  "cafes",
  "software houses",
  "IT companies",
  "company offices",
  "shops",
  "mobile shops",
  "electronics shops",
  "clinics",
  "hospitals",
  "pharmacies",
  "schools",
  "hotels",
  "real estate agencies",
  "travel agencies",
  "salons",
  "repair shops",
  "law offices",
  "accounting offices",
  "fuel stations",
  "gyms"
];

const messageModes = [
  ["short_whatsapp", "Short WhatsApp"],
  ["international_formal", "International Formal"],
  ["pakistani_friendly", "Pakistani Friendly"],
  ["email_pitch", "Email Pitch"],
  ["follow_up", "Follow-up"],
  ["final_reminder", "Final Reminder"],
  ["call_script", "Call Script"]
];

const emptyLead = {
  businessName: "",
  contactPerson: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  instagram: "",
  facebook: "",
  linkedin: "",
  country: "",
  city: "",
  category: "",
  businessSize: "",
  source: "Manual",
  notes: "",
  status: "New",
  estimatedDealValue: 0,
  conversationNotes: ""
};

function whatsappUrl(phone, message) {
  if (!phone || !message) return "";
  let clean = String(phone).replace(/[^\d]/g, "");
  if (clean.startsWith("00")) clean = clean.slice(2);
  if (clean.startsWith("0")) clean = "92" + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [leads, setLeads] = useState([]);
  const [leadMeta, setLeadMeta] = useState({ total: 0, page: 1, totalPages: 1, limit: 50 });
  const [counts, setCounts] = useState({});
  const [logs, setLogs] = useState([]);
  const [followups, setFollowups] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadForm, setLeadForm] = useState(emptyLead);
  const [replyText, setReplyText] = useState("");
  const [replyResult, setReplyResult] = useState(null);
  const [messageMode, setMessageMode] = useState("short_whatsapp");

  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  const [notice, setNotice] = useState("");
  const [backendWarning, setBackendWarning] = useState("");
  const [loading, setLoading] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  const [discoveryCountry, setDiscoveryCountry] = useState("United Arab Emirates");
  const [discoveryCity, setDiscoveryCity] = useState("Dubai");
  const [discoveryCategory, setDiscoveryCategory] = useState("restaurants");
  const [discoveryLimit, setDiscoveryLimit] = useState(150);
  const [discoveredLeads, setDiscoveredLeads] = useState([]);
  const [discoveryReport, setDiscoveryReport] = useState(null);
  const [selectedDiscoveryIds, setSelectedDiscoveryIds] = useState({});
  const [discoveryBusyText, setDiscoveryBusyText] = useState("");

  async function api(path, options = {}) {
    try {
      const res = await fetch(`${API}${path}`, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || `Request failed ${res.status}`);
      return data;
    } catch (error) {
      throw new Error(`${error.message}. Current API: ${API}`);
    }
  }

  function notify(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 6500);
  }

  function handleFilterCountryChange(country) {
    setSelectedCountry(country);
    setSelectedCity("All Cities");
    setPage(1);
  }

  function handleDiscoveryCountryChange(country) {
    setDiscoveryCountry(country);
    setDiscoveryCity(countryCityMap[country]?.[0] || "");
    setDiscoveredLeads([]);
    setDiscoveryReport(null);
    setSelectedDiscoveryIds({});
  }

  function query(customPage = page) {
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

  async function loadBase() {
    try {
      const [profileData, productData, dashData, logsData, followupData] = await Promise.all([
        api("/api/profile"),
        api("/api/products"),
        api("/api/dashboard"),
        api("/api/logs"),
        api("/api/followups")
      ]);

      setProfile(profileData);
      setProducts(productData);
      setDashboard(dashData);
      setLogs(logsData);
      setFollowups(followupData);
      setBackendWarning("");
    } catch (error) {
      setBackendWarning(error.message);
      setProfile({
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
        skills: "",
        projects: "",
        bio: ""
      });
    }
  }

  async function loadLeads(customPage = page) {
    try {
      const data = await api(`/api/leads?${query(customPage)}`);
      setLeads(data.items || []);
      setLeadMeta({
        total: data.total || 0,
        page: data.page || 1,
        totalPages: data.totalPages || 1,
        limit: data.limit || 50
      });
      setCounts(data.counts || {});
      setBackendWarning("");
    } catch (error) {
      setBackendWarning(error.message);
      setLeads([]);
      setLeadMeta({ total: 0, page: 1, totalPages: 1, limit: 50 });
      setCounts({});
    }
  }

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadLeads(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCountry, selectedCity, statusFilter, searchText]);

  useEffect(() => {
    loadLeads(page);
  }, [page]);

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
      notify(error.message);
    }
    setLoading(false);
  }

  async function addLead() {
    if (!leadForm.businessName.trim()) {
      notify("Business name is required.");
      return;
    }

    setLoading(true);
    try {
      const created = await api("/api/leads", {
        method: "POST",
        body: JSON.stringify(leadForm)
      });

      setSelectedLead(created);
      setLeadForm(emptyLead);
      notify("Lead saved and scored.");
      await loadLeads(1);
      await loadBase();
      setActiveTab("studio");
    } catch (error) {
      notify(error.message);
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
      await loadBase();
    } catch (error) {
      notify(error.message);
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
      await loadBase();
    } catch (error) {
      notify(error.message);
    }
    setLoading(false);
  }

  async function scoreLead(lead) {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${lead.id}/score`, { method: "POST" });
      setSelectedLead(updated);
      notify(`Lead scored: ${updated.leadScore}/100 — ${updated.recommendedProduct}`);
      await loadLeads(page);
      await loadBase();
    } catch (error) {
      notify(error.message);
    }
    setLoading(false);
  }

  async function generateMessage(lead, mode = messageMode) {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${lead.id}/generate-message`, {
        method: "POST",
        body: JSON.stringify({ mode })
      });

      setSelectedLead(updated);
      notify("Message generated.");
      await loadLeads(page);
    } catch (error) {
      notify(error.message);
    }
    setLoading(false);
  }

  async function markSent(lead) {
    setLoading(true);
    try {
      const updated = await api(`/api/leads/${lead.id}/mark-sent`, {
        method: "POST",
        body: JSON.stringify({ channel: "WhatsApp" })
      });

      setSelectedLead(updated);
      notify("Marked as sent. Follow-up scheduled.");
      await loadLeads(page);
      await loadBase();
    } catch (error) {
      notify(error.message);
    }
    setLoading(false);
  }

  async function analyzeReply() {
    if (!selectedLead || !replyText.trim()) return;

    setLoading(true);
    try {
      const result = await api(`/api/leads/${selectedLead.id}/analyze-reply`, {
        method: "POST",
        body: JSON.stringify({ reply: replyText })
      });

      setReplyResult(result);
      setSelectedLead(result.lead);
      notify("Reply analyzed.");
      await loadLeads(page);
      await loadBase();
    } catch (error) {
      notify(error.message);
    }
    setLoading(false);
  }

  async function copyMessage() {
    if (!selectedLead?.lastMessage) return;
    await navigator.clipboard.writeText(selectedLead.lastMessage);
    notify("Message copied.");
  }

  async function importCsv(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvImporting(true);
    const form = new FormData();
    form.append("csv", file);

    try {
      const res = await fetch(`${API}/api/leads/import-csv`, {
        method: "POST",
        body: form
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || "CSV import failed");

      notify(`Imported ${data.imported}. Skipped duplicates: ${data.skippedDuplicates}.`);
      await loadLeads(1);
      await loadBase();
    } catch (error) {
      notify(error.message);
    }

    setCsvImporting(false);
    event.target.value = "";
  }

  async function runDiscoverySearch() {
    if (!discoveryCountry.trim() || !discoveryCity.trim() || !discoveryCategory.trim()) {
      notify("Country, city and business category are required.");
      return;
    }

    setLoading(true);
    setDiscoveryBusyText(`Searching ${discoveryCategory} in ${discoveryCity}, ${discoveryCountry}...`);
    setDiscoveryReport(null);
    setDiscoveredLeads([]);
    setSelectedDiscoveryIds({});

    try {
      const data = await api("/api/discovery/search", {
        method: "POST",
        body: JSON.stringify({
          country: discoveryCountry,
          city: discoveryCity,
          category: discoveryCategory,
          limit: Number(discoveryLimit || 150)
        })
      });

      const leads = data.leads || [];
      setDiscoveredLeads(leads);
      setDiscoveryReport(data);

      const selected = {};
      leads.forEach((lead) => {
        selected[lead.id] = true;
      });
      setSelectedDiscoveryIds(selected);

      notify(`Found ${data.found} ${discoveryCategory} leads in ${data.city}, ${data.country}.`);
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
    setDiscoveryBusyText("");
  }

  async function importDiscoveredLeads(onlySelected = true) {
    const leadsToImport = onlySelected
      ? discoveredLeads.filter((lead) => selectedDiscoveryIds[lead.id])
      : discoveredLeads;

    if (!leadsToImport.length) {
      notify("No discovered leads selected.");
      return;
    }

    setLoading(true);
    setDiscoveryBusyText(`Importing ${leadsToImport.length} selected businesses...`);

    try {
      const data = await api("/api/discovery/import", {
        method: "POST",
        body: JSON.stringify({ leads: leadsToImport })
      });

      notify(`Imported ${data.imported}. Skipped duplicates: ${data.skippedDuplicates}.`);

      setSelectedCountry(discoveryCountry);
      setSelectedCity(discoveryCity);
      setStatusFilter("All");
      setPage(1);

      await loadLeads(1);
      await loadBase();
      setActiveTab("leads");
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
    setDiscoveryBusyText("");
  }

  async function searchAndImportSelectedBusiness() {
    if (!discoveryCountry.trim() || !discoveryCity.trim() || !discoveryCategory.trim()) {
      notify("Country, city and business category are required.");
      return;
    }

    setLoading(true);
    setDiscoveryBusyText(`Finding and importing all ${discoveryCategory} in ${discoveryCity}, ${discoveryCountry}...`);

    try {
      const found = await api("/api/discovery/search", {
        method: "POST",
        body: JSON.stringify({
          country: discoveryCountry,
          city: discoveryCity,
          category: discoveryCategory,
          limit: Number(discoveryLimit || 150)
        })
      });

      const foundLeads = found.leads || [];
      setDiscoveredLeads(foundLeads);
      setDiscoveryReport(found);

      if (!foundLeads.length) {
        notify(`No ${discoveryCategory} found in ${discoveryCity}, ${discoveryCountry}.`);
        setLoading(false);
        setDiscoveryBusyText("");
        return;
      }

      const imported = await api("/api/discovery/import", {
        method: "POST",
        body: JSON.stringify({ leads: foundLeads })
      });

      notify(
        `Done. Found ${found.found}. Imported ${imported.imported}. Skipped duplicates: ${imported.skippedDuplicates}.`
      );

      setSelectedCountry(discoveryCountry);
      setSelectedCity(discoveryCity);
      setStatusFilter("All");
      setPage(1);

      await loadLeads(1);
      await loadBase();
      setActiveTab("leads");
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
    setDiscoveryBusyText("");
  }

  async function runDiscoveryCampaign() {
    if (!discoveryCountry.trim() || !discoveryCity.trim()) {
      notify("Country and city are required.");
      return;
    }

    const campaignCategories = [
      "restaurants",
      "shops",
      "clinics",
      "schools",
      "hotels",
      "real estate agencies",
      "travel agencies",
      "salons"
    ];

    setLoading(true);
    setDiscoveryBusyText(`Running multi-category campaign in ${discoveryCity}, ${discoveryCountry}...`);

    try {
      const data = await api("/api/discovery/campaign", {
        method: "POST",
        body: JSON.stringify({
          country: discoveryCountry,
          city: discoveryCity,
          categories: campaignCategories
        })
      });

      setDiscoveryReport({
        ...data,
        found: data.report?.reduce((sum, item) => sum + Number(item.found || 0), 0) || 0,
        leads: []
      });

      notify("Campaign discovery completed.");

      setSelectedCountry(discoveryCountry);
      setSelectedCity(discoveryCity);
      setStatusFilter("All");
      setPage(1);

      await loadLeads(1);
      await loadBase();
      setActiveTab("leads");
    } catch (error) {
      notify(error.message);
    }

    setLoading(false);
    setDiscoveryBusyText("");
  }

  function toggleAllDiscovered(value) {
    const selected = {};
    discoveredLeads.forEach((lead) => {
      selected[lead.id] = value;
    });
    setSelectedDiscoveryIds(selected);
  }

  const tabs = [
    ["dashboard", "Command", LayoutDashboard],
    ["discover", "Discover", Globe2],
    ["leads", "Lead CRM", Building2],
    ["add", "Add/Import", Plus],
    ["studio", "AI Studio", Brain],
    ["followups", "Follow-ups", Target],
    ["products", "Products", Sparkles],
    ["profile", "Profile", User],
    ["logs", "Logs", Zap]
  ];

  const openWhatsapp = selectedLead
    ? whatsappUrl(selectedLead.whatsapp || selectedLead.phone, selectedLead.lastMessage)
    : "";

  const filteredCityOptions =
    selectedCountry === "All Countries"
      ? ["All Cities"]
      : ["All Cities", ...(countryCityMap[selectedCountry] || [])];

  const discoveryCityOptions = countryCityMap[discoveryCountry] || [];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Rocket size={24} />
          </div>
          <div>
            <h1>NexaReach AI Pro</h1>
            <p>Global AutoClient Hunter</p>
          </div>
        </div>

        <nav className="nav">
          {tabs.map(([id, label, Icon]) => (
            <button
              key={id}
              className={activeTab === id ? "nav-btn active" : "nav-btn"}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-card">
          <Globe2 size={20} />
          <h3>Discovery Ready</h3>
          <p>Country → City → Business → Import all selected leads.</p>
        </div>

        <div className="side-card">
          <Sparkles size={20} />
          <h3>API</h3>
          <p>{API}</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Global AI Sales Command Center</p>
            <h2>{tabs.find((tab) => tab[0] === activeTab)?.[1]}</h2>
          </div>

          <div className="global-filter">
            <label>
              <span>Country</span>
              <select value={selectedCountry} onChange={(e) => handleFilterCountryChange(e.target.value)}>
                {filterCountries.map((country) => (
                  <option key={country}>{country}</option>
                ))}
              </select>
            </label>

            <label>
              <span>City</span>
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
                {filteredCityOptions.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </label>

            <button className="ghost-btn" onClick={() => { loadBase(); loadLeads(page); }}>
              <RefreshCcw size={17} />
              Refresh
            </button>
          </div>
        </header>

        {backendWarning && <div className="notice danger-notice">{backendWarning}</div>}
        {notice && <div className="notice">{notice}</div>}

        {activeTab === "dashboard" && (
          <section className="page">
            <div className="hero-card">
              <div>
                <p className="eyebrow">AI Daily Sales Mission</p>
                <h1>NexaReach AI Pro — Global AutoClient Hunter</h1>
                <p>
                  {dashboard?.mission ||
                    "Find public leads, score them, match products, generate messages, and follow up professionally."}
                </p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => setActiveTab("discover")}>
                    <Globe2 size={18} />
                    Discover Leads
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
              <Stat title="Total Leads" value={dashboard?.total || counts.total || 0} icon={Building2} />
              <Stat title="Hot Leads" value={dashboard?.hot || 0} icon={Target} />
              <Stat title="Interested" value={dashboard?.interested || 0} icon={CheckCircle2} />
              <Stat title="Estimated Revenue" value={dashboard?.estimatedRevenue || 0} icon={Zap} />
            </div>
          </section>
        )}

        {activeTab === "discover" && (
          <section className="page two-col">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Fixed Discover Flow</p>
                  <h3>Select Country, City and Business</h3>
                </div>
              </div>

              <div className="discovery-flow">
                <label className="field">
                  <span>1. Select Country</span>
                  <select value={discoveryCountry} onChange={(e) => handleDiscoveryCountryChange(e.target.value)}>
                    {discoveryCountries.map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>2. Select City</span>
                  <select value={discoveryCity} onChange={(e) => setDiscoveryCity(e.target.value)}>
                    {discoveryCityOptions.map((city) => (
                      <option key={city}>{city}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>3. Select Business Type</span>
                  <select value={discoveryCategory} onChange={(e) => setDiscoveryCategory(e.target.value)}>
                    {businessCategories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Search Limit</span>
                  <select value={discoveryLimit} onChange={(e) => setDiscoveryLimit(Number(e.target.value))}>
                    <option value={50}>50 businesses</option>
                    <option value={100}>100 businesses</option>
                    <option value={150}>150 businesses</option>
                    <option value={250}>250 businesses</option>
                  </select>
                </label>
              </div>

              <div className="discovery-summary-box">
                <p>
                  Selected:
                  <b> {discoveryCategory}</b> in
                  <b> {discoveryCity}</b>,
                  <b> {discoveryCountry}</b>
                </p>
              </div>

              <button className="primary-btn full" onClick={searchAndImportSelectedBusiness} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <Rocket size={18} />}
                Find & Import All Selected Businesses
              </button>

              <button className="secondary-btn full" onClick={runDiscoverySearch} disabled={loading}>
                {loading ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
                Search First / Preview Before Import
              </button>

              <button className="ghost-btn full" onClick={runDiscoveryCampaign} disabled={loading}>
                <Globe2 size={18} />
                Import Multiple Categories For This City
              </button>

              {discoveryBusyText && (
                <div className="notice">
                  {discoveryBusyText}
                </div>
              )}

              {discoveryReport && (
                <div className="ai-box">
                  <h4>Discovery Report</h4>
                  <p><b>Country:</b> {discoveryReport.country}</p>
                  <p><b>City:</b> {discoveryReport.city}</p>
                  <p><b>Category:</b> {discoveryReport.category || "Campaign"}</p>
                  <p><b>Found:</b> {discoveryReport.found}</p>
                  {discoveryReport.location && <p><b>Location:</b> {discoveryReport.location}</p>}
                  {discoveryReport.report && (
                    <div>
                      {discoveryReport.report.map((item) => (
                        <p key={item.category}>
                          <b>{item.category}:</b> found {item.found}, imported {item.imported}, skipped {item.skippedDuplicates}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Preview Results</p>
                  <h3>Discovered Businesses</h3>
                  <p className="muted-line">{discoveredLeads.length} businesses found</p>
                </div>

                <div className="top-actions">
                  <button className="ghost-btn" onClick={() => toggleAllDiscovered(true)} disabled={!discoveredLeads.length}>
                    Select All
                  </button>
                  <button className="ghost-btn" onClick={() => toggleAllDiscovered(false)} disabled={!discoveredLeads.length}>
                    Unselect All
                  </button>
                  <button className="primary-btn" onClick={() => importDiscoveredLeads(true)} disabled={!discoveredLeads.length || loading}>
                    <Save size={17} />
                    Import Selected
                  </button>
                </div>
              </div>

              <div className="discovery-list">
                {discoveredLeads.map((lead) => (
                  <div className="discovery-card" key={lead.id}>
                    <label className="discovery-check">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedDiscoveryIds[lead.id])}
                        onChange={(e) =>
                          setSelectedDiscoveryIds({
                            ...selectedDiscoveryIds,
                            [lead.id]: e.target.checked
                          })
                        }
                      />
                      <span>{lead.businessName}</span>
                    </label>

                    <div className="badges">
                      <span>{lead.category}</span>
                      <span>{lead.leadScore}/100</span>
                      <span>{lead.recommendedProduct}</span>
                    </div>

                    <p className="small-line"><MapPin size={13} /> {lead.notes}</p>
                    <p className="small-line"><Phone size={13} /> {lead.whatsapp || lead.phone || "No phone in public data"}</p>
                    <p className="small-line"><Mail size={13} /> {lead.email || "No email in public data"}</p>

                    {lead.enrichmentLinks && (
                      <div className="enrichment-row">
                        <a href={lead.enrichmentLinks.google} target="_blank" rel="noreferrer">Google <ExternalLink size={12} /></a>
                        <a href={lead.enrichmentLinks.maps} target="_blank" rel="noreferrer">Maps <ExternalLink size={12} /></a>
                        <a href={lead.enrichmentLinks.facebook} target="_blank" rel="noreferrer">Facebook <ExternalLink size={12} /></a>
                        <a href={lead.enrichmentLinks.linkedin} target="_blank" rel="noreferrer">LinkedIn <ExternalLink size={12} /></a>
                      </div>
                    )}
                  </div>
                ))}

                {!discoveredLeads.length && (
                  <div className="empty">
                    <Globe2 size={44} />
                    <h3>No preview yet</h3>
                    <p>Select country, city and business type. Then click Search First or Find & Import.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === "leads" && (
          <section className="page">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Global CRM</p>
                  <h3>Leads · {leadMeta.total} found</h3>
                  <p className="muted-line">Page {leadMeta.page} of {leadMeta.totalPages}</p>
                </div>

                <div className="top-actions">
                  <select className="search-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    {statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <input
                    className="search-input"
                    placeholder="Search leads..."
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
                onScore={scoreLead}
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

        {activeTab === "add" && (
          <section className="page two-col">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Lead Import</p>
                  <h3>CSV Import</h3>
                </div>
              </div>

              <label className="secondary-btn full">
                <Upload size={18} />
                {csvImporting ? "Importing..." : "Import CSV Leads"}
                <input hidden type="file" accept=".csv" onChange={importCsv} />
              </label>

              <a className="ghost-btn full" href={`${API}/api/export/leads.json`} target="_blank" rel="noreferrer">
                <Download size={18} />
                Export Backup JSON
              </a>
            </div>

            <div className="panel">
              <h3>Manual Global Lead</h3>
              <div className="form-grid">
                <Input label="Business Name" value={leadForm.businessName} onChange={(v) => setLeadForm({ ...leadForm, businessName: v })} />
                <Input label="Contact Person" value={leadForm.contactPerson} onChange={(v) => setLeadForm({ ...leadForm, contactPerson: v })} />
                <Input label="Phone" value={leadForm.phone} onChange={(v) => setLeadForm({ ...leadForm, phone: v })} />
                <Input label="WhatsApp" value={leadForm.whatsapp} onChange={(v) => setLeadForm({ ...leadForm, whatsapp: v })} />
                <Input label="Email" value={leadForm.email} onChange={(v) => setLeadForm({ ...leadForm, email: v })} />
                <Input label="Website" value={leadForm.website} onChange={(v) => setLeadForm({ ...leadForm, website: v })} />
                <Input label="Instagram" value={leadForm.instagram} onChange={(v) => setLeadForm({ ...leadForm, instagram: v })} />
                <Input label="Facebook" value={leadForm.facebook} onChange={(v) => setLeadForm({ ...leadForm, facebook: v })} />
                <Input label="LinkedIn" value={leadForm.linkedin} onChange={(v) => setLeadForm({ ...leadForm, linkedin: v })} />
                <Input label="Country" value={leadForm.country} onChange={(v) => setLeadForm({ ...leadForm, country: v })} />
                <Input label="City" value={leadForm.city} onChange={(v) => setLeadForm({ ...leadForm, city: v })} />
                <Input label="Category" value={leadForm.category} onChange={(v) => setLeadForm({ ...leadForm, category: v })} />
                <Input label="Business Size" value={leadForm.businessSize} onChange={(v) => setLeadForm({ ...leadForm, businessSize: v })} />
                <Input label="Estimated Deal Value" value={leadForm.estimatedDealValue} onChange={(v) => setLeadForm({ ...leadForm, estimatedDealValue: v })} />
              </div>

              <Textarea label="Notes" value={leadForm.notes} onChange={(v) => setLeadForm({ ...leadForm, notes: v })} />

              <button className="primary-btn full" onClick={addLead} disabled={loading}>
                <Save size={18} />
                Save & Score Lead
              </button>
            </div>
          </section>
        )}

        {activeTab === "studio" && (
          <section className="page studio-layout">
            <div className="panel lead-list-panel">
              <h3>Current Page Leads</h3>
              <div className="picker-list">
                {leads.map((lead) => (
                  <button
                    key={lead.id}
                    className={selectedLead?.id === lead.id ? "picker active" : "picker"}
                    onClick={() => setSelectedLead(lead)}
                  >
                    <Building2 size={16} />
                    <span>{lead.businessName}</span>
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
                  <p>Choose a lead to score, match product, generate message and analyze replies.</p>
                </div>
              ) : (
                <>
                  <div className="section-head studio-head">
                    <div>
                      <p className="eyebrow">{selectedLead.category || "Business"}</p>
                      <h3>{selectedLead.businessName}</h3>
                      <p className="muted-line">
                        Score: {selectedLead.leadScore || 0}/100 · {selectedLead.leadTemperature || "Cold"} · Product: {selectedLead.recommendedProduct || "Not scored"}
                      </p>
                    </div>

                    <div className="top-actions">
                      <select className="search-input" value={messageMode} onChange={(e) => setMessageMode(e.target.value)}>
                        {messageModes.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>

                      <button className="secondary-btn" onClick={() => scoreLead(selectedLead)}>
                        <Target size={17} />
                        Score
                      </button>

                      <button className="primary-btn" onClick={() => generateMessage(selectedLead)}>
                        <Wand2 size={17} />
                        Generate
                      </button>
                    </div>
                  </div>

                  <div className="lead-detail-strip">
                    <span><Phone size={14} /> {selectedLead.whatsapp || selectedLead.phone || "No phone"}</span>
                    <span><Mail size={14} /> {selectedLead.email || "No email"}</span>
                    <span><MapPin size={14} /> {[selectedLead.city, selectedLead.country].filter(Boolean).join(", ") || "Global"}</span>
                  </div>

                  <div className="ai-box">
                    <h4>AI Lead Intelligence</h4>
                    <p><b>Problem:</b> {selectedLead.aiProblem || "Score lead to generate problem insight."}</p>
                    <p><b>Why good:</b> {selectedLead.aiReason || "Score lead to generate reason."}</p>
                    <p><b>Best angle:</b> {selectedLead.aiOutreachAngle || "Score lead to generate outreach angle."}</p>
                    <p><b>Next action:</b> {selectedLead.nextAction || "Generate message or follow up."}</p>
                  </div>

                  <div className="message-box">
                    {selectedLead.lastMessage || "No message generated yet."}
                  </div>

                  <div className="studio-actions">
                    {openWhatsapp ? (
                      <a className="whatsapp-btn" href={openWhatsapp} target="_blank" rel="noreferrer">
                        <MessageCircle size={18} />
                        Open WhatsApp
                      </a>
                    ) : (
                      <button className="disabled-btn" disabled>
                        <MessageCircle size={18} />
                        Add Phone First
                      </button>
                    )}

                    <button className="secondary-btn" onClick={copyMessage}>
                      <Copy size={18} />
                      Copy
                    </button>

                    <button className="ghost-btn" onClick={() => markSent(selectedLead)}>
                      <Send size={18} />
                      Mark Sent
                    </button>

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
                    <h4>Conversation Analyzer</h4>
                    <Textarea label="Paste customer reply" value={replyText} onChange={setReplyText} />
                    <button className="primary-btn" onClick={analyzeReply}>
                      <Brain size={17} />
                      Analyze Reply
                    </button>

                    {replyResult && (
                      <div className="ai-box">
                        <p><b>Interest:</b> {replyResult.interestLevel}</p>
                        <p><b>Status:</b> {replyResult.updatedStatus}</p>
                        <p><b>Next:</b> {replyResult.nextAction}</p>
                        <p><b>Best reply:</b> {replyResult.bestReply}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === "followups" && (
          <section className="page">
            <div className="stats-grid">
              <Stat title="Due Today" value={followups?.dueToday?.length || 0} icon={Target} />
              <Stat title="Hot Leads" value={followups?.hotLeads?.length || 0} icon={Zap} />
              <Stat title="Interested" value={followups?.interested?.length || 0} icon={CheckCircle2} />
              <Stat title="Demo Booked" value={followups?.demoBooked?.length || 0} icon={MessageCircle} />
            </div>

            <FollowupSection title="Follow-ups Due Today" leads={followups?.dueToday || []} setSelectedLead={setSelectedLead} setActiveTab={setActiveTab} />
            <FollowupSection title="Hot Leads" leads={followups?.hotLeads || []} setSelectedLead={setSelectedLead} setActiveTab={setActiveTab} />
            <FollowupSection title="No Response" leads={followups?.noResponse || []} setSelectedLead={setSelectedLead} setActiveTab={setActiveTab} />
          </section>
        )}

        {activeTab === "products" && (
          <section className="page">
            <div className="lead-grid">
              {products.map((product) => (
                <div className="lead-card" key={product.name}>
                  <div className="lead-top">
                    <div className="lead-icon"><Sparkles size={22} /></div>
                    <div>
                      <h4>{product.name}</h4>
                      <p>{product.pitch}</p>
                    </div>
                  </div>
                  <div className="badges">
                    {product.categories.slice(0, 5).map((cat) => (
                      <span key={cat}>{cat}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "profile" && profile && (
          <section className="page">
            <div className="panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Your Sales Identity</p>
                  <h3>Profile Vault</h3>
                </div>
                <button className="primary-btn" onClick={saveProfile}>
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
                <Input label="Portfolio" value={profile.portfolio} onChange={(v) => setProfile({ ...profile, portfolio: v })} />
                <Input label="LinkedIn" value={profile.linkedin} onChange={(v) => setProfile({ ...profile, linkedin: v })} />
                <Input label="GitHub" value={profile.github} onChange={(v) => setProfile({ ...profile, github: v })} />
              </div>

              <Textarea label="Skills" value={profile.skills} onChange={(v) => setProfile({ ...profile, skills: v })} />
              <Textarea label="Projects" value={profile.projects} onChange={(v) => setProfile({ ...profile, projects: v })} />
              <Textarea label="Bio" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} />
            </div>
          </section>
        )}

        {activeTab === "logs" && (
          <section className="page">
            <div className="panel">
              <h3>Activity Logs</h3>
              <div className="logs">
                {logs.map((log) => (
                  <div className="log-row" key={log.id}>
                    <div>
                      <h4>{log.action}</h4>
                      <p>{log.lead_name || log.leadName} · {log.channel || ""}</p>
                    </div>
                    <span>{new Date(log.created_at || log.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function LeadGrid({ leads, onSelect, onScore, onGenerate, onDelete }) {
  if (!leads.length) {
    return (
      <div className="empty">
        <Building2 size={44} />
        <h3>No leads found</h3>
        <p>Add leads manually, import CSV, run discovery, or change filters.</p>
      </div>
    );
  }

  return (
    <div className="lead-grid">
      {leads.map((lead) => (
        <div className="lead-card" key={lead.id}>
          <div onClick={() => onSelect(lead)} className="lead-click">
            <div className="lead-top">
              <div className="lead-icon"><Building2 size={22} /></div>
              <div>
                <h4>{lead.businessName}</h4>
                <p>{lead.category || "Business"}</p>
              </div>
            </div>

            <div className="badges">
              <span>{lead.status}</span>
              <span>{lead.leadTemperature || "Cold"}</span>
              <span>{lead.leadScore || 0}/100</span>
              <span>{lead.recommendedProduct || "No product"}</span>
            </div>

            <p className="small-line">
              <MapPin size={13} /> {[lead.city, lead.country].filter(Boolean).join(", ") || "Global"}
            </p>
            <p className="small-line">
              <Phone size={13} /> {lead.whatsapp || lead.phone || "No phone"}
            </p>
            <p className="small-line">
              <Mail size={13} /> {lead.email || "No email"}
            </p>
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
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, setPage, compact = false }) {
  return (
    <div className={compact ? "pagination compact" : "pagination"}>
      <button className="ghost-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>
        Prev
      </button>
      <span>Page {page} / {totalPages}</span>
      <button className="ghost-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(p + 1, totalPages))}>
        Next
      </button>
    </div>
  );
}

function FollowupSection({ title, leads, setSelectedLead, setActiveTab }) {
  return (
    <div className="panel" style={{ marginTop: 18 }}>
      <h3>{title}</h3>
      <div className="lead-grid">
        {leads.slice(0, 12).map((lead) => (
          <div
            className="lead-card"
            key={lead.id}
            onClick={() => {
              setSelectedLead(lead);
              setActiveTab("studio");
            }}
          >
            <h4>{lead.businessName}</h4>
            <p>{lead.recommendedProduct}</p>
            <div className="badges">
              <span>{lead.status}</span>
              <span>{lead.leadTemperature}</span>
              <span>{lead.leadScore}/100</span>
            </div>
          </div>
        ))}
      </div>
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