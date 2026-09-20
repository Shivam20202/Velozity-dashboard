import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import type { Client, Project } from "../types";
import { useAuth } from "../auth";
import {
  ArrowRight,
  FolderKanban,
  Pencil,
  Plus,
} from "lucide-react";

type ProjectForm = {
  name: string;
  description: string;
  clientId: string;
};

const emptyForm: ProjectForm = {
  name: "",
  description: "",
  clientId: "",
};

export default function Projects() {
  const [items, setItems] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] =
    useState<ProjectForm>(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showModal, setShowModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const { user } = useAuth();
  const navigate = useNavigate();

  const canManageProjects =
    user?.role === "ADMIN" ||
    user?.role === "PROJECT_MANAGER";

  const loadProjects = async () => {
    const r = await api.get("/projects");
    setItems(r.data.data);
  };

  const loadClients = async () => {
    const r = await api.get("/clients");
    setClients(r.data.data);
  };

  useEffect(() => {
    loadProjects().catch(console.error);

    if (canManageProjects) {
      loadClients().catch(console.error);
    }
  }, [canManageProjects]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  };

  const openEdit = (project: Project) => {
    setEditingId(project.id);

    setForm({
      name: project.name,
      description: project.description ?? "",
      clientId: project.clientId,
    });

    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!form.clientId) {
      setError("Please select a client.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: form.name.trim(),
        description:
          form.description.trim() || undefined,
        clientId: form.clientId,
      };

      if (editingId) {
        await api.patch(
          `/projects/${editingId}`,
          payload,
        );
      } else {
        await api.post(
          "/projects",
          payload,
        );
      }

      await loadProjects();
      closeModal();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error?.message ||
          "Unable to save project. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="projects-page">
      {/* Page Header */}
      <div className="projects-page-header">
        <div>
          <div className="projects-title-row">
            <FolderKanban size={24} />
            <h1>Projects</h1>
          </div>

          <p className="muted projects-subtitle">
            View projects, manage tasks and track activity.
          </p>
        </div>

        {canManageProjects && (
          <button
            type="button"
            className="create-project-button"
            onClick={openCreate}
          >
            <Plus size={18} />
            Create Project
          </button>
        )}
      </div>

      {/* Project Grid */}
      {items.length > 0 ? (
        <div className="projects-grid">
          {items.map((p) => {
            const canEdit =
              user?.role === "ADMIN" ||
              (user?.role ===
                "PROJECT_MANAGER" &&
                p.creatorId === user.id);

            return (
              <div
                className="project-card"
                key={p.id}
              >
                {/* Main Project Link */}
                <Link
                  to={`/projects/${p.id}`}
                  className="project-card-main"
                >
                  <div className="project-card-heading">
                    <div>
                      <h3>{p.name}</h3>

                      <span className="project-open-hint">
                        View tasks & activity
                      </span>
                    </div>

                    <ArrowRight
                      size={20}
                      className="project-card-arrow"
                    />
                  </div>

                  <p className="project-card-description">
                    {p.description ||
                      "No description provided."}
                  </p>

                  <div className="project-card-meta">
                    <span>
                      {p.client?.name ||
                        "No client"}
                    </span>

                    <span>
                      {p._count?.tasks ?? 0}{" "}
                      {p._count?.tasks === 1
                        ? "task"
                        : "tasks"}
                    </span>
                  </div>

                  <div className="project-owner">
                    Owner:{" "}
                    <strong>
                      {p.creator?.name ||
                        "Unknown"}
                    </strong>
                  </div>
                </Link>

                {/* Primary Actions */}
                <div className="project-card-actions">
                  <Link
                    to={`/projects/${p.id}`}
                    className="project-view-button"
                  >
                    <FolderKanban size={16} />
                    View Project
                  </Link>

                  {canManageProjects && (
                    <button
                      type="button"
                      className="project-task-button"
                      onClick={() =>
                        navigate(
                          `/projects/${p.id}?createTask=true`,
                        )
                      }
                    >
                      <Plus size={16} />
                      Create Task
                    </button>
                  )}
                </div>

                {/* Edit */}
                {canEdit && (
                  <button
                    type="button"
                    className="project-edit-button"
                    onClick={() =>
                      openEdit(p)
                    }
                  >
                    <Pencil size={15} />
                    Edit Project
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="projects-empty">
          <FolderKanban size={30} />

          <h3>No projects found</h3>

          <p>
            No projects are currently visible
            for your role.
          </p>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {showModal && (
        <div
          className="project-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="project-modal"
          >
            {/* Modal Header */}
            <div className="project-modal-header">
              <div>
                <span className="modal-eyebrow">
                  PROJECT MANAGEMENT
                </span>

                <h2>
                  {editingId
                    ? "Edit Project"
                    : "Create Project"}
                </h2>

                <p>
                  {editingId
                    ? "Update project information."
                    : "Create a new project and assign a client."}
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="project-form-error">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="project-form">
              <div className="project-form-field">
                <label htmlFor="project-name">
                  Project Name
                  <span>*</span>
                </label>

                <input
                  id="project-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Website Redesign"
                  required
                />
              </div>

              <div className="project-form-field">
                <label htmlFor="project-description">
                  Description
                </label>

                <textarea
                  id="project-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description:
                        e.target.value,
                    })
                  }
                  placeholder="Describe the project..."
                  rows={4}
                />
              </div>

              <div className="project-form-field">
                <label htmlFor="project-client">
                  Client
                  <span>*</span>
                </label>

                <select
                  id="project-client"
                  value={form.clientId}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      clientId: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    Select client
                  </option>

                  {clients.map((client) => (
                    <option
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                      {client.company
                        ? ` — ${client.company}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="project-modal-footer">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="create-project-submit"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Project"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}