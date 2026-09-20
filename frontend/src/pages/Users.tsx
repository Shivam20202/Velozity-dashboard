import { useEffect, useState } from "react";
import { api } from "../api";
export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    api.get("/users").then((r) => setUsers(r.data.data));
  }, []);
  return (
    <div>
      <h1>Users</h1>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
