import { z } from "zod";

const activityTypeSchema = z.enum([
  "natural_gas",
  "heating_oil",
  "electricity",
  "petrol_car_fuel",
  "diesel_car_fuel",
]);

export const module1CalculationSchema = z.object({
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  reportingYear: z.number().int().min(2000).max(2100).optional(),
  qualityMode: z.enum(["estimate", "reporting"]).default("estimate"),
  records: z.array(
    z.object({
      id: z.string().optional(),
      activity_type: activityTypeSchema,
      quantity: z.number().nonnegative(),
      unit: z.string().min(1),
    })
  ).min(1),
});
