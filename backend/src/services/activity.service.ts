import {
  PrismaClient,
  ActivityType,
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

interface CreateActivityInput {
  projectId: string;
  taskId?: string;
  actorId: string;
  type: ActivityType;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export async function createActivity({
  projectId,
  taskId,
  actorId,
  type,
  message,
  metadata,
}: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      projectId,
      actorId,
      type,
      message,
      ...(taskId ? { taskId } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
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
}

export async function getProjectActivities(
  projectId: string,
  limit = 20
) {
  return prisma.activity.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
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
}

export async function getUserActivities(
  userId: string,
  limit = 20
) {
  return prisma.activity.findMany({
    where: {
      actorId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
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
}

export async function getRecentActivities(
  limit = 20
) {
  return prisma.activity.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      project: {
        select: {
          id: true,
          name: true,
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
}