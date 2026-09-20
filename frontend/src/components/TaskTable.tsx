import { api } from "../api";
import type { Task, Status } from "../types";
import { useAuth } from "../auth";
export default function TaskTable({
  tasks,
  onChange,
}: {
  tasks: Task[];
  onChange: () => void;
}) {
  const { user } = useAuth();
  const update = async (t: Task, status: Status) => {
    await api.patch(`/tasks/${t.id}/status`, { status });
    onChange();
  };
  return (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Task</th>
            <th>Developer</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>
                <b>{t.title}</b>
                <small>{t.description}</small>
              </td>
              <td>{t.assignedDeveloper?.name || "-"}</td>
              <td>
                <span className={`pill ${t.priority.toLowerCase()}`}>
                  {t.priority}
                </span>
              </td>
              <td>
                {user?.role === "DEVELOPER" ? (
                  <select
                    value={t.status}
                    onChange={(e) => update(t, e.target.value as Status)}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                ) : (
                  t.status
                )}
              </td>
              <td>{new Date(t.dueDate).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
