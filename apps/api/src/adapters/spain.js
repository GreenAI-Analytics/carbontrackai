import { fetchJson } from "./utils.js";

const SPAIN_HINTS = {
  electricity: "electricidad",
  natural_gas: "gas natural",
  heating_oil: "gasoleo calefaccion",
  petrol_car_fuel: "gasolina",
  diesel_car_fuel: "gasoleo",
};

function deepFindNumber(node) {
  if (node == null) return null;

  if (typeof node === "number" && Number.isFinite(node)) {
    return node;
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const found = deepFindNumber(child);
      if (typeof found === "number") return found;
    }
    return null;
  }

  if (typeof node === "object") {
    const keys = ["factor", "value", "valor", "co2e", "emission_factor", "kgco2e"];
    for (const key of keys) {
      if (typeof node[key] === "number") return node[key];
    }

    for (const value of Object.values(node)) {
      const found = deepFindNumber(value);
      if (typeof found === "number") return found;
    }
  }

  return null;
}

export async function fetchSpainFactors(activityTypes) {
  const diagnostics = [];
  const factors = {};

  const catalogUrl = "https://catalogo.datosabiertos.miteco.gob.es/catalogo/openapi/datastore/";
  const catalogResponse = await fetchJson(catalogUrl);

  diagnostics.push({
    countryCode: "ES",
    provider: "miteco_api",
    activityType: "catalog",
    ok: catalogResponse.ok,
    status: catalogResponse.status,
  });

  if (!catalogResponse.ok || !catalogResponse.data) {
    return { factors, diagnostics };
  }

  const raw = JSON.stringify(catalogResponse.data).toLowerCase();

  for (const type of activityTypes) {
    const hint = SPAIN_HINTS[type] ?? type;
    if (!raw.includes(hint)) continue;

    const maybeValue = deepFindNumber(catalogResponse.data);
    if (typeof maybeValue === "number" && maybeValue > 0) {
      factors[type] = maybeValue;
    }
  }

  return { factors, diagnostics };
}
