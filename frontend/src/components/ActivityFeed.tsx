import { useEffect, useState } from "react";
import { api } from "../api";
import { useSocket } from "../socket";
import type { Activity } from "../types";
export default function ActivityFeed({ projectId }: { projectId?: string }) {
  const { socket } = useSocket();
  const [items, setItems] = useState<Activity[]>([]);
  useEffect(() => {
    if (projectId) {
      api
        .get("/activity", { params: { projectId } })
        .then((r) => setItems(r.data.data));
      socket?.emit("project:join", projectId, (x: any) => {
        if (x.ok) setItems(x.events);
      });
    } else {
      api.get("/activity").then((r) => setItems(r.data.data));
      socket?.emit("activity:global:join", (x: any) => {
        if (x.ok) setItems(x.events);
      });
    }
    const on = (a: Activity) => {
      if (!projectId || a.project?.id === projectId)
        setItems((x) => [...x, a].slice(-20));
    };
    const onGlobal = (a: Activity) => {
      if (!projectId) setItems((x) => [...x, a].slice(-20));
    };
    socket?.on("activity:new", on);
    socket?.on("activity:global", onGlobal);
    return () => {
      socket?.off("activity:new", on);
      socket?.off("activity:global", onGlobal);
      if (projectId) socket?.emit("project:leave", projectId);
    };
  }, [projectId, socket]);
  return (
    <div className="card">
      <h3>Live Activity</h3>
      {items.length === 0 ? (
        <p className="muted">No activity yet.</p>
      ) : (
        items
          .slice()
          .reverse()
          .map((a) => (
            <div className="activity" key={a.id}>
              <b>{a.actor.name}</b> {a.message}
              <small>{new Date(a.createdAt).toLocaleString()}</small>
            </div>
          ))
      )}
    </div>
  );
}
