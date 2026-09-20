import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import ActivityFeed from "../components/ActivityFeed";
import TaskTable from "../components/TaskTable";
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>();
  const load = () => api.get("/dashboard").then((r) => setData(r.data.data));
  useEffect(() => {
    load();
  }, []);
  if (!data) return <p>Loading...</p>;
  return (
    <div>
      <div className="title">
        <div>
          <h1>Good to see you, {user?.name}</h1>
          <p className="muted">Role-aware operational overview</p>
        </div>
      </div>
      {user?.role === "ADMIN" && (
        <div className="stats">
          <div className="stat">
            <b>{data.projects}</b>
            <span>Projects</span>
          </div>
          <div className="stat">
            <b>{data.overdue}</b>
            <span>Overdue</span>
          </div>
          {data.tasksByStatus.map((x: any) => (
            <div className="stat" key={x.status}>
              <b>{x._count._all}</b>
              <span>{x.status}</span>
            </div>
          ))}
        </div>
      )}
      {user?.role === "PROJECT_MANAGER" && (
        <div className="stats">
          <div className="stat">
            <b>{data.projects}</b>
            <span>Your projects</span>
          </div>
          {data.tasksByPriority.map((x: any) => (
            <div className="stat" key={x.priority}>
              <b>{x._count._all}</b>
              <span>{x.priority}</span>
            </div>
          ))}
        </div>
      )}
      {user?.role === "DEVELOPER" && (
        <TaskTable tasks={data.tasks} onChange={load} />
      )}
      <ActivityFeed />
    </div>
  );
}
