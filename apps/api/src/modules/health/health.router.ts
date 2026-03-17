import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { prisma } from "../../lib/prisma";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        ok: true,
        status: "healthy",
        service: "kumpa-api",
        checks: {
          database: "up"
        },
        uptimeSeconds: Math.round(process.uptime()),
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      });
    } catch {
      res.status(503).json({
        ok: false,
        status: "degraded",
        service: "kumpa-api",
        checks: {
          database: "down"
        },
        responseTimeMs: Date.now() - startedAt,
        timestamp: new Date().toISOString()
      });
    }
  })
);
