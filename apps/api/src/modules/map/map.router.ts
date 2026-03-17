import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import {
  mapServicesQuerySchema,
  mapSuggestionsQuerySchema,
  type MapServicesQueryInput,
  type MapSuggestionsQueryInput
} from "./map.schemas";
import { listMapServices, listMapSuggestions, listSupportedMapTypes } from "./map.service";

export const mapRouter = Router();

mapRouter.get(
  "/services",
  validateRequest(mapServicesQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MapServicesQueryInput;
    const data = await listMapServices(query);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

mapRouter.get(
  "/suggestions",
  validateRequest(mapSuggestionsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as MapSuggestionsQueryInput;
    const data = await listMapSuggestions(query);

    res.status(200).json({
      ok: true,
      data
    });
  })
);

mapRouter.get("/types", (_req, res) => {
  res.status(200).json({
    ok: true,
    data: {
      items: listSupportedMapTypes()
    }
  });
});
