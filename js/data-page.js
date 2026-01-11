// js/data-page.js
// Page Informations – KPI + aperçu du dataset
// Dépend uniquement de data-core.js et d3

document.addEventListener("DOMContentLoaded", () => {
  loadData()
    .then((data) => {
      renderKPIs(data);
      renderPreview(data);
    })
    .catch((err) => {
      console.error("Erreur chargement données (page info):", err);
      alert("Impossible de charger les données.");
    });
});

/*function meanCO2(data) {
  const vals = data.map((d) => d.co2_grid_grams).filter(Number.isFinite);

  if (vals.length === 0) return 0;

  return d3.mean(vals);
}

function mostPollutingCountry(data) {
  const byCountry = d3.group(data, (d) => d.country);

  let worstCountry = "—";
  let worstValue = -Infinity;

  for (const [country, sites] of byCountry) {
    const vals = sites.map((d) => d.co2_grid_grams).filter(Number.isFinite);

    if (vals.length === 0) continue;

    const avg = d3.mean(vals);

    if (avg > worstValue) {
      worstValue = avg;
      worstCountry = country;
    }
  }

  return worstCountry;
}*/

/* =====================================================
   KPI
===================================================== */

function renderKPIs(data) {
  const kpiSites = document.getElementById("kpi-sites");
  const kpiCountries = document.getElementById("kpi-countries");
  const kpiCategories = document.getElementById("kpi-categories");
  const kpiGreen = document.getElementById("kpi-green");
  const kpiCO2 = document.getElementById("kpi-co2");

  if (!kpiSites || !kpiCountries || !kpiCategories || !kpiGreen || !kpiCO2)
    return;

  // === Calculs simples ===
  const sites = new Set(data.map((d) => d.site)).size;
  const countries = new Set(data.map((d) => d.country)).size;
  const categories = new Set(data.map((d) => d.category)).size;

  const total = data.length;
  const greenCount = data.filter((d) => d.green_host === true).length;
  const greenPct = total > 0 ? Math.round((greenCount / total) * 100) : 0;
  const meanCO2Value = meanCO2(data);

  // === Animations ===
  animateNumber(kpiSites, 0, sites);
  animateNumber(kpiCountries, 0, countries);
  animateNumber(kpiCategories, 0, categories);
  animateNumber(kpiGreen, 0, greenPct, 1000, " %");
  animateNumber(kpiCO2, 0, meanCO2Value * 1000, 1000);
}

/* =====================================================
   APERÇU DU DATASET (DIVERSITÉ)
===================================================== */

function renderPreview(data) {
  const tbody = document.getElementById("data-preview");
  if (!tbody) return;

  tbody.innerHTML = "";

  // Groupement par pays
  const byCountry = d3.group(data, (d) => d.country);

  const previewRows = [];

  // On prend jusqu’à 2 sites par pays (mélangés)
  for (const [, sites] of byCountry) {
    const shuffled = d3.shuffle([...sites]);
    previewRows.push(...shuffled.slice(0, 2));
    if (previewRows.length >= 12) break;
  }

  previewRows.slice(0, 12).forEach((d) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${cleanSite(d.site)}</td>
      <td>${d.country}</td>
      <td>${d.category}</td>
      <td>${formatCO2(d.co2_grid_grams)}</td>
      <td>${formatEnergy(d.energy_kWh)}</td>
      <td>${renderGreen(d.green_host)}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* =====================================================
   HELPERS FORMATAGE
===================================================== */

function cleanSite(site) {
  return site ? site.replace(/^https?:\/\//, "").replace(/^www\./, "") : "—";
}

function formatCO2(v) {
  return Number.isFinite(v) ? v.toFixed(3) : "—";
}

function formatEnergy(v) {
  if (!Number.isFinite(v)) return "—";

  // conversion kWh → Wh
  const wh = v * 1000;

  if (wh < 0.01) return "< 0.01";

  return wh.toFixed(2);
}

function renderGreen(v) {
  return v ? "🌱 Green" : "❌ Non green";
}

function meanCO2(data) {
  const values = data.map((d) => d.co2_grid_grams).filter(Number.isFinite);

  if (values.length === 0) return 0;

  return d3.mean(values);
}

/* =====================================================
  Animation KPI
===================================================== */
function animateNumber(el, start, end, duration = 1000, suffix = "") {
  if (!el) return;

  const startTime = performance.now();

  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = Math.round(start + (end - start) * progress);

    el.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}
