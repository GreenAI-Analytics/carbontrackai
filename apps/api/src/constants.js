export const SUPPORTED_COUNTRY_CODES = ["FR", "ES", "IE"];

export const ACTIVITY_TYPES = [
  "natural_gas",
  "heating_oil",
  "electricity",
  "petrol_car_fuel",
  "diesel_car_fuel",
];

export const ACTIVITY_META = {
  natural_gas: {
    label: "Natural Gas",
    unit: "m3",
    scope: "scope_1",
    mwhPerUnit: 10.55 / 1000,
  },
  heating_oil: {
    label: "Heating Oil",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 10.35 / 1000,
  },
  electricity: {
    label: "Electricity",
    unit: "kWh",
    scope: "scope_2",
    mwhPerUnit: 1 / 1000,
  },
  petrol_car_fuel: {
    label: "Petrol (Company Car)",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 8.64 / 1000,
  },
  diesel_car_fuel: {
    label: "Diesel (Company Car)",
    unit: "L",
    scope: "scope_1",
    mwhPerUnit: 9.59 / 1000,
  },
};

export const FALLBACK_FACTORS = {
  natural_gas: 2.04,
  heating_oil: 2.96,
  electricity: 0.295,
  petrol_car_fuel: 2.31,
  diesel_car_fuel: 2.68,
};

// Ireland specific factors based on SEAI conversion factors (2024 provisional).
// Source page: https://www.seai.ie/data-and-insights/seai-statistics/conversion-factors/
export const IRELAND_SEAI_2024_FACTORS = {
  electricity: 0.2241, // kg CO2 / kWh
  natural_gas: 1.99, // kg CO2 / m3 (NCV basis)
  heating_oil: 2.951, // kg CO2 / L (residual fuel oil / fuel oil)
  petrol_car_fuel: 2.311, // kg CO2 / L
  diesel_car_fuel: 2.682, // kg CO2 / L
};

export const COUNTRY_PROVIDER = {
  FR: "ademe_api",
  ES: "miteco_api",
  IE: "seai_2024_static",
};
