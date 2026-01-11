// js/data-core.js
const DATA_PATH = "./data/website_pollut_clean.csv";

function num(v) {
  const n = +v;
  return Number.isFinite(n) ? n : NaN;
}

function parseRow(d) {
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

  return {
    site: d.site || d.url || d.website || "",
    country: d.country || d.pays || "",
    category: d.category || d.categorie || "Unknown",
    green_host: Boolean(num(d.green_host ?? d.green ?? d.host_green)),
    co2_grid_grams: num(d.co2_grid_grams ?? d.co2_grid ?? d.co2),
    energy_kWh: num(d.energy_kWh ?? d.energy),
    size_bytes: sizeKey ? num(d[sizeKey]) : NaN,
    cleaner_than: num(d.cleaner_than),
  };
}

function loadData() {
  return d3
    .csv(DATA_PATH, parseRow)
    .then((rows) => rows.filter((d) => d.site && d.country));
}
