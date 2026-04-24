import { fetchJson } from "./utils.js";

const ADEME_ACTIVITY_HINT = {
  electricity: "electricite",
  natural_gas: "gaz",
  heating_oil: "fioul",
  petrol_car_fuel: "essence",
  diesel_car_fuel: "gazole",
};

function pickNumericValue(node) {
  if (node == null) return null;

  if (typeof node === "number" && Number.isFinite(node)) {
    return node;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = pickNumericValue(child);
      if (typeof found === "number") return found;
    }
    return null;
  }

  if (typeof node === "object") {
    const keys = ["co2e", "valeur", "value", "facteur", "total", "kgco2e"];
    for (const key of keys) {
      if (typeof node[key] === "number") return node[key];
    }

    for (const value of Object.values(node)) {
      const found = pickNumericValue(value);
      if (typeof found === "number") return found;
    }
  }

  return null;
}

export async function fetchFranceFactors(activityTypes) {
  const factors = {};
  const diagnostics = [];

  for (const type of activityTypes) {
    const hint = ADEME_ACTIVITY_HINT[type] ?? type;
    const url = `https://data.ademe.fr/api-base-carbone/v1/facteurs?nom=${encodeURIComponent(hint)}&pays=France`;

    const response = await fetchJson(url);
    diagnostics.push({ countryCode: "FR", provider: "ademe_api", activityType: type, ok: response.ok, status: response.status });

    if (!response.ok || !response.data) continue;

    const parsed = pickNumericValue(response.data);
    if (typeof parsed === "number" && parsed > 0) {
      factors[type] = parsed;
    }
  }

  return { factors, diagnostics };
}
