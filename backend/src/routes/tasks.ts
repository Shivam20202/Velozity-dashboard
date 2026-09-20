import { Router } from "express";
import { Role, TaskStatus, ActivityType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler, AppError } from "../utils/http.js";
import {
  assertProjectAccess,
  assertTaskAccess,
} from "../services/access.service.js";
import { createActivity } from "../services/activity.service.js";
import { emitActivity, emitNotification, emitUnread } from "../socket.js";
const r = Router();
r.use(requireAuth);
const create = z.object({
  projectId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  assignedDeveloperId: z.string(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  dueDate: z.coerce.date(),
});
const status = z.object({ status: z.nativeEnum(TaskStatus) });
async function unread(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
r.post(
  "/",
  requireRoles(Role.ADMIN, Role.PROJECT_MANAGER),
  validate(create),
  asyncHandler(async (req, res) => {
    await assertProjectAccess(req.user!, req.body.projectId);
    const dev = await prisma.user.findUnique({
      where: { id: req.body.assignedDeveloperId },
    });
    if (!dev || dev.role !== Role.DEVELOPER)
      throw new AppError(
        400,
        "INVALID_DEVELOPER",
        "Assigned user must be a developer",
      );
    const task = await prisma.task.create({ data: req.body });
    const actor = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });
    const a = await createActivity({
      projectId: task.projectId,
      taskId: task.id,
      actorId: req.user!.id,
      type: ActivityType.TASK_ASSIGNED,
      message: `${actor!.name} assigned ${task.title} to ${dev.name}`,
      metadata: { developerId: dev.id },
    });
    emitActivity(task.projectId, a);
  const n = await prisma.notification.create({
  data: {
    userId: dev.id,
    projectId: task.projectId,
    taskId: task.id,
    message: `You were assigned ${task.title}`,
  },
});
    emitNotification(dev.id, n);
    emitUnread(dev.id, await unread(dev.id));
    res.status(201).json({ success: true, data: task });
  }),
);
r.get(
  "/",
  asyncHandler(async (req, res) => {
    const u = req.user!;
    const where: any = {};
    if (u.role === Role.DEVELOPER) where.assignedDeveloperId = u.id;
    else if (u.role === Role.PROJECT_MANAGER)
      where.project = { creatorId: u.id };
    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.from || req.query.to) where.dueDate = {};
    if (req.query.from) where.dueDate.gte = new Date(String(req.query.from));
    if (req.query.to) where.dueDate.lte = new Date(String(req.query.to));
    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, creatorId: true } },
        assignedDeveloper: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
    res.json({ success: true, data: tasks });
  }),
);
r.patch(
  "/:id/status",
  requireRoles(Role.ADMIN, Role.PROJECT_MANAGER, Role.DEVELOPER),
  validate(status),
  asyncHandler(async (req, res) => {
    const task = await assertTaskAccess(req.user!, String(req.params.id))
    if (
      req.user!.role === Role.PROJECT_MANAGER &&
      task.project.creatorId !== req.user!.id
    )
      throw new AppError(403, "FORBIDDEN", "Not your project");
    const old = task.status;
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: req.body.status },
    });
    const actor = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { name: true },
    });

    const a = await createActivity({
      projectId: task.projectId,
      taskId: task.id,
      actorId: req.user!.id,
      type: ActivityType.TASK_STATUS_CHANGED,
      message: `${actor!.name} moved ${task.title} from ${old} → ${updated.status}`,
      metadata: { from: old, to: updated.status },
    });
    emitActivity(task.projectId, a);
    if (
      updated.status === TaskStatus.IN_REVIEW &&
      task.project.creatorId !== req.user!.id
    ) {

    const n = await prisma.notification.create({
  data: {
    userId: task.project.creatorId,
    projectId: task.projectId,
    taskId: task.id,
    message: `${task.title} was moved to In Review`,
  },
});
      emitNotification(task.project.creatorId, n);
      emitUnread(task.project.creatorId, await unread(task.project.creatorId));
    }
    res.json({ success: true, data: updated });
  }),
);
export default r;
