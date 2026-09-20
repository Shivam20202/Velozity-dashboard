import { Router } from "express";
import { Role, ActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../utils/http.js";
import { assertProjectAccess } from "../services/access.service.js";
import { createActivity } from "../services/activity.service.js";
import { emitActivity } from "../socket.js";
const r = Router();
r.use(requireAuth);
const create = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  clientId: z.string().min(1),
});
const q = z.object({
  status: z
    .enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "OVERDUE"])
    .optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
r.get(
  "/",
  asyncHandler(async (req, res) => {
    const u = req.user!;
    const where: any = u.role === Role.ADMIN ? {} : { creatorId: u.id };
    const projects = await prisma.project.findMany({
      where,
      include: {
        client: true,
        creator: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: projects });
  }),
);
r.post(
  "/",
  requireRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(create),
  asyncHandler(async (req, res) => {
    const p = await prisma.project.create({
      data: { ...req.body, creatorId: req.user!.id },
    });
    const a = await createActivity({
      projectId: p.id,
      actorId: req.user!.id,
      type: ActivityType.PROJECT_CREATED,
      message: `${(await prisma.user.findUnique({ where: { id: req.user!.id } }))!.name} created project ${p.name}`,
    });
    emitActivity(p.id, a);
    res.status(201).json({ success: true, data: p });
  }),
);
r.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const p = await assertProjectAccess(
      req.user!,
      String(req.params.id)
    );

    const tasks = await prisma.task.findMany({
      where: {
        projectId: p.id,
        ...(() => {
          const x: any = {};

          if (req.query.status) {
            x.status = req.query.status;
          }

          if (req.query.priority) {
            x.priority = req.query.priority;
          }

          if (req.query.from || req.query.to) {
            x.dueDate = {};
          }

          if (req.query.from) {
            x.dueDate.gte = new Date(String(req.query.from));
          }

          if (req.query.to) {
            x.dueDate.lte = new Date(String(req.query.to));
          }

          return x;
        })(),
      },
      include: {
        assignedDeveloper: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
      ],
    });

    res.json({
      success: true,
      data: {
        ...p,
        tasks,
      },
    });
  }),
);
r.patch(
  "/:id",
  requireRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(create.partial()),
  asyncHandler(async (req, res) => {
    const p = await assertProjectAccess(req.user!, String(req.params.id))
    const updated = await prisma.project.update({
      where: { id: p.id },
      data: req.body,
    });
    res.json({ success: true, data: updated });
  }),
);
export default r;
