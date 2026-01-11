window.drawScatter = function (data, { container }) {
  d3.select(container).selectAll("*").remove();

  // ===============================
  // DIMENSIONS
  // ===============================
  const margin = { top: 70, right: 40, bottom: 90, left: 90 };
  const width = 760 - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // ===============================
  // FILTRE PAR PAYS
  // ===============================
  const countrySelect = d3.select("#scatter-country");

  if (!countrySelect.empty()) {
    const countries = [
      "ALL",
      ...new Set(data.map((d) => d.country).filter(Boolean)),
    ];

    countrySelect
      .selectAll("option")
      .data(countries)
      .join("option")
      .attr("value", (d) => d)
      .text((d) => (d === "ALL" ? "Tous les pays" : d));

    countrySelect.on("change", () => {
      window.drawScatter(window.globalData, { container });
    });
  }

  const selectedCountry = countrySelect.empty()
    ? "ALL"
    : countrySelect.property("value");

  const filteredData =
    selectedCountry === "ALL"
      ? data
      : data.filter((d) => d.country === selectedCountry);

  // ===============================
  // PRÉPARATION DES DONNÉES
  // ===============================
  const cleanData = filteredData
    .filter(
      (d) =>
        Number.isFinite(d.size_bytes) &&
        d.size_bytes > 0 &&
        Number.isFinite(d.co2_grid_grams) &&
        Number.isFinite(d.energy_kWh)
    )
    .map((d) => ({
      ...d,
      size_mb: d.size_bytes / 1_000_000,
    }));

  if (cleanData.length === 0) {
    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#999")
      .text("Aucune donnée disponible");
    return;
  }

  // ===============================
  // ÉCHELLES
  // ===============================
  const x = d3
    .scaleLog()
    .domain(d3.extent(cleanData, (d) => d.size_mb))
    .range([0, width])
    .nice();

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(cleanData, (d) => d.co2_grid_grams)])
    .nice()
    .range([height, 0]);

  const categories = [...new Set(cleanData.map((d) => d.category))];

  // ===============================
  // ÉTAT DE VISIBILITÉ DES CATÉGORIES
  // ===============================
  window.scatterCategoryState = window.scatterCategoryState || {};

  categories.forEach(cat => {
    if (!(cat in window.scatterCategoryState)) {
      window.scatterCategoryState[cat] = true;
    }
  });

  const color = d3
    .scaleOrdinal()
    .domain(categories)
    .range(d3.schemeSet2.concat(d3.schemeTableau10));


  const radius = d3
    .scaleSqrt()
    .domain(d3.extent(cleanData, (d) => d.energy_kWh))
    .range([4, 12]);

  // ===============================
  // AXE X — LOGARITHMIQUE CONTRÔLÉ
  // ===============================
  const xTicks = [0.1, 0.3, 1, 3, 10];

  svg
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues(xTicks)
        .tickFormat((d) => `${d} MB`)
    )
    .call((g) => g.select(".domain").attr("stroke", "#444"))
    .call((g) => g.selectAll(".tick line").attr("stroke", "#ccc"))
    .append("text")
    .attr("x", width / 2)
    .attr("y", 55)
    .attr("fill", "#000")
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Taille de la page (MB – échelle logarithmique)");

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height + 75)
    .attr("text-anchor", "middle")
    .attr("font-size", "11px")
    .attr("fill", "#666")
    .text("Échelle logarithmique : comparaison par ordres de grandeur");

  // ===============================
  // AXE Y
  // ===============================
  svg
    .append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -70)
    .attr("fill", "#000")
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text("Émissions de CO₂ (g – réseau électrique)");

  // ===============================
  // LIGNE DE TENDANCE
  // ===============================
  const trend = d3
    .line()
    .x((d) => x(d.size_mb))
    .y((d) => y(d.co2_grid_grams));

  svg
    .append("path")
    .datum([...cleanData].sort((a, b) => a.size_mb - b.size_mb))
    .attr("fill", "none")
    .attr("stroke", "#333")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "6 4")
    .attr("d", trend);

  // ===============================
  // OUTLIERS (TOP 10 % CO₂)
  // ===============================
  const threshold = d3.quantile(
    cleanData.map((d) => d.co2_grid_grams).sort(d3.ascending),
    0.9
  );

  // ===============================
  // TOOLTIP
  // ===============================
  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "scatter-tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  function showTooltip(event, d) {
    tooltip.style("opacity", 1).html(`
        <strong>${d.site.replace(/^https?:\/\//, "")}</strong><br/>
        Catégorie : ${d.category}<br/>
        Pays : ${d.country}<br/>
        Taille : ${d.size_mb.toFixed(2)} MB<br/>
        Énergie : ${d.energy_kWh.toExponential(2)} kWh<br/>
        CO₂ : ${d.co2_grid_grams.toFixed(3)} g
      `);
  }

  function moveTooltip(event) {
    tooltip
      .style("left", event.pageX + 12 + "px")
      .style("top", event.pageY - 28 + "px");
  }

  function hideTooltip() {
    tooltip.style("opacity", 0);
  }

  // ===============================
  // POINTS — NON VERTS
  // ===============================
  svg
    .selectAll(".point-circle")
    .data(cleanData.filter((d) => !d.green_host))
    .enter()
    .append("circle")
    .attr("cx", (d) => x(d.size_mb))
    .attr("cy", (d) => y(d.co2_grid_grams))
    .attr("r", (d) => radius(d.energy_kWh))
    .attr("fill", (d) => color(d.category))
    .attr("opacity", 0.85)
    .attr("stroke", (d) => (d.co2_grid_grams >= threshold ? "#000" : "none"))
    .attr("stroke-width", (d) => (d.co2_grid_grams >= threshold ? 2 : 0))
    .attr(
      "class",
      (d) => `scatter-point cat-${d.category.replace(/[^a-zA-Z0-9]/g, "")}`
    )
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // ===============================
  // POINTS — VERTS
  // ===============================
  const cross = d3.symbol().type(d3.symbolCross).size(80);

  svg
    .selectAll(".point-cross")
    .data(cleanData.filter((d) => d.green_host))
    .enter()
    .append("path")
    .attr("d", cross)
    .attr(
      "transform",
      (d) => `translate(${x(d.size_mb)},${y(d.co2_grid_grams)})`
    )
    .attr("fill", (d) => color(d.category))
    .attr("opacity", 0.85)
    .attr("stroke", (d) => (d.co2_grid_grams >= threshold ? "#000" : "none"))
    .attr("stroke-width", (d) => (d.co2_grid_grams >= threshold ? 1.5 : 0))
    .attr(
      "class",
      (d) => `scatter-point cat-${d.category.replace(/[^a-zA-Z0-9]/g, "")}`
    )
    .on("mouseover", showTooltip)
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // ===============================
  // TITRE
  // ===============================
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", -35)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Facteurs techniques et empreinte carbone des sites web");

  // ===============================
  // LÉGENDE
  // ===============================
  const legendContainer = d3.select("#scatter-legend");

  legendContainer.selectAll("*").remove();

  /* ---------- LÉGENDE COULEURS (CATÉGORIES) ---------- */
  const legendCat = legendContainer.append("div").attr("class", "mb-3");

  legendCat
    .append("div")
    .attr("class", "fw-semibold mb-1")
    .text("Catégorie du site");

  categories.forEach((cat) => {
  const className = `cat-${cat.replace(/[^a-zA-Z0-9]/g, "")}`;

  const row = legendCat
    .append("div")
    .attr("class", "d-flex align-items-center mb-1 legend-item")
    .style("cursor", "pointer")
    .style("opacity", window.scatterCategoryState[cat] ? 1 : 0.4)
    .on("click", () => {
      // Toggle état
      window.scatterCategoryState[cat] = !window.scatterCategoryState[cat];

      // Mise à jour des points
      d3.selectAll(`.${className}`)
        .transition()
        .duration(200)
        .style(
          "opacity",
          window.scatterCategoryState[cat] ? 0.85 : 0.05
        );

      // Mise à jour visuelle de la légende
      row.style(
        "opacity",
        window.scatterCategoryState[cat] ? 1 : 0.4
      );
    });

    row
      .append("span")
      .style("width", "12px")
      .style("height", "12px")
      .style("background-color", color(cat))
      .style("display", "inline-block")
      .style("border-radius", "50%")
      .style("margin-right", "8px");

    row
      .append("span")
      .style("font-size", "12px")
      .text(cat);
});


  /* ---------- LÉGENDE FORMES (HÉBERGEMENT) ---------- */
  const legendShape = legendContainer.append("div").attr("class", "mb-3");

  legendShape
    .append("div")
    .attr("class", "fw-semibold mb-1")
    .text("Type d’hébergement");

  const shapeItems = [
    { label: "Hébergement standard", symbol: "●" },
    { label: "Hébergement vert", symbol: "✚" },
  ];

  shapeItems.forEach((d) => {
    const row = legendShape
      .append("div")
      .attr("class", "d-flex align-items-center mb-1");

    row
      .append("span")
      .style("width", "14px")
      .style("text-align", "center")
      .style("margin-right", "8px")
      .style("font-size", "14px")
      .text(d.symbol);

    row.append("span").style("font-size", "12px").text(d.label);
  });

  /* ---------- LÉGENDE TAILLE (ÉNERGIE) ---------- */
  const legendSize = legendContainer.append("div");

  legendSize
    .append("div")
    .attr("class", "fw-semibold mb-1")
    .text("Énergie consommée");

  legendSize
    .append("div")
    .style("font-size", "12px")
    .text("Plus le point est grand, plus l’énergie consommée est élevée");
};
