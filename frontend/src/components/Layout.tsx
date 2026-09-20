import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useSocket } from "../socket";
import { logout, api } from "../api";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  FolderKanban,
  Users,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Notification } from "../types";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, setUser } = useAuth();
  const { socket, online } = useSocket();
  const nav = useNavigate();

  const [notes, setNotes] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] =
    useState(false);

  useEffect(() => {
    if (!user) return;

    api
      .get("/notifications")
      .then((r) => setNotes(r.data.data))
      .catch(console.error);

    const onNote = (n: Notification) => {
      setNotes((x) => [n, ...x]);
    };

    socket?.on("notification:new", onNote);

    return () => {
      socket?.off("notification:new", onNote);
    };
  }, [user, socket]);

  const unread = notes.filter((n) => !n.read).length;

  const handleNotificationClick = async (
    notification: Notification,
  ) => {
    try {
      if (!notification.read) {
        await api.patch(
          `/notifications/${notification.id}/read`,
        );

        setNotes((current) =>
          current.map((n) =>
            n.id === notification.id
              ? { ...n, read: true }
              : n,
          ),
        );
      }

      setShowNotifications(false);

      if (notification.projectId) {
        nav(`/projects/${notification.projectId}`);
      }
    } catch (error) {
      console.error(
        "Failed to open notification:",
        error,
      );
    }
  };

  const markAllRead = async () => {
    try {
      await api.post("/notifications/read-all");

      setNotes((current) =>
        current.map((n) => ({
          ...n,
          read: true,
        })),
      );
    } catch (error) {
      console.error(
        "Failed to mark notifications as read:",
        error,
      );
    }
  };

  return (
    <div className="app">
      <aside>
        <h2>Velozity</h2>

        <small>{user?.role}</small>

        <nav>
          <Link to="/">
            <LayoutDashboard />
            Dashboard
          </Link>

          <Link to="/projects">
            <FolderKanban />
            Projects
          </Link>

          {user?.role === "ADMIN" && (
            <Link to="/users">
              <Users />
              Users
            </Link>
          )}
        </nav>

        <button
          onClick={async () => {
            await logout();
            setUser(null);
            nav("/login");
          }}
        >
          <LogOut />
          Logout
        </button>
      </aside>

      <main>
        <header>
          <span>
            Live users: <b>{online}</b>
          </span>

          <div
            style={{
              position: "relative",
            }}
          >
            <button
              type="button"
              className="bell"
              onClick={() =>
                setShowNotifications((v) => !v)
              }
              style={{
                cursor: "pointer",
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Bell />

              {unread > 0 && (
                <span>{unread}</span>
              )}
            </button>

            {showNotifications && (
              <div
              className="notification-panel"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "45px",
                  width: "360px",
                  maxWidth: "calc(100vw - 40px)",
                  maxHeight: "420px",
                  overflowY: "auto",
                  zIndex: 1000,
                  padding: "0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    borderBottom:
                      "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <strong>
                    Notifications
                  </strong>

                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <Check size={14} />
                      Mark all read
                    </button>
                  )}
                </div>

                {notes.length === 0 ? (
                  <p
                    className="muted"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    No notifications
                  </p>
                ) : (
                  notes.map((notification) => (
                   <button
  key={notification.id}
  type="button"
  className={`notification-item ${
    notification.read ? "read" : "unread"
  }`}
  onClick={() =>
    handleNotificationClick(notification)
  }
>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            marginTop: "6px",
                            flexShrink: 0,
                            background:
                              notification.read
                                ? "transparent"
                                : "#4f9cff",
                          }}
                        />

                        <div>
                         <div className="notification-message">
  {notification.message}
</div>

                        <small className="notification-time">
                            {new Date(
                              notification.createdAt,
                            ).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <section>{children}</section>
      </main>
    </div>
  );
}