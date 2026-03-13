/* ══════════════════════════════════════════
   AQI Watch — Frontend Logic
   Calls Flask API endpoints and renders UI
   ══════════════════════════════════════════ */

// ── State ────────────────────────────────
let allWards       = [];
let selectedWardId = null;
let trendChart     = null;
let sourceChart    = null;

// ── AQI helpers ──────────────────────────
function getLevel(aqi) {
  if (aqi <= 50)  return { label: "Good",           color: "#16a34a", bg: "#f0fdf4" };
  if (aqi <= 100) return { label: "Moderate",       color: "#d97706", bg: "#fffbeb" };
  if (aqi <= 150) return { label: "Sensitive",      color: "#ea580c", bg: "#fff7ed" };
  if (aqi <= 200) return { label: "Unhealthy",      color: "#dc2626", bg: "#fef2f2" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#9333ea", bg: "#faf5ff" };
  return                 { label: "Hazardous",      color: "#7c3aed", bg: "#fdf4ff" };
}

const SOURCE_ICONS = {
  construction:    "🏗️",
  biomass_burning: "🔥",
  vehicular:       "🚗",
  industrial:      "🏭",
  mixed:           "🌫️",
};

const SOURCE_LABELS = {
  construction:    "Construction Dust",
  biomass_burning: "Biomass Burning",
  vehicular:       "Vehicular Emissions",
  industrial:      "Industrial Discharge",
  mixed:           "Mixed Sources",
};

const TREND_ARROWS = {
  rising:  "↑ Rising",
  falling: "↓ Falling",
  stable:  "→ Stable",
};

// ── Fetch & render summary stats ─────────
async function loadSummary() {
  const res  = await fetch("/api/summary");
  const data = await res.json();

  document.getElementById("stat-avg").textContent      = data.avg_aqi;
  document.getElementById("stat-critical").textContent = data.critical;
  document.getElementById("stat-improving").textContent= data.improving;
  document.getElementById("stat-pop").textContent      = formatPop(data.at_risk_pop);
  document.getElementById("stat-wards").textContent    = `${data.total_wards} wards tracked`;
}

function formatPop(n) {
  if (n >= 100000) return (n / 100000).toFixed(1) + "L";
  if (n >= 1000)   return (n / 1000).toFixed(0) + "K";
  return n;
}

// ── Fetch & render ward list ─────────────
async function loadWards() {
  const res = await fetch("/api/wards");
  allWards  = await res.json();

  const listEl = document.getElementById("ward-list");
  listEl.innerHTML = allWards.map(w => {
    const l   = getLevel(w.aqi);
    const pct = Math.min((w.aqi / 500) * 100, 100).toFixed(1);
    return `
      <div class="ward-row ${w.ward_id === selectedWardId ? "active" : ""}"
           data-id="${w.ward_id}" onclick="selectWard(${w.ward_id})">
        <div>
          <div class="ward-name">${w.ward_name}</div>
          <div class="ward-meta">
            ${SOURCE_ICONS[w.source] || "🌫️"} ${SOURCE_LABELS[w.source]}
            &nbsp;·&nbsp; ${TREND_ARROWS[w.trend] || w.trend}
          </div>
        </div>
        <div class="ward-right">
          <div class="ward-aqi" style="color:${l.color}">${w.aqi}</div>
          <div class="aqi-bar-wrap">
            <div class="aqi-bar" style="width:${pct}%;background:${l.color}"></div>
          </div>
        </div>
      </div>`;
  }).join("");

  // Auto-select first ward on first load
  if (!selectedWardId && allWards.length) selectWard(allWards[0].ward_id);
}

// ── Select a ward and render detail ──────
function selectWard(wardId) {
  selectedWardId = wardId;

  // Highlight active row
  document.querySelectorAll(".ward-row").forEach(r => {
    r.classList.toggle("active", parseInt(r.dataset.id) === wardId);
  });

  const ward = allWards.find(w => w.ward_id === wardId);
  if (!ward) return;

  renderDetail(ward);
  loadTrendChart(wardId, ward.aqi_color);
}

// ── Render detail panel ───────────────────
function renderDetail(ward) {
  const l = getLevel(ward.aqi);

  document.getElementById("detail-content").innerHTML = `
    <!-- Top row -->
    <div class="detail-top">
      <div>
        <div class="detail-name">${ward.ward_name}</div>
        <span class="tag" style="background:${l.bg};color:${l.color}">${l.label}</span>
        <span class="tag tag-blue">${SOURCE_ICONS[ward.source]} ${SOURCE_LABELS[ward.source]}</span>
        <span class="tag tag-gray">ML ${ward.confidence}% confidence</span>
        <div style="margin-top:8px;font-size:12px;color:var(--muted)">
          👥 ${ward.population.toLocaleString()} residents &nbsp;·&nbsp; ${TREND_ARROWS[ward.trend] || ward.trend}
        </div>
      </div>
      <div class="big-aqi" style="color:${l.color}">${ward.aqi}</div>
    </div>

    <!-- Health advisory -->
    <div class="advisory" style="background:${l.bg};margin-bottom:16px">
      <div class="advisory-icon">${ward.health_icon}</div>
      <div>
        <div class="advisory-title" style="color:${l.color}">Health Risk: ${ward.health_risk}</div>
        <div class="advisory-text">${ward.health_advice}</div>
      </div>
    </div>

    <!-- Pollutants -->
    <div class="poll-section-title">Pollutant Breakdown</div>
    <div class="poll-grid">
      <div class="poll-item">
        <div class="poll-name">PM2.5</div>
        <div class="poll-val" style="color:${l.color}">${ward.pm25} µg/m³</div>
      </div>
      <div class="poll-item">
        <div class="poll-name">PM10</div>
        <div class="poll-val" style="color:${l.color}">${ward.pm10} µg/m³</div>
      </div>
      <div class="poll-item">
        <div class="poll-name">NO₂</div>
        <div class="poll-val" style="color:${l.color}">${ward.no2} µg/m³</div>
      </div>
      <div class="poll-item">
        <div class="poll-name">CO</div>
        <div class="poll-val" style="color:${l.color}">${ward.co} ppm</div>
      </div>
      <div class="poll-item">
        <div class="poll-name">SO₂</div>
        <div class="poll-val" style="color:${l.color}">${ward.so2} µg/m³</div>
      </div>
      <div class="poll-item">
        <div class="poll-name">O₃</div>
        <div class="poll-val" style="color:${l.color}">${ward.o3} µg/m³</div>
      </div>
    </div>

    <!-- Trend Chart -->
    <div class="trend-wrap">
      <div class="trend-title">24-Hour AQI Trend</div>
      <canvas id="trendChart" height="80"></canvas>
    </div>

    <!-- Policy Recommendations -->
    <div class="policy-section" style="margin-top:16px">
      <div class="policy-title">🏛️ ML Policy Recommendations</div>
      ${ward.policies.map((p, i) => `
        <div class="policy-item">
          <div class="policy-num">${i + 1}</div>
          <div>${p}</div>
        </div>`).join("")}
    </div>
  `;
}

// ── Trend chart ───────────────────────────
async function loadTrendChart(wardId, color) {
  const res  = await fetch(`/api/trend/${wardId}`);
  const data = await res.json();

  const ctx = document.getElementById("trendChart");
  if (!ctx) return;

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [{
        label: "AQI",
        data: data.values,
        borderColor: color,
        backgroundColor: color + "22",
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: color,
        fill: true,
        tension: 0.35,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { font: { size: 10 } }, grid: { color: "#e8ecf0" } },
      }
    }
  });
}

// ── Source distribution chart ─────────────
async function loadSourceChart() {
  const res    = await fetch("/api/sources");
  const data   = await res.json();

  const COLORS = {
    construction:    "#f59e0b",
    biomass_burning: "#ef4444",
    vehicular:       "#8b5cf6",
    industrial:      "#ec4899",
    mixed:           "#6b7280",
  };

  const labels = Object.keys(data).map(k => SOURCE_LABELS[k] || k);
  const values = Object.values(data);
  const colors = Object.keys(data).map(k => COLORS[k] || "#94a3b8");

  const ctx = document.getElementById("sourceChart");
  if (!ctx) return;

  if (sourceChart) sourceChart.destroy();

  sourceChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: "#ffffff" }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { size: 10 }, padding: 8, boxWidth: 10 }
        }
      }
    }
  });
}

// ── Clock ─────────────────────────────────
function updateClock() {
  document.getElementById("clock").textContent =
    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST";
}

// ── Init ──────────────────────────────────
(async function init() {
  await Promise.all([loadSummary(), loadWards(), loadSourceChart()]);
  setInterval(updateClock, 1000);
  updateClock();
})();