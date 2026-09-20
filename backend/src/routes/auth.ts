import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, AppError } from "../utils/http.js";
import {
  hashToken,
  newRefreshToken,
  signAccess,
  verifyAccess,
} from "../utils/jwt.js";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
const login = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const refreshCookie = "refresh_token";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/api/auth",
};
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = login.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw new AppError(
        401,
        "INVALID_CREDENTIALS",
        "Invalid email or password",
      );
    const accessToken = signAccess({ sub: user.id, role: user.role });
    const refresh = newRefreshToken();
    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000),
      },
    });
    res.cookie(refreshCookie, refresh, {
      ...cookieOptions,
      maxAge: env.REFRESH_TOKEN_DAYS * 86400000,
    });
    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  }),
);
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[refreshCookie];
    if (!token)
      throw new AppError(401, "NO_REFRESH_TOKEN", "Refresh token missing");
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date())
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token invalid");
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const next = newRefreshToken();
    await prisma.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(next),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 86400000),
      },
    });
    res.cookie(refreshCookie, next, {
      ...cookieOptions,
      maxAge: env.REFRESH_TOKEN_DAYS * 86400000,
    });
    res.json({
      success: true,
      data: {
        accessToken: signAccess({
          sub: session.user.id,
          role: session.user.role,
        }),
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
        },
      },
    });
  }),
);
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[refreshCookie];
    if (token)
      await prisma.refreshSession.updateMany({
        where: { tokenHash: hashToken(token) },
        data: { revokedAt: new Date() },
      });
    res.clearCookie(refreshCookie, cookieOptions);
    res.json({ success: true });
  }),
);
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    res.json({ success: true, data: user });
  }),
);
export default router;
