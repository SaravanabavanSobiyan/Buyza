import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";
import seoRoutes from "./routes/seo.routes.js";
import healthRoutes from "./routes/health.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { protectCookieMutations, rejectMongoOperators } from "./middleware/security.js";

const app = express();
app.set("trust proxy", env.trustProxyHops);

app.use(
  helmet({
    hsts:
      env.isProd && env.enableHsts
        ? { maxAge: 31_536_000, includeSubDomains: false }
        : false,
  })
);
app.use(
  cors({
    origin: (origin, callback) =>
      !origin || env.allowedOrigins.includes(origin)
        ? callback(null, true)
        : callback(null, false),
    credentials: true,
  })
);
app.use("/api", apiLimiter);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(rejectMongoOperators);
app.use(protectCookieMutations);
if (env.nodeEnv !== "test") app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));

app.use("/health", healthRoutes);
app.use(seoRoutes);

app.use(
  "/uploads",
  express.static(fileURLToPath(new URL("../uploads", import.meta.url)), {
    setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
  })
);
app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
