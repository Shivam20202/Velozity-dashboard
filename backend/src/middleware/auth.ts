import type { RequestHandler } from "express";
import { Role } from "@prisma/client";
import { verifyAccess } from "../utils/jwt.js";
import { AppError } from "../utils/http.js";
export const requireAuth: RequestHandler = (req, _res, next) => {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer "))
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  try {
    const p = verifyAccess(h.slice(7));
    req.user = { id: p.sub, role: p.role as Role };
    next();
  } catch {
    return next(
      new AppError(401, "INVALID_TOKEN", "Invalid or expired access token"),
    );
  }
};
export const requireRoles =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          "You do not have permission for this resource",
        ),
      );
    next();
  };
