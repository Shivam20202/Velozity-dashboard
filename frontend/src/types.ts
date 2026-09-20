export type Role =
  | "ADMIN"
  | "PROJECT_MANAGER"
  | "DEVELOPER";

export type Status =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "OVERDUE";

export type Priority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Client = {
  id: string;
  name: string;
  email?: string;
  company?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  clientId: string;
  client?: Client;
  creator?: {
    id?: string;
    name: string;
  };
  _count?: {
    tasks: number;
  };
};

export type Task = {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  assignedDeveloperId: string;
  assignedDeveloper?: {
    id: string;
    name: string;
  };
  status: Status;
  priority: Priority;
  dueDate: string;
  project?: {
    id: string;
    name: string;
    creatorId: string;
  };
};

export type Activity = {
  id: string;
  message: string;
  createdAt: string;
  actor: {
    name: string;
    role: Role;
  };
  task?: {
    id: string;
    title: string;
  };
  project?: {
    id: string;
    name: string;
  };
};

export type Notification = {
  id: string;
  projectId?: string;
  taskId?: string;
  message: string;
  read: boolean;
  createdAt: string;
};