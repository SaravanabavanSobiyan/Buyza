import app from "./app.js";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startEmailWorker, stopEmailWorker } from "./jobs/emailWorker.js";
import { assertSeoConfig } from "./config/site.js";

async function start() {
  assertSeoConfig();
  await connectDB();
  startEmailWorker();
  const server = app.listen(env.port, () => console.log(`API running on port ${env.port}`));
  let shuttingDown = false;

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] received ${signal}; shutting down`);

    try {
      await stopEmailWorker();
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await mongoose.disconnect();
    } catch (error) {
      console.error("[server] graceful shutdown failed:", error.message);
      process.exitCode = 1;
    }
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
