import { IRELAND_SEAI_2024_FACTORS } from "../constants.js";

export async function fetchIrelandFactors(activityTypes = []) {
  const factors = {};
  for (const type of activityTypes) {
    const value = IRELAND_SEAI_2024_FACTORS[type];
    if (typeof value === "number" && value > 0) {
      factors[type] = value;
    }
  }

  const diagnostics = [
    {
      countryCode: "IE",
      provider: "seai_2024_static",
      activityType: "conversion_factors",
      ok: true,
      status: 200,
    },
  ];

  return { factors, diagnostics };
}
