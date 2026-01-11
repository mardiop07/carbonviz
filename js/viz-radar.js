window.drawRadar = function (data, { container }) {
  const el = d3.select(container);
  el.selectAll("*").remove();

  if (!data || data.length === 0) {
    el
      .append("div")
      .style("height", "100%")
      .style("min-height", "420px")
      .style("display", "flex")
      .style("align-items", "center")
      .style("justify-content", "center")
      .style("text-align", "center")
      .attr("class", "text-muted").html(`
      <div>
        <div style="font-size:32px; margin-bottom:8px;">📊</div>
        <div style="font-size:14px;">
          Sélectionne jusqu’à <b>4 sites</b> pour afficher le radar.
        </div>
      </div>
    `);
  }

  // Base de normalisation : toutes les données
  const base =
    window.globalData && window.globalData.length ? window.globalData : data;

  // Helpers
  const mb = (bytes) =>
    Number.isFinite(+bytes) ? +bytes / (1024 * 1024) : NaN;

  const finite = (v) => Number.isFinite(+v);

  const prettySite = (s) =>
    (s || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .trim();

  // ========= METRICS (axes) =========
  // better: "low" => petit = meilleur, "high" => grand = meilleur
  const metrics = [
    {
      key: "co2_grid_grams",
      label: "CO₂ (grid)",
      unit: "g",
      better: "low",
      get: (d) => +d.co2_grid_grams,
      fmt: (v) => `${v.toFixed(3)} g`,
    },
    {
      key: "energy_kWh",
      label: "Énergie",
      unit: "kWh",
      better: "low",
      get: (d) => +d.energy_kWh,
      fmt: (v) => `${v.toExponential(2)} kWh`,
    },
    {
      key: "size_mb",
      label: "Poids",
      unit: "MB",
      better: "low",
      get: (d) => mb(d.size_bytes),
      fmt: (v) => `${v.toFixed(2)} MB`,
    },
    {
      key: "green_saving_g",
      label: "Gain si vert",
      unit: "g",
      better: "high",
      get: (d) => {
        const g = +d.co2_grid_grams;
        const r = +d.co2_renewable_grams;
        return finite(g) && finite(r) ? Math.max(0, g - r) : NaN;
      },
      fmt: (v) => `${v.toFixed(3)} g`,
    },
    {
      key: "green_reduction_pct",
      label: "Réduction",
      unit: "%",
      better: "high",
      get: (d) => {
        const g = +d.co2_grid_grams;
        const r = +d.co2_renewable_grams;
        if (!finite(g) || !finite(r) || g <= 0) return NaN;
        return Math.max(0, Math.min(100, (1 - r / g) * 100));
      },
      fmt: (v) => `${v.toFixed(1)} %`,
    },
  ];

  // ========= LAYOUT =========
  const node = el.node();
  const rect = node.getBoundingClientRect();
  const width = Math.max(560, Math.floor(rect.width || 760));
  const height = 560;

  const margin = { top: 52, right: 180, bottom: 30, left: 30 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const radius = Math.min(innerW, innerH) / 2 - 20;
  const cx = margin.left + innerW / 2;
  const cy = margin.top + innerH / 2 + 5;

  const svg = el.append("svg").attr("width", width).attr("height", height);

  // Titre
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "800")
    .style("fill", "#2c3e50")
    .text("Profil de durabilité (plus grand = meilleur)");

  // Sous-titre explicatif
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 44)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("fill", "#6c757d")
    .text("Les axes pollution/poids/énergie sont inversés (moins = mieux).");

  const g = svg.append("g").attr("transform", `translate(${cx}, ${cy})`);

  const angle = (2 * Math.PI) / metrics.length;
  const scale = d3.scaleLinear().domain([0, 1]).range([0, radius]);

  // ========= NORMALISATION =========
  const ext = {};
  metrics.forEach((m) => {
    const vals = base.map(m.get).filter((v) => Number.isFinite(v));
    let min = d3.min(vals);
    let max = d3.max(vals);
    if (!Number.isFinite(min)) min = 0;
    if (!Number.isFinite(max)) max = 1;
    if (max === min) max = min + 1;
    ext[m.key] = { min, max };
  });

  function toScore01(metric, d) {
    const { min, max } = ext[metric.key];
    const x = metric.get(d);
    if (!Number.isFinite(x)) return 0; // manque => score bas
    let t = (x - min) / (max - min);
    t = Math.max(0, Math.min(1, t));
    return metric.better === "low" ? 1 - t : t;
  }

  // ========= GRID + TICKS =========
  const ticks = [0.25, 0.5, 0.75, 1];

  ticks.forEach((t) => {
    g.append("circle")
      .attr("r", scale(t))
      .attr("fill", "none")
      .attr("stroke", "#e9ecef");
  });

  // Tick labels (0/25/50/75/100)
  g.selectAll(".tick-label")
    .data(ticks)
    .enter()
    .append("text")
    .attr("class", "tick-label")
    .attr("x", 6)
    .attr("y", (d) => -scale(d) + 4)
    .style("font-size", "10px")
    .style("fill", "#adb5bd")
    .text((d) => `${Math.round(d * 100)}`);

  // ========= AXES + LABELS =========
  metrics.forEach((m, i) => {
    const a = i * angle - Math.PI / 2;

    // axe
    g.append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", radius * Math.cos(a))
      .attr("y2", radius * Math.sin(a))
      .attr("stroke", "#dee2e6");

    // label (avec unité + direction)
    const dir = m.better === "low" ? "↓" : "↑"; // vers l'extérieur = meilleur
    const label = `${m.label} (${m.unit}) ${dir}`;

    g.append("text")
      .attr("x", (radius + 18) * Math.cos(a))
      .attr("y", (radius + 18) * Math.sin(a))
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#34495e")
      .text(label);
  });

  // ========= TOOLTIP =========
  const tooltip = el
    .append("div")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("background", "rgba(255,255,255,0.98)")
    .style("border", "1px solid #e9ecef")
    .style("border-radius", "10px")
    .style("padding", "10px 12px")
    .style("box-shadow", "0 8px 24px rgba(0,0,0,0.08)")
    .style("font-size", "12px")
    .style("color", "#2c3e50")
    .style("max-width", "260px");

  function showTooltip(html, evt) {
    const bounds = el.node().getBoundingClientRect();
    tooltip
      .html(html)
      .style("opacity", 1)
      .style("left", `${evt.clientX - bounds.left + 12}px`)
      .style("top", `${evt.clientY - bounds.top + 12}px`);
  }
  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  // ========= LINE GENERATOR =========
  const line = d3
    .lineRadial()
    .radius((d) => scale(d.value))
    .angle((_, i) => i * angle)
    .curve(d3.curveLinearClosed);

  // ========= COLOR + LEGEND STATE =========
  const color = (i) => d3.schemeCategory10[i % 10];

  // garde l'état hide/show par site (persistant)
  window.__radarHidden = window.__radarHidden || {};
  const hidden = window.__radarHidden;

  // ========= DRAW SERIES =========
  const series = data.map((d, i) => ({
    d,
    i,
    name: prettySite(d.site),
    values: metrics.map((m) => ({
      metric: m,
      raw: m.get(d),
      score: toScore01(m, d),
    })),
  }));

  // Group par série
  const sG = g.append("g");

  series.forEach((s) => {
    const isHidden = !!hidden[s.name];
    const scores = s.values.map((v) => ({ value: v.score }));

    // fill
    sG.append("path")
      .datum(scores)
      .attr("d", line)
      .attr("fill", color(s.i))
      .attr("fill-opacity", isHidden ? 0 : 0.1)
      .attr("stroke", "none");

    // stroke
    sG.append("path")
      .datum(scores)
      .attr("d", line)
      .attr("fill", "none")
      .attr("stroke", color(s.i))
      .attr("stroke-width", 2.2)
      .attr("opacity", isHidden ? 0.15 : 0.95);

    // points (pour tooltip)
    s.values.forEach((v, idx) => {
      const a = idx * angle - Math.PI / 2;
      const r = scale(v.score);

      sG.append("circle")
        .attr("cx", r * Math.cos(a))
        .attr("cy", r * Math.sin(a))
        .attr("r", 4)
        .attr("fill", color(s.i))
        .attr("opacity", isHidden ? 0 : 0.95)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mousemove", (evt) => {
          const rawOk = Number.isFinite(v.raw);
          const rawTxt = rawOk ? v.metric.fmt(v.raw) : "N/A";
          const html = `
            <div style="font-weight:800; margin-bottom:6px;">${s.name}</div>
            <div><b>${v.metric.label}</b> (${v.metric.unit})</div>
            <div style="margin-top:4px;">Valeur : <b>${rawTxt}</b></div>
            <div>Score (0–100) : <b>${Math.round(v.score * 100)}</b></div>
            <div style="margin-top:6px; color:#6c757d; font-size:11px;">
              ${
                v.metric.better === "low"
                  ? "Moins est mieux (axe inversé)."
                  : "Plus est mieux."
              }
            </div>
          `;
          showTooltip(html, evt);
        })
        .on("mouseleave", hideTooltip);
    });
  });

  // ========= LEGEND (cliquable) =========
  const legendX = width - margin.right + 20;
  const legendY = margin.top + 20;

  const lg = svg
    .append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  lg.append("text")
    .attr("x", 0)
    .attr("y", -10)
    .style("font-size", "12px")
    .style("font-weight", "800")
    .style("fill", "#2c3e50")
    .text("Légende");

  const items = lg
    .selectAll(".legend-item")
    .data(series)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(0, ${i * 22})`)
    .style("cursor", "pointer")
    .on("click", (_, s) => {
      hidden[s.name] = !hidden[s.name];
      // redraw
      window.drawRadar(data, { container });
    });

  items
    .append("rect")
    .attr("x", 0)
    .attr("y", -10)
    .attr("width", 14)
    .attr("height", 14)
    .attr("rx", 3)
    .attr("fill", (s) => color(s.i))
    .attr("opacity", (s) => (hidden[s.name] ? 0.25 : 1));

  items
    .append("text")
    .attr("x", 20)
    .attr("y", 1)
    .style("font-size", "12px")
    .style("fill", "#2c3e50")
    .style("text-decoration", (s) => (hidden[s.name] ? "line-through" : "none"))
    .text((s) => s.name);

  lg.append("text")
    .attr("x", 0)
    .attr("y", series.length * 22 + 14)
    .style("font-size", "11px")
    .style("fill", "#6c757d")
    .text("Clique sur un site pour masquer/afficher.");

  // ========= NOTE "meilleur" =========
  g.append("text")
    .attr("x", 0)
    .attr("y", -radius - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "11px")
    .style("fill", "#6c757d")
    .text("Bord extérieur = meilleur");
};
