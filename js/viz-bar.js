// js/viz-bar.js
// Bar chart : Top sites les plus pollueurs (labels nettoyés, clés stables)

(function () {
  const DEFAULTS = {
    container: "#chart-bar",
    topN: 15,
  };

  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // 🔹 Nettoyage VISUEL uniquement (ne jamais l’utiliser comme clé)
  function cleanDomain(url) {
    if (!url) return "";
    return url
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .replace(/\.(com|org|net|fr|uk|de|jp|cn|br|ca)$/i, "");
  }

  window.drawBarChart = function (data, opts = {}) {
    const cfg = { ...DEFAULTS, ...opts };
    const container = d3.select(cfg.container);

    if (container.empty()) {
      console.warn("[viz-bar] container introuvable:", cfg.container);
      return;
    }

    container.selectAll("*").remove();

    const node = container.node();
    const width = node.clientWidth || 900;
    const height = node.clientHeight || 500;

    // 👉 metricKey dynamique (calculé dans main.js)
    const wanted = window.state?.metricKey;
    const metricKey =
      wanted && data[0]?.[wanted] !== undefined ? wanted : "co2_grid_grams";

    const rows = (data || []).filter(
      (d) => d.site && Number.isFinite(d[metricKey])
    );

    const topData = rows
      .sort((a, b) => d3.descending(a[metricKey], b[metricKey]))
      .slice(0, cfg.topN);

    // --- SVG ---
    const margin = { top: 60, right: 24, bottom: 120, left: 80 };
    const innerW = Math.max(300, width - margin.left - margin.right);
    const innerH = Math.max(240, height - margin.top - margin.bottom);

    const svg = container
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    const x = d3
      .scaleBand()
      .domain(topData.map((d) => d.site))
      .range([0, innerW])
      .padding(0.2);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(topData, (d) => d[metricKey]) || 1])
      .nice()
      .range([innerH, 0]);

    // --- Axes ---
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickFormat(cleanDomain))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "11px");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("font-size", "11px");

    // Label axe Y
    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", "#444")
      .text("Émissions de CO₂ (g) par visite");

    // Label axe X
    svg
      .append("text")
      .attr("x", margin.left + innerW / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .style("font-size", "13px")
      .style("fill", "#444")
      .text("Sites web");

    // --- Tooltip ---
    const tooltip = container
      .append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("background", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "8px")
      .style("padding", "10px 12px")
      .style("box-shadow", "0 6px 16px rgba(0,0,0,0.15)")
      .style("font-size", "12px");

    // --- Bars ---
    g.selectAll("rect.bar")
      .data(topData, (d) => d.site) // ✅ clé stable
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d) => x(d.site))
      .attr("y", (d) => y(d[metricKey]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d[metricKey]))
      .attr("fill", (d) => (d.green_host ? "#4CAF50" : "#dc3545"))
      .on("mousemove", function (event, d) {
        const [mx, my] = d3.pointer(event, container.node());
        tooltip
          .style("opacity", 1)
          .style("left", `${mx + 12}px`)
          .style("top", `${my + 12}px`).html(`
            <div style="font-weight:700">${cleanDomain(d.site)}</div>
            <div style="color:#666">${d.site}</div>
            <div>Pays : ${d.country}</div>
            <div>Catégorie : ${d.category}</div>
            <div style="margin-top:6px">
              <b>${metricKey}</b> : ${d[metricKey].toFixed(4)}
            </div>
          `);
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    // --- Titre ---
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", 28)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "700")
      .text(`Sites à plus fort impact`);

    // --- Resize ---
    if (!window.__vizBarResizeBound) {
      window.__vizBarResizeBound = true;
      window.addEventListener(
        "resize",
        debounce(() => window.drawBarChart(data, opts), 200)
      );
    }
  };
})();
