import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction) {
  return next(new HttpError(404, "Route not found"));
}
