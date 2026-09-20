import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

interface JwtPayload {
  userId: string;
  role: Role;
}

let io: Server | null = null;

export function setupSocket(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const secret = process.env.ACCESS_TOKEN_SECRET;

      if (!secret) {
        return next(
          new Error("ACCESS_TOKEN_SECRET is not configured")
        );
      }

      const payload = jwt.verify(token, secret) as JwtPayload;

      socket.data.userId = payload.userId;
      socket.data.role = payload.role;

      next();
    } catch {
      next(new Error("Invalid or expired access token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;
    const role = socket.data.role as Role;

    socket.join(`user:${userId}`);

    await updatePresence(userId, true);

    socket.emit("presence:count", {
      count: io?.engine.clientsCount ?? 0,
    });

    socket.on("project:join", async (projectId: string) => {
      try {
        if (!projectId) {
          return;
        }

        const hasAccess = await canAccessProject(
          userId,
          role,
          projectId
        );

        if (!hasAccess) {
          socket.emit("socket:error", {
            message: "You do not have access to this project",
          });

          return;
        }

        socket.join(`project:${projectId}`);

        const activities = await prisma.activity.findMany({
          where: {
            projectId,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
          include: {
            actor: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            task: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        });

        socket.emit("activity:history", activities);
      } catch (error) {
        console.error("Project join error:", error);

        socket.emit("socket:error", {
          message: "Unable to join project",
        });
      }
    });

    socket.on("project:leave", (projectId: string) => {
      if (!projectId) {
        return;
      }

      socket.leave(`project:${projectId}`);
    });

    socket.on("disconnect", async () => {
      await updatePresence(userId, false);
    });
  });

  return io;
}

async function canAccessProject(
  userId: string,
  role: Role,
  projectId: string
): Promise<boolean> {
  if (role === Role.ADMIN) {
    return true;
  }

  if (role === Role.PROJECT_MANAGER) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        creatorId: userId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(project);
  }

  if (role === Role.DEVELOPER) {
    const task = await prisma.task.findFirst({
      where: {
        projectId,
        assignedDeveloperId: userId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(task);
  }

  return false;
}

async function updatePresence(
  userId: string,
  online: boolean
) {
  if (!io) {
    return;
  }

  io.emit("user:presence", {
    userId,
    online,
  });

  io.emit("presence:count", {
    count: io.engine.clientsCount,
  });
}

/**
 * Broadcast a new activity to everyone
 * currently viewing the project.
 */
export function emitActivity(
  projectId: string,
  activity: unknown
) {
  if (!io) {
    return;
  }

  io.to(`project:${projectId}`).emit(
    "activity:new",
    activity
  );
}

/**
 * Send a notification to one specific user.
 */
export function emitNotification(
  userId: string,
  notification: unknown
) {
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit(
    "notification:new",
    notification
  );
}

/**
 * Send unread notification count to one user.
 */
export function emitUnread(
  userId: string,
  count: number
) {
  if (!io) {
    return;
  }

  io.to(`user:${userId}`).emit(
    "notification:count",
    {
      count,
    }
  );
}

export function getIO(): Server {
  if (!io) {
    throw new Error(
      "Socket.IO has not been initialized"
    );
  }

  return io;
}