import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";

import { openapiSpec } from "./swagger.js";
import { errorHandler } from "./middleware/index.js";

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import projectRoutes from "./routes/projects.js";
import seatRoutes from "./routes/seats.js";
import dashboardRoutes from "./routes/dashboard.js";
import aiRoutes from "./routes/ai.js";

export function createApp() {
  const app = express();

  const origins = (process.env.CLIENT_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim());
  app.use(cors({ origin: origins.includes("*") ? true : origins }));
  app.use(express.json());

  app.get("/", (req, res) =>
    res.json({ name: "Ethara Seat Allocation API", docs: "/docs", health: "/health" })
  );
  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get("/openapi.json", (req, res) => res.json(openapiSpec));

  app.use("/auth", authRoutes);
  app.use("/employees", employeeRoutes);
  app.use("/projects", projectRoutes);
  app.use("/seats", seatRoutes);
  app.use("/dashboard", dashboardRoutes);
  app.use("/ai", aiRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
