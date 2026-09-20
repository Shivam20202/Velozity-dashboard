import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import {
  requireAuth,
  requireRoles,
} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  asyncHandler,
  AppError,
} from "../utils/http.js";

const r = Router();

r.use(requireAuth);

const body = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
});

// Admin only: view all users
r.get(
  "/",
  requireRoles(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: users,
    });
  }),
);

// Admin + PM: get developers for task assignment
r.get(
  "/developers",
  requireRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  asyncHandler(async (_req, res) => {
    const developers = await prisma.user.findMany({
      where: {
        role: Role.DEVELOPER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      success: true,
      data: developers,
    });
  }),
);

// Admin only: create users
r.post(
  "/",
  requireRoles(Role.ADMIN),
  validate(body),
  asyncHandler(async (req, res) => {
    const exists = await prisma.user.findUnique({
      where: {
        email: req.body.email,
      },
    });

    if (exists) {
      throw new AppError(
        409,
        "EMAIL_EXISTS",
        "Email already exists",
      );
    }

    const u = await prisma.user.create({
      data: {
        ...req.body,
        passwordHash: await bcrypt.hash(
          req.body.password,
          12,
        ),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({
      success: true,
      data: u,
    });
  }),
);

export default r;