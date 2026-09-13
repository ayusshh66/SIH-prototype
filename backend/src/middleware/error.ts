import { NextFunction, Request, Response } from "express";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  const message = err instanceof Error ? err.message : "Internal server error";
  const statusCode =
    err instanceof Error && "statusCode" in err && typeof err.statusCode === "number"
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
