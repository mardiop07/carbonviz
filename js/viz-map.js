// js/viz-map.js
let __worldGeoPromise = null;
function loadWorldGeoJSON(path = "./data/world.geojson") {
  if (!__worldGeoPromise) __worldGeoPromise = d3.json(path);
  return __worldGeoPromise;
}

// Normalisation (matcher CSV <-> GeoJSON)
function key(s) {
  return (s ?? "").toString().trim().toUpperCase();
}

// Alias pays (à enrichir si besoin)
const COUNTRY_ALIASES = new Map([
  ["UNITED STATES", "UNITED STATES OF AMERICA"],
  ["USA", "UNITED STATES OF AMERICA"],
  ["U.S.A.", "UNITED STATES OF AMERICA"],
  ["UNITED STATES OF AMERICA", "UNITED STATES OF AMERICA"],

  ["UK", "UNITED KINGDOM"],
  ["U.K.", "UNITED KINGDOM"],
  ["GREAT BRITAIN", "UNITED KINGDOM"],
  ["ENGLAND", "UNITED KINGDOM"],
  ["UNITED KINGDOM", "UNITED KINGDOM"],

  ["RUSSIA", "RUSSIAN FEDERATION"],
  ["RUSSIAN FEDERATION", "RUSSIAN FEDERATION"],

  ["SOUTH KOREA", "KOREA, REPUBLIC OF"],
  ["KOREA, SOUTH", "KOREA, REPUBLIC OF"],
  ["KOREA, REPUBLIC OF", "KOREA, REPUBLIC OF"],
  ["NORTH KOREA", "KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF"],
  ["KOREA, NORTH", "KOREA, DEMOCRATIC PEOPLE'S REPUBLIC OF"],

  ["IRAN", "IRAN, ISLAMIC REPUBLIC OF"],
  ["IRAN, ISLAMIC REPUBLIC OF", "IRAN, ISLAMIC REPUBLIC OF"],
  ["SYRIA", "SYRIAN ARAB REPUBLIC"],
  ["SYRIAN ARAB REPUBLIC", "SYRIAN ARAB REPUBLIC"],

  ["VIETNAM", "VIET NAM"],
  ["VIET NAM", "VIET NAM"],
  ["TANZANIA", "TANZANIA, UNITED REPUBLIC OF"],
  ["TANZANIA, UNITED REPUBLIC OF", "TANZANIA, UNITED REPUBLIC OF"],

  ["CZECHIA", "CZECH REPUBLIC"],
  ["CZECH REPUBLIC", "CZECH REPUBLIC"],
]);

function canonCountry(s) {
  const k = key(s);
  return COUNTRY_ALIASES.get(k) || k;
}

function fmtNumber(v, digits = 3) {
  const n = +v;
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function toMB(bytes) {
  const n = +bytes;
  if (!Number.isFinite(n)) return NaN;
  return n / (1024 * 1024);
}

// Etat UI conservé (entre rerender)
const __mapUIState = {
  mode: "WORST", // "WORST" | "AVG"
  metric: "co2_grid_grams", // default
};

window.drawMostPollutingByCountry = async function (data, options = {}) {
  const cfg = {
    container: options.container || "#chart-map",
    geoPath: options.geoPath || "./data/world.geojson",
  };

  // Métriques dispo (tu peux en ajouter)
  const METRICS = [
    {
      key: "co2_grid_grams",
      label: "CO₂ (g) / visite",
      value: (d) => +d.co2_grid_grams,
      format: (v) => fmtNumber(v, 4),
      colorInterpolator: d3.interpolateYlOrRd,
    },
    {
      key: "energy_kWh",
      label: "Énergie (kWh) / visite",
      value: (d) => +d.energy_kWh,
      format: (v) => fmtNumber(v, 5),
      colorInterpolator: d3.interpolateOrRd,
    },
    {
      key: "size_mb",
      label: "Taille (MB)",
      value: (d) => toMB(d.size_bytes),
      format: (v) => fmtNumber(v, 2),
      colorInterpolator: d3.interpolatePuRd,
    },
  ];

  // Initialiser l’état depuis options si fourni (sans casser le select ensuite)
  if (options.metricKey && options.metricKey === "energy_kWh")
    __mapUIState.metric = "energy_kWh";
  if (options.metricKey && options.metricKey === "co2_grid_grams")
    __mapUIState.metric = "co2_grid_grams";
  if (options.metricKey && options.metricKey === "size_bytes")
    __mapUIState.metric = "size_mb"; // au cas où

  const container = d3.select(cfg.container);
  if (container.empty()) {
    console.warn("[viz-map] Container introuvable:", cfg.container);
    return;
  }

  container.style("position", "relative");

  // Détails en dehors de la map (ton HTML doit l'avoir)
  const details = d3.select("#map-details");
  if (details.empty()) {
    console.warn(
      "[viz-map] #map-details introuvable (ajoute <div id='map-details'></div> sous la map)"
    );
  }

  // Tooltip
  container.selectAll("*").remove(); // reset map container (pas #map-details)
  const tooltip = container
    .append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("background", "#fff")
    .style("border", "1px solid #ddd")
    .style("border-radius", "10px")
    .style("padding", "10px 12px")
    .style("box-shadow", "0 8px 20px rgba(0,0,0,0.18)")
    .style("font-size", "12px")
    .style("max-width", "280px")
    .style("z-index", 5);

  // --- HEADER BAR (titre + options en ligne) ---
  const header = container
    .append("div")
    .attr("class", "map-header")
    .style("position", "absolute")
    .style("left", "0")
    .style("top", "0")
    .style("width", "100%")
    .style("z-index", 6);

  header.html(`
  <div class="map-header-inner">
    <div class="map-title">Explore Website Emissions</div>
    <div class="map-subtitle">
       Chaque pays est coloré selon le site web le plus polluant de notre dataset.
    </div>
    <div class="map-controls-row">
      <div class="map-control">
        <label for="map-metric">Métrique</label>
        <select id="map-metric">
          ${METRICS.map(
            (m) => `<option value="${m.key}">${m.label}</option>`
          ).join("")}
        </select>
      </div>

      <div class="map-control">
        <label>Agrégation</label>
        <div class="map-toggle">
          <button id="map-mode-worst" type="button">Pire site</button>
          <button id="map-mode-avg" type="button">Moyenne</button>
        </div>
      </div>
    </div>
  </div>
  `);

  // Appliquer état UI aux contrôles
  const metricSelect = header.select("#map-metric");
  metricSelect.property("value", __mapUIState.metric);

  function updateModeButtons() {
    const worstBtn = header.select("#map-mode-worst");
    const avgBtn = header.select("#map-mode-avg");

    worstBtn.classed("active", __mapUIState.mode === "WORST");
    avgBtn.classed("active", __mapUIState.mode === "AVG");
  }

  updateModeButtons();

  // --- Charger le monde une fois ---
  let world;
  try {
    world = await loadWorldGeoJSON(cfg.geoPath);
  } catch (e) {
    console.error("Impossible de charger world.geojson:", e);
    container
      .append("div")
      .style("padding", "12px")
      .style("color", "crimson")
      .text(
        "Erreur: world.geojson introuvable. Mets-le dans /data/world.geojson"
      );
    return;
  }

  // --- Helpers GeoJSON ---
  function geoCountryName(f) {
    return (
      f.properties?.name ||
      f.properties?.ADMIN ||
      f.properties?.NAME ||
      f.properties?.NAME_EN ||
      "Pays"
    );
  }
  function geoIso3(f) {
    return f.properties?.ISO_A3 || f.properties?.iso_a3 || "";
  }

  // --- Données filtrées (global) ---
  const rows = (data || []).filter(
    (d) =>
      d &&
      d.country &&
      d.site &&
      d.country !== "Global" &&
      Number.isFinite(+d.co2_grid_grams) // garde au moins une base valide
  );

  // --- RENDER MAP (se relance quand on change options) ---
  let selectedFeature = null;

  function buildCountryMap(metricObj, mode) {
    // On ne garde que les lignes avec une valeur métrique valide
    const usable = rows.filter((d) => {
      const v = metricObj.value(d);
      return Number.isFinite(v) && v >= 0;
    });

    if (mode === "WORST") {
      // pays -> ligne max
      return new Map(
        d3
          .rollups(
            usable,
            (vals) =>
              vals.reduce(
                (maxRow, r) =>
                  metricObj.value(r) > metricObj.value(maxRow) ? r : maxRow,
                vals[0]
              ),
            (d) => canonCountry(d.country)
          )
          .map(([countryKey, worst]) => [
            countryKey,
            {
              kind: "WORST",
              site: worst.site,
              category: worst.category || "",
              value: metricObj.value(worst),
              green_host: !!worst.green_host,
              energy_kWh: worst.energy_kWh,
              size_bytes: worst.size_bytes,
              cleaner_than: worst.cleaner_than,
              n_sites: usable.filter(
                (x) => canonCountry(x.country) === countryKey
              ).length,
            },
          ])
      );
    }

    // AVG : pays -> moyenne (et on garde aussi le pire site pour info)
    return new Map(
      d3.rollups(
        usable,
        (vals) => {
          const mean = d3.mean(vals, (d) => metricObj.value(d));
          const worst = vals.reduce(
            (maxRow, r) =>
              metricObj.value(r) > metricObj.value(maxRow) ? r : maxRow,
            vals[0]
          );
          return {
            kind: "AVG",
            value: mean,
            n_sites: vals.length,
            worst_site: worst.site,
            worst_value: metricObj.value(worst),
            worst_green: !!worst.green_host,
            worst_category: worst.category || "",
          };
        },
        (d) => canonCountry(d.country)
      )
    );
  }

  function showDetails(countryDisplayName, hit, metricObj) {
    if (details.empty()) return;

    if (!hit) {
      details
        .style("display", "block")
        .style("padding", "12px")
        .style("background", "#fff")
        .style("border", "1px solid #eee")
        .style("border-radius", "12px")
        .style("box-shadow", "0 6px 16px rgba(0,0,0,0.06)").html(`
          <div style="font-weight:900;font-size:14px;margin-bottom:6px">${countryDisplayName}</div>
          <div style="color:#666">Pas de données pour ce pays (dans notre dataset).</div>
        `);
      return;
    }

    if (hit.kind === "WORST") {
      const sitePretty = (hit.site || "")
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "");
      const sizeMB = Number.isFinite(+hit.size_bytes)
        ? toMB(hit.size_bytes).toFixed(2)
        : "—";

      details
        .style("display", "block")
        .style("padding", "12px")
        .style("background", "#fff")
        .style("border", "1px solid #eee")
        .style("border-radius", "12px")
        .style("box-shadow", "0 6px 16px rgba(0,0,0,0.06)").html(`
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <div style="font-weight:900;font-size:14px">${countryDisplayName}</div>
            <button id="map-details-close" style="border:1px solid #ddd;background:#fff;border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer">Fermer</button>
          </div>

          <div style="margin-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="color:#666">Pire site :</span>
            <span style="font-weight:900">${sitePretty}</span>
            <span style="
              display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800;
              color:${hit.green_host ? "#0f5132" : "#842029"};
              background:${hit.green_host ? "#d1e7dd" : "#f8d7da"};
            ">
              ${hit.green_host ? "🌱 Hébergement vert" : "❌ Non vert"}
            </span>
            <span style="color:#888;font-size:11px">(${
              hit.n_sites
            } sites dans le dataset)</span>
          </div>

          ${
            hit.category
              ? `<div style="margin-top:6px;color:#666">Catégorie : <span style="color:#111;font-weight:800">${hit.category}</span></div>`
              : ""
          }

          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div>
              <div style="color:#666;font-size:11px">${metricObj.label}</div>
              <div style="font-weight:900;font-size:14px">${metricObj.format(
                hit.value
              )}</div>
            </div>
            <div>
              <div style="color:#666;font-size:11px">Taille page (MB)</div>
              <div style="font-weight:900;font-size:14px">${sizeMB}</div>
            </div>
            <div>
              <div style="color:#666;font-size:11px">Énergie (kWh)</div>
              <div style="font-weight:900;font-size:14px">${fmtNumber(
                hit.energy_kWh,
                5
              )}</div>
            </div>
            <div>
              <div style="color:#666;font-size:11px">Cleaner than</div>
              <div style="font-weight:900;font-size:14px">${
                Number.isFinite(+hit.cleaner_than)
                  ? `${Math.round(+hit.cleaner_than * 100)}%`
                  : "—"
              }</div>
            </div>
          </div>
        `);

      details
        .select("#map-details-close")
        .on("click", () => details.style("display", "none"));
      return;
    }

    // AVG
    const worstPretty = (hit.worst_site || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "");
    details
      .style("display", "block")
      .style("padding", "12px")
      .style("background", "#fff")
      .style("border", "1px solid #eee")
      .style("border-radius", "12px")
      .style("box-shadow", "0 6px 16px rgba(0,0,0,0.06)").html(`
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <div style="font-weight:900;font-size:14px">${countryDisplayName}</div>
          <button id="map-details-close" style="border:1px solid #ddd;background:#fff;border-radius:999px;padding:2px 10px;font-size:12px;cursor:pointer">Fermer</button>
        </div>

        <div style="margin-top:8px;color:#666">
          Agrégation : <b>Moyenne</b> sur <b>${hit.n_sites}</b> sites.
        </div>

        <div style="margin-top:8px;padding-top:8px;border-top:1px solid #eee;display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div>
            <div style="color:#666;font-size:11px">Moyenne — ${
              metricObj.label
            }</div>
            <div style="font-weight:900;font-size:14px">${metricObj.format(
              hit.value
            )}</div>
          </div>

          <div>
            <div style="color:#666;font-size:11px">Pire site (info)</div>
            <div style="font-weight:900;font-size:13px">${worstPretty}</div>
          </div>
          <div>
            <div style="color:#666;font-size:11px">Valeur du pire site</div>
            <div style="font-weight:900;font-size:14px">${metricObj.format(
              hit.worst_value
            )}</div>
          </div>
          <div>
            <div style="color:#666;font-size:11px">Hébergement (pire site)</div>
            <div style="
              display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:800;
              color:${hit.worst_green ? "#0f5132" : "#842029"};
              background:${hit.worst_green ? "#d1e7dd" : "#f8d7da"};
              margin-top:2px
            ">
              ${hit.worst_green ? "🌱 Vert" : "❌ Non vert"}
            </div>
          </div>
        </div>
      `);

    details
      .select("#map-details-close")
      .on("click", () => details.style("display", "none"));
  }

  function renderMap() {
    container.select("svg").remove();
    tooltip.style("opacity", 0);

    const metricObj =
      METRICS.find((m) => m.key === __mapUIState.metric) || METRICS[0];

    // Taille container
    const node = container.node();
    const rect = node.getBoundingClientRect();
    const width = Math.max(900, rect.width || node.clientWidth || 900);
    const headerH = header.node()?.getBoundingClientRect().height || 110;
    const height = Math.max(
      780,
      (rect.height || node.clientHeight || 750) - headerH
    );

    // Projection + path
    const projection = d3.geoNaturalEarth1();
    projection.fitSize([width, height], world);
    const path = d3.geoPath(projection);

    // Data map selon mode & métrique
    const countryMap = buildCountryMap(metricObj, __mapUIState.mode);

    // Domaine couleur
    const values = Array.from(countryMap.values())
      .map((d) => +d.value)
      .filter((v) => Number.isFinite(v));
    const maxV = d3.max(values) || 1;

    const color = d3
      .scaleSequential(metricObj.colorInterpolator)
      .domain([0, maxV]);

    // SVG
    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    // Titre dynamique
    const title =
      __mapUIState.mode === "WORST" ? "Pire site par pays" : "Moyenne par pays";
    header.select(".map-title").text(`${title}`);
    const g = svg.append("g");

    function getHit(f) {
      const name = canonCountry(geoCountryName(f));
      const iso3 = canonCountry(geoIso3(f));
      return countryMap.get(name) || (iso3 ? countryMap.get(iso3) : null);
    }

    const paths = g
      .selectAll("path")
      .data(world.features)
      .enter()
      .append("path")
      .attr("d", path)
      .attr("stroke", "#9a9a9a")
      .attr("stroke-width", 0.4)
      .attr("fill", (f) => {
        const hit = getHit(f);
        return hit ? color(hit.value) : "#f2f2f2";
      })
      .style("cursor", "pointer")
      .attr("opacity", 1);

    // Re-appliquer sélection si existante
    if (selectedFeature) {
      paths.attr("opacity", 0.9);
    }

    paths
      .on("mouseenter", function () {
        d3.select(this)
          .raise()
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
          .style("filter", "drop-shadow(0 0 7px rgba(0,0,0,0.15))");
      })
      .on("mousemove", function (event, f) {
        const displayName = geoCountryName(f);
        const hit = getHit(f);

        const [mx, my] = d3.pointer(event, container.node());

        tooltip
          .style("opacity", 1)
          .style("left", `${Math.min(mx + 14, width - 300)}px`)
          .style("top", `${Math.max(my - 10, 12)}px`)
          .html(() => {
            if (!hit) {
              return `
                <div style="font-weight:900;font-size:13px;margin-bottom:6px">${displayName}</div>
                <div style="color:#666">Pas de données</div>
              `;
            }

            if (hit.kind === "WORST") {
              const sitePretty = (hit.site || "")
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "");
              return `
                <div style="font-weight:900;font-size:13px;margin-bottom:6px">${displayName}</div>
                <div style="color:#666;margin-bottom:4px">Pire site: <span style="color:#111;font-weight:800">${sitePretty}</span></div>
                ${
                  hit.category
                    ? `<div style="color:#666;margin-bottom:4px">Catégorie: <span style="color:#111;font-weight:800">${hit.category}</span></div>`
                    : ""
                }
                <div style="margin-top:6px;padding-top:6px;border-top:1px solid #eee">
                  <span style="color:#666">${metricObj.label}:</span>
                  <span style="font-weight:900">${metricObj.format(
                    hit.value
                  )}</span>
                </div>
                <div style="margin-top:6px;color:#888;font-size:11px">(Clique pour détails)</div>
              `;
            }

            // AVG
            return `
              <div style="font-weight:900;font-size:13px;margin-bottom:6px">${displayName}</div>
              <div style="color:#666;margin-bottom:4px">Moyenne (${
                hit.n_sites
              } sites): <span style="color:#111;font-weight:900">${metricObj.format(
              hit.value
            )}</span></div>
              <div style="color:#888;font-size:11px">(Clique pour détails)</div>
            `;
          });
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("stroke", "#9a9a9a")
          .attr("stroke-width", 0.4)
          .style("filter", null);
        tooltip.style("opacity", 0);
      })
      .on("click", function (event, f) {
        const displayName = geoCountryName(f);
        const hit = getHit(f);

        selectedFeature = f;

        paths.attr("opacity", 0.9);
        d3.select(this).attr("opacity", 1).raise();

        showDetails(displayName, hit, metricObj);

        document
          .getElementById("map-details")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

    // --- Légende ---
    const legendW = 240,
      legendH = 10;
    const legendX = 12,
      legendY = Math.max(60, height - 36);

    const defs = svg.append("defs");
    const gradId = "legendGradient-map-dyn";
    const lg = defs.append("linearGradient").attr("id", gradId);
    lg.append("stop").attr("offset", "0%").attr("stop-color", color(0));
    lg.append("stop").attr("offset", "100%").attr("stop-color", color(maxV));

    svg
      .append("text")
      .attr("x", legendX)
      .attr("y", legendY - 8)
      .style("font-size", "11px")
      .style("font-weight", "800")
      .style("fill", "#444")
      .text(metricObj.label);

    svg
      .append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendW)
      .attr("height", legendH)
      .attr("fill", `url(#${gradId})`)
      .attr("stroke", "#ddd");

    svg
      .append("text")
      .attr("x", legendX)
      .attr("y", legendY + 26)
      .style("font-size", "11px")
      .style("fill", "#444")
      .text("0");

    svg
      .append("text")
      .attr("x", legendX + legendW)
      .attr("y", legendY + 26)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "#444")
      .text(maxV.toFixed(3));

    svg
      .append("rect")
      .attr("x", legendX + legendW + 18)
      .attr("y", legendY - 1)
      .attr("width", 14)
      .attr("height", 12)
      .attr("fill", "#f2f2f2")
      .attr("stroke", "#ddd");

    svg
      .append("text")
      .attr("x", legendX + legendW + 38)
      .attr("y", legendY + 9)
      .style("font-size", "11px")
      .style("fill", "#444")
      .text("Pas de données");

    svg
      .append("text")
      .attr("x", legendX)
      .attr("y", legendY - 20)
      .style("font-size", "11px")
      .style("fill", "#666")
      .text("Faible");

    svg
      .append("text")
      .attr("x", legendX + legendW)
      .attr("y", legendY - 20)
      .attr("text-anchor", "end")
      .style("font-size", "11px")
      .style("fill", "#666")
      .text("Élevé");
  }

  // Events UI
  metricSelect.on("change", function () {
    __mapUIState.metric = this.value;
    // reset sélection pays (optionnel)
    // selectedFeature = null;
    renderMap();
  });

  header.select("#map-mode-worst").on("click", () => {
    __mapUIState.mode = "WORST";
    updateModeButtons();
    renderMap();
  });

  header.select("#map-mode-avg").on("click", () => {
    __mapUIState.mode = "AVG";
    updateModeButtons();
    renderMap();
  });

  // Premier render
  renderMap();

  // Expose renderMap pour le handler resize
  window.__renderMapNow = renderMap;

  // Re-render au resize (1 seule fois)
  if (!window.__mapResizeBound) {
    window.__mapResizeBound = true;

    let __resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(__resizeTimer);
      __resizeTimer = setTimeout(() => {
        window.__renderMapNow?.();
      }, 150);
    });
  }
};
