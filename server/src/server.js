import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startEmailWorker } from "./jobs/emailWorker.js";
import { assertSeoConfig } from "./config/site.js";

async function start() {
  assertSeoConfig();
  await connectDB();
  startEmailWorker();
  app.listen(env.port, () => console.log(`API running on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
