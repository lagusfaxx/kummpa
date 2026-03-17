import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { validateRequest } from "../../middleware/validate-request";
import { exploreSearchQuerySchema, type ExploreSearchQueryInput } from "./explore.schemas";
import { searchExplore } from "./explore.service";

export const exploreRouter = Router();

exploreRouter.get(
  "/search",
  validateRequest(exploreSearchQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as ExploreSearchQueryInput;
    const data = await searchExplore(query);

    res.status(200).json({ ok: true, data });
  })
);
