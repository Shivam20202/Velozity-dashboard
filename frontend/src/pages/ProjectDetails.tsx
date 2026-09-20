import { useEffect, useState } from "react";
import {
  useParams,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api";
import type {
  Project,
  Task,
  User,
  Priority,
} from "../types";
import TaskTable from "../components/TaskTable";
import ActivityFeed from "../components/ActivityFeed";
import { useAuth } from "../auth";
import { Plus, X, CalendarDays } from "lucide-react";

type ProjectDetailsData = Project & {
  tasks: Task[];
};

type TaskForm = {
  title: string;
  description: string;
  assignedDeveloperId: string;
  priority: Priority;
  dueDate: string;
};

const emptyTask: TaskForm = {
  title: "",
  description: "",
  assignedDeveloperId: "",
  priority: "MEDIUM",
  dueDate: "",
};

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [searchParams, setSearchParams] =
  useSearchParams();

  const [p, setP] =
    useState<ProjectDetailsData>();

  const [developers, setDevelopers] =
    useState<User[]>([]);

  const [showCreateTask, setShowCreateTask] =
    useState(false);

  const [taskForm, setTaskForm] =
    useState<TaskForm>(emptyTask);

  const [savingTask, setSavingTask] =
    useState(false);

  const [taskError, setTaskError] =
    useState("");

  const load = async () => {
    const r = await api.get(`/projects/${id}`);
    setP(r.data.data);
  };

  useEffect(() => {
    load().catch(console.error);
  }, [id]);

  const canManageTasks =
    user?.role === "ADMIN" ||
    user?.role === "PROJECT_MANAGER";

  const openCreateTask = async () => {
    try {
      setTaskError("");

      const r = await api.get("/users/developers");

      setDevelopers(r.data.data);
      setTaskForm(emptyTask);
      setShowCreateTask(true);
    } catch (error: any) {
      setTaskError(
        error?.response?.data?.error?.message ||
          "Unable to load developers.",
      );
    }
  };

  useEffect(() => {
  if (
    searchParams.get("createTask") === "true" &&
    canManageTasks
  ) {
    openCreateTask();

    searchParams.delete("createTask");
    setSearchParams(searchParams, {
      replace: true,
    });
  }
}, [searchParams, canManageTasks]);

  const closeCreateTask = () => {
    if (savingTask) return;

    setShowCreateTask(false);
    setTaskForm(emptyTask);
    setTaskError("");
  };

  const createTask = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!id) return;

    if (!taskForm.title.trim()) {
      setTaskError("Task title is required.");
      return;
    }

    if (!taskForm.assignedDeveloperId) {
      setTaskError(
        "Please select a developer.",
      );
      return;
    }

    if (!taskForm.dueDate) {
      setTaskError(
        "Please select a due date.",
      );
      return;
    }

    try {
      setSavingTask(true);
      setTaskError("");

      await api.post("/tasks", {
        projectId: id,
        title: taskForm.title.trim(),
        description:
          taskForm.description.trim() || undefined,
        assignedDeveloperId:
          taskForm.assignedDeveloperId,
        status: "TODO",
        priority: taskForm.priority,
        dueDate: taskForm.dueDate,
      });

      await load();

      closeCreateTask();
    } catch (error: any) {
      setTaskError(
        error?.response?.data?.error?.message ||
          "Unable to create task.",
      );
    } finally {
      setSavingTask(false);
    }
  };

  if (!p) {
    return (
      <div className="center">
        <p>Loading project...</p>
      </div>
    );
  }

  return (
    <div className="project-details">
      {/* Project Header */}
      <div className="project-header">
        <div className="project-header-info">
          <div className="project-title-row">
            <h1>{p.name}</h1>
          </div>

          {p.description && (
            <p className="muted project-description">
              {p.description}
            </p>
          )}
        </div>

        {canManageTasks && (
          <button
            type="button"
            className="create-task-button"
            onClick={openCreateTask}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="project-section">
        <div className="section-heading">
          <div>
            <h2>Tasks</h2>
            <p className="muted">
              Manage project tasks and assignments.
            </p>
          </div>

          {canManageTasks && (
            <button
              type="button"
              className="create-task-button secondary-create"
              onClick={openCreateTask}
            >
              <Plus size={16} />
              Create Task
            </button>
          )}
        </div>

        <TaskTable
          tasks={p.tasks}
          onChange={load}
        />
      </div>

      {/* Activity */}
      <div className="project-section">
        <ActivityFeed
          projectId={p.id}
        />
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div
          className="task-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeCreateTask();
            }
          }}
        >
          <div
            className="task-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-title"
          >
            {/* Modal Header */}
            <div className="task-modal-header">
              <div>
                <div className="task-modal-eyebrow">
                  PROJECT TASK
                </div>

                <h2 id="create-task-title">
                  Create Task
                </h2>

                <p>
                  Create a task and assign it to a
                  developer.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeCreateTask}
                disabled={savingTask}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={createTask}
              className="task-form"
            >
              {taskError && (
                <div className="task-form-error">
                  {taskError}
                </div>
              )}

              {/* Title */}
              <div className="form-field full-width">
                <label htmlFor="task-title">
                  Task Title
                  <span>*</span>
                </label>

                <input
                  id="task-title"
                  type="text"
                  value={taskForm.title}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      title: e.target.value,
                    })
                  }
                  placeholder="e.g. Build dashboard UI"
                  autoFocus
                  required
                />
              </div>

              {/* Description */}
              <div className="form-field full-width">
                <label htmlFor="task-description">
                  Description
                </label>

                <textarea
                  id="task-description"
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Describe what needs to be completed..."
                  rows={4}
                />
              </div>

              {/* Developer */}
              <div className="form-field">
                <label htmlFor="task-developer">
                  Developer
                  <span>*</span>
                </label>

                <select
                  id="task-developer"
                  value={
                    taskForm.assignedDeveloperId
                  }
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      assignedDeveloperId:
                        e.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select developer
                  </option>

                  {developers.map((dev) => (
                    <option
                      key={dev.id}
                      value={dev.id}
                    >
                      {dev.name} — {dev.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="form-field">
                <label htmlFor="task-priority">
                  Priority
                  <span>*</span>
                </label>

                <select
                  id="task-priority"
                  value={taskForm.priority}
                  onChange={(e) =>
                    setTaskForm({
                      ...taskForm,
                      priority:
                        e.target.value as Priority,
                    })
                  }
                  required
                >
                  <option value="LOW">
                    Low
                  </option>

                  <option value="MEDIUM">
                    Medium
                  </option>

                  <option value="HIGH">
                    High
                  </option>

                  <option value="CRITICAL">
                    Critical
                  </option>
                </select>
              </div>

              {/* Due Date */}
              <div className="form-field full-width">
                <label htmlFor="task-due-date">
                  Due Date
                  <span>*</span>
                </label>

                <div className="date-input-wrapper">
                  <CalendarDays
                    size={17}
                  />

                  <input
                    id="task-due-date"
                    type="date"
                    value={
                      taskForm.dueDate
                    }
                    onChange={(e) =>
                      setTaskForm({
                        ...taskForm,
                        dueDate:
                          e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="task-modal-footer">
                <button
                  type="button"
                  className="modal-cancel-button"
                  onClick={closeCreateTask}
                  disabled={savingTask}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-task-submit"
                  disabled={savingTask}
                >
                  <Plus size={17} />

                  {savingTask
                    ? "Creating..."
                    : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}