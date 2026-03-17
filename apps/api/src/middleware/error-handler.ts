import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  void next;

  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      ok: false,
      error: {
        message: error.message,
        details: error.details ?? null
      }
    });
  }

  return res.status(500).json({
    ok: false,
    error: {
      message: "Unexpected server error"
    }
  });
}
