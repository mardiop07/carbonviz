// js/viz-donuts.js

function toMB(bytes) {
  const n = +bytes;
  return Number.isFinite(n) ? n / (1024 * 1024) : NaN;
}
function fmt(v, digits = 3) {
  const n = +v;
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}
function cleanSiteLabel(url) {
  return (url || "").replace(/^https?:\/\//, "").replace(/^www\./, "");
}

window.initDonutsViz = function (data) {
  const countrySelect = document.getElementById("donuts-country");
  const metricSelect = document.getElementById("donuts-metric");
  const containerSel = "#chart-donuts";

  if (!countrySelect || !metricSelect) {
    console.warn("[donuts] Missing #donuts-country or #donuts-metric in HTML");
    return;
  }

  const rows = (data || []).filter((d) => d && d.country && d.site);

  // Remplir dropdown pays
  const countries = [...new Set(rows.map((d) => d.country))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  countrySelect.innerHTML = countries
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");

  if (countries.length === 0) {
    console.warn("[donuts] No countries found in data");
    return;
  }

  // Default
  countrySelect.value = countries[0];

  function metricValue(d, key) {
    if (key === "co2_grid_grams") return +d.co2_grid_grams;
    if (key === "energy_kWh") return +d.energy_kWh;
    if (key === "size_mb") return toMB(d.size_bytes);
    return NaN;
  }

  function metricLabel(key) {
    if (key === "co2_grid_grams") return "CO₂ (g) / visite";
    if (key === "energy_kWh") return "Énergie (kWh) / visite";
    if (key === "size_mb") return "Taille (MB)";
    return key;
  }

  function draw() {
    const country = countrySelect.value;
    const metricKey = metricSelect.value;

    const countryRows = rows
      .filter((d) => d.country === country)
      .map((d) => ({
        site: d.site,
        v: metricValue(d, metricKey),
      }))
      .filter((d) => Number.isFinite(d.v) && d.v >= 0);

    const container = d3.select(containerSel);
    container.selectAll("*").remove();
    container.style("position", "relative");

    if (countryRows.length === 0) {
      container
        .append("div")
        .style("padding", "18px")
        .style("color", "#666")
        .text("Aucune donnée exploitable pour ce pays.");
      return;
    }

    // ⚠️ Donut avec trop de sites = illisible
    // On garde les TOP 25 (et on agrège le reste en "Autres")
    const MAX_SLICES = 25;
    countryRows.sort((a, b) => b.v - a.v);

    let donutData = countryRows;
    if (countryRows.length > MAX_SLICES) {
      const kept = countryRows.slice(0, MAX_SLICES);
      const rest = countryRows.slice(MAX_SLICES);
      const restSum = d3.sum(rest, (d) => d.v);
      donutData = kept.concat([{ site: "Autres", v: restSum, isOther: true }]);
    }

    const node = container.node();
    const width = Math.max(320, node.clientWidth || 800);
    const height = Math.max(320, node.clientHeight || 520);

    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", "100%");

    // Tooltip
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
      .style("max-width", "300px")
      .style("z-index", 10);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.34;
    const innerRadius = radius * 0.55;

    // Couleur = intensité (plus c’est grand, plus c’est foncé)
    const vMax = d3.max(donutData, (d) => d.v) || 1;
    const color = d3.scaleSequential(d3.interpolateRdYlGn).domain([vMax, 0]);

    const pie = d3
      .pie()
      .value((d) => d.v)
      .sort(null);

    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
    const arcHover = d3
      .arc()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    const g = svg.append("g").attr("transform", `translate(${cx},${cy})`);

    // Title center
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", -6)
      .style("font-weight", "900")
      .style("font-size", "14px")
      .text(country);

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("y", 14)
      .style("fill", "#666")
      .style("font-size", "11px")
      .text(metricLabel(metricKey));

    const arcs = g
      .selectAll("path")
      .data(pie(donutData))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", (p) => color(p.data.v))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseenter", function () {
        d3.select(this).attr("d", arcHover).attr("stroke-width", 2);
      })
      .on("mousemove", function (event, p) {
        const [mx, my] = d3.pointer(event, container.node());
        const siteName =
          p.data.site === "Autres"
            ? "Autres sites"
            : cleanSiteLabel(p.data.site);

        tooltip
          .style("opacity", 1)
          .style("left", `${Math.min(mx + 12, width - 320)}px`)
          .style("top", `${Math.max(my - 10, 12)}px`).html(`
            <div style="font-weight:900;margin-bottom:6px">${siteName}</div>
            <div style="color:#666">
              ${metricLabel(metricKey)} :
              <span style="font-weight:900">${fmt(
                p.data.v,
                metricKey === "size_mb" ? 2 : 4
              )}</span>
            </div>
          `);
      })
      .on("mouseleave", function () {
        d3.select(this).attr("d", arc).attr("stroke-width", 1);
        tooltip.style("opacity", 0);
      });

    // Petite légende texte en bas: combien de sites (et si on a agrégé)
    const totalSites = countryRows.length;
    const shownSites =
      donutData.length - (donutData.some((d) => d.site === "Autres") ? 1 : 0);

    svg
      .append("text")
      .attr("x", 14)
      .attr("y", height - 14)
      .style("font-size", "11px")
      .style("fill", "#666")
      .text(
        totalSites > shownSites
          ? `Affichage: top ${shownSites} sites + “Autres” (total: ${totalSites})`
          : `Total sites: ${totalSites}`
      );
  }

  countrySelect.addEventListener("change", draw);
  metricSelect.addEventListener("change", draw);

  // premier rendu + resize
  draw();
  let t = null;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(draw, 150);
  });
};
