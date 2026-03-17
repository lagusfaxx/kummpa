import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { HttpError } from "../lib/http-error";

type ValidationTarget = "body" | "query" | "params";

export function validateRequest(schema: ZodTypeAny, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[target]);
    if (parsed.success) {
      (req as Record<ValidationTarget, unknown>)[target] = parsed.data;
      return next();
    }

    const error = parsed.error;
    return next(new HttpError(400, "Validation failed", error.flatten()));
  };
}
