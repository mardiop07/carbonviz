// js/main.js
let mapRendered = false;
let globalData = [];
window.globalData = globalData;

let state = {
  greenFilter: "ALL",
  selectedSites: [],
  siteFilterMode: "ALL",
  radarSites: [],
  radarMax: 4,
};
window.state = state;

/* =========================
   UTILS
========================= */
function num(v) {
  const n = +v;
  return Number.isFinite(n) ? n : NaN;
}

/* =========================
   PARSE CSV
========================= */
/*function parseRow(d) {
  const sizeKey =
    "taille(octets)" in d
      ? "taille(octets)"
      : "taille_octets" in d
      ? "taille_octets"
      : "size_bytes" in d
      ? "size_bytes"
      : "bytes" in d
      ? "bytes"
      : null;

  const greenRaw = d.green_host ?? d.green ?? d.host_green;

  return {
    site: d.site || d.url || d.website || "",
    country: d.country || d.pays || "",
    category: d.category || d.categorie || "Unknown",

    green_host: Boolean(num(greenRaw)),

    size_bytes: sizeKey ? num(d[sizeKey]) : NaN,
    energy_kWh: num(d.energy_kWh ?? d.energy),
    cleaner_than: num(d.cleaner_than),

    co2_grid_grams: num(d.co2_grid_grams ?? d.co2_grid ?? d.co2),
    co2_grid_litres: num(d.co2_grid_litres),

    co2_renewable_grams: num(d.co2_renewable_grams),
    co2_renewable_litres: num(d.co2_renewable_litres),
  };
}*/

loadData().then((globalData) => {
  window.globalData = globalData;
  renderSiteSelector(globalData);
  setupRadarSelector(globalData);
  window.initDonutsViz?.(globalData);
  render();
});

/* =========================
   FILTERS
========================= */
function applyFilters(data) {
  let out = data;

  if (state.greenFilter === "GREEN") {
    out = out.filter((d) => d.green_host);
  } else if (state.greenFilter === "NOT_GREEN") {
    out = out.filter((d) => !d.green_host);
  }

  if (state.siteFilterMode === "CUSTOM") {
    out = out.filter((d) => state.selectedSites.includes(d.site));
  } else if (state.siteFilterMode === "NONE") {
    out = [];
  }

  return out;
}

/* =========================
   UI HELPERS
========================= */
function setActiveButton(activeId, ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle("active", id === activeId);
  });
}

function showEmptyState(containerId, message) {
  const container = document.querySelector(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="d-flex align-items-center justify-content-center h-100 text-muted text-center">
      <div>
        <div style="font-size:32px">📭</div>
        <p class="mt-2 mb-0">${message}</p>
      </div>
    </div>
  `;
}

/* =========================
   RENDER GLOBAL
========================= */
function render() {
  const filtered = applyFilters(globalData);

  if (filtered.length === 0) {
    showEmptyState("#chart-bar", "Aucun site sélectionné.");
    showEmptyState("#chart-scatter", "Aucune donnée.");
    return;
  }

  window.drawBarChart?.(filtered, { container: "#chart-bar" });
  window.drawScatter?.(filtered, { container: "#chart-scatter" });

  if (!mapRendered && window.drawMostPollutingByCountry) {
    window.drawMostPollutingByCountry(globalData, {
      container: "#chart-map",
      metricKey: "co2_grid_grams",
      metricLabel: "CO₂ (g)",
      geoPath: "./data/world.geojson",
    });
    mapRendered = true;
  }
}

/* =========================
   SITE SELECTOR (BAR)
========================= */
function renderSiteSelector(data) {
  const container = document.getElementById("site-selector");
  if (!container) return;

  container.innerHTML = "";
  const sites = [...new Set(data.map((d) => d.site))].sort();

  state.selectedSites = [...sites];
  state.siteFilterMode = "ALL";

  sites.forEach((site) => {
    const id = `site-${site.replace(/[^a-zA-Z0-9]/g, "")}`;

    const div = document.createElement("div");
    div.className = "form-check";

    div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${id}" checked>
      <label class="form-check-label" for="${id}">
        ${site.replace(/^https?:\/\//, "").replace(/^www\./, "")}
      </label>
    `;

    div.querySelector("input").addEventListener("change", (e) => {
      state.siteFilterMode = "CUSTOM";

      if (e.target.checked) {
        state.selectedSites.push(site);
      } else {
        state.selectedSites = state.selectedSites.filter((s) => s !== site);
      }

      if (state.selectedSites.length === 0) {
        state.siteFilterMode = "NONE";
      }

      render();
    });

    container.appendChild(div);
  });
}

/* =========================
   RADAR SELECTOR
========================= */

function updateRadarChips() {
  const chips = document.getElementById("radar-selected-sites");
  if (!chips) return;

  chips.innerHTML = "";

  state.radarSites.forEach((site) => {
    const chip = document.createElement("div");
    chip.className = "selected-site-chip";

    chip.innerHTML = `
      <span>${site.site.replace(/^https?:\/\//, "")}</span>
      <button>×</button>
    `;

    chip.querySelector("button").addEventListener("click", () => {
      state.radarSites = state.radarSites.filter((d) => d.site !== site.site);

      document
        .querySelectorAll("#radar-site-selector input")
        .forEach((input) => {
          if (input.nextElementSibling.textContent.includes(site.site)) {
            input.checked = false;
          }
        });

      updateRadarChips();
      drawRadar(state.radarSites, { container: "#chart-radar" });
    });

    chips.appendChild(chip);
  });
}

function setupRadarSelector(data) {
  const container = document.getElementById("radar-site-selector");
  if (!container) return;

  container.innerHTML = "";
  state.radarSites = [];

  data.forEach((site) => {
    const id = `radar-${site.site.replace(/[^a-zA-Z0-9]/g, "")}`;

    const div = document.createElement("div");
    div.className = "form-check radar-site-item";

    div.innerHTML = `
      <input class="form-check-input" type="checkbox" id="${id}">
      <label class="form-check-label" for="${id}">
        ${site.site.replace(/^https?:\/\//, "").replace(/^www\./, "")}
      </label>
    `;

    const checkbox = div.querySelector("input");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (state.radarSites.length >= state.radarMax) {
          checkbox.checked = false;
          alert("Maximum 4 sites pour le radar");
          return;
        }
        state.radarSites.push(site);
      } else {
        state.radarSites = state.radarSites.filter((d) => d.site !== site.site);
      }

      updateRadarChips();
      drawRadar(state.radarSites, { container: "#chart-radar" });
    });

    container.appendChild(div);
    // === UX Buttons ===
    const btnClear = document.getElementById("radar-clear");
    const btnTopDurable = document.getElementById("radar-top-durable");
    const btnTopPolluting = document.getElementById("radar-top-polluting");

    function setRadarSelection(newSites) {
      state.radarSites = newSites.slice(0, state.radarMax);

      // sync checkboxes
      const selectedSet = new Set(state.radarSites.map((d) => d.site));
      container.querySelectorAll("input[type=checkbox]").forEach((cb) => {
        const label = cb.nextElementSibling?.textContent || "";
        // on retrouve le site associé via l'id (simple) : on compare avec data
        const id = cb.id;
        const found = data.find(
          (x) => `radar-${x.site.replace(/[^a-zA-Z0-9]/g, "")}` === id
        );
        if (found) cb.checked = selectedSet.has(found.site);
      });

      updateRadarChips();
      drawRadar(state.radarSites, { container: "#chart-radar" });
    }

    btnClear?.addEventListener("click", () => {
      setRadarSelection([]);
    });

    // score durable simple (plus bas co2 + énergie + poids = mieux)
    function durableScore(d) {
      const co2 = +d.co2_grid_grams;
      const en = +d.energy_kWh;
      const bytes = +d.size_bytes;
      // si NaN => très mauvais
      if (![co2, en, bytes].every(Number.isFinite)) return -Infinity;
      // plus petit = mieux => score négatif
      return -(co2 * 1.0 + en * 500 + (bytes / (1024 * 1024)) * 0.1);
    }

    btnTopDurable?.addEventListener("click", () => {
      const best = [...data]
        .sort((a, b) => durableScore(b) - durableScore(a))
        .slice(0, state.radarMax);
      setRadarSelection(best);
    });

    btnTopPolluting?.addEventListener("click", () => {
      const worst = [...data]
        .sort((a, b) => durableScore(a) - durableScore(b))
        .slice(0, state.radarMax);
      setRadarSelection(worst);
    });
  });
}

/* =========================
   SETUP UI
========================= */
function setupUI() {
  const greenIds = ["btn-green-all", "btn-green", "btn-not-green"];

  document.getElementById("btn-green-all")?.addEventListener("click", () => {
    state.greenFilter = "ALL";
    setActiveButton("btn-green-all", greenIds);
    render();
  });

  document.getElementById("btn-green")?.addEventListener("click", () => {
    state.greenFilter = "GREEN";
    setActiveButton("btn-green", greenIds);
    render();
  });

  document.getElementById("btn-not-green")?.addEventListener("click", () => {
    state.greenFilter = "NOT_GREEN";
    setActiveButton("btn-not-green", greenIds);
    render();
  });
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  setupUI();

  loadData()
    .then((data) => {
      globalData = data;
      window.globalData = globalData;

      renderSiteSelector(globalData);
      setupRadarSelector(globalData);
      window.initDonutsViz?.(globalData);

      drawRadar([], { container: "#chart-radar" });
      render();
    })
    .catch((err) => {
      console.error("Erreur chargement CSV:", err);
      alert("Impossible de charger le CSV.");
    });
});
