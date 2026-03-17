import { z } from "zod";
import { mapServicesQuerySchema } from "../map/map.schemas";

const includeProductsSchema = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return true;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "si"].includes(normalized)) return true;
  if (["0", "false", "no"].includes(normalized)) return false;
  return true;
}, z.boolean());

export const exploreSearchQuerySchema = mapServicesQuerySchema.and(
  z.object({
    includeProducts: includeProductsSchema.default(true),
    category: z.preprocess((value) => {
      if (typeof value !== "string" || !value.trim()) return undefined;
      return value.trim().toUpperCase();
    }, z.string().optional())
  })
);

export type ExploreSearchQueryInput = z.infer<typeof exploreSearchQuerySchema>;
