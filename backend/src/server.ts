import http from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { setupSocket } from "./socket.js";
import { startOverdueJob } from "./jobs/overdue.js";
const server = http.createServer(app);
setupSocket(server);
startOverdueJob();
server.listen(env.PORT, () =>
  console.log(`API listening on http://localhost:${env.PORT}`),
);
process.on("SIGTERM", () => server.close());
