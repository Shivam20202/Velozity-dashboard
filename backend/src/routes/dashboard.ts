import { Router } from "express";
import { Role, TaskStatus } from "@prisma/client";

import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.use(requireAuth);

/**
 * Dashboard summary
 *
 * ADMIN:
 * - Total projects
 * - Tasks by status
 * - Overdue tasks
 *
 * PROJECT_MANAGER:
 * - Their projects
 * - Tasks by priority
 * - Upcoming due dates
 *
 * DEVELOPER:
 * - Assigned tasks only
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // --------------------------------------------------
    // ADMIN DASHBOARD
    // --------------------------------------------------
    if (user.role === Role.ADMIN) {
      const [projects, tasksByStatus, overdue] = await Promise.all([
        prisma.project.count(),

        prisma.task.groupBy({
          by: ["status"],
          _count: {
            _all: true,
          },
        }),

        prisma.task.count({
          where: {
            status: TaskStatus.OVERDUE,
          },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          role: user.role,
          projects,
          tasksByStatus,
          overdue,
        },
      });
    }

    // --------------------------------------------------
    // PROJECT MANAGER DASHBOARD
    // --------------------------------------------------
    if (user.role === Role.PROJECT_MANAGER) {
      const projectFilter = {
        project: {
          creatorId: user.id,
        },
      };

      const [projects, tasksByPriority, upcoming] =
        await Promise.all([
          // Projects created by this PM only
          prisma.project.count({
            where: {
              creatorId: user.id,
            },
          }),

          // Tasks belonging to this PM's projects
          prisma.task.groupBy({
            by: ["priority"],
            where: projectFilter,
            _count: {
              _all: true,
            },
          }),

          // Tasks due within the next 7 days
          prisma.task.findMany({
            where: {
              project: {
                creatorId: user.id,
              },
              dueDate: {
                gte: new Date(),
                lte: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000
                ),
              },
            },
            orderBy: {
              dueDate: "asc",
            },
            take: 10,
            include: {
              project: {
                select: {
                  id: true,
                  name: true,
                },
              },
              assignedDeveloper: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          }),
        ]);

      return res.json({
        success: true,
        data: {
          role: user.role,
          projects,
          tasksByPriority,
          upcoming,
        },
      });
    }

    // --------------------------------------------------
    // DEVELOPER DASHBOARD
    // --------------------------------------------------
    if (user.role === Role.DEVELOPER) {
      const tasks = await prisma.task.findMany({
        where: {
          assignedDeveloperId: user.id,
        },
        orderBy: [
          {
            priority: "desc",
          },
          {
            dueDate: "asc",
          },
        ],
        include: {
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        data: {
          role: user.role,
          tasks,
        },
      });
    }

    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have access to this dashboard",
      },
    });
  })
);

export default router;