import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middleware/error";
import healthRoutes from "./modules/health/routes";
import assetRoutes from "./modules/assets/routes";
import corridorRoutes from "./modules/corridors/routes";
import maintenanceRoutes from "./modules/maintenance/routes";
import trainRoutes from "./modules/trains/routes";
import blockRoutes from "./modules/blocks/routes";
import planningRoutes from "./modules/planning/routes";
import integrationRoutes from "./modules/integration/routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    name: "Automatic Railway Block Planning API",
    version: "1.0.0",
    status: "running",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/corridors", corridorRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/trains", trainRoutes);
app.use("/api/blocks", blockRoutes);
app.use("/api/planning", planningRoutes);
app.use("/api/integration", integrationRoutes);

app.use(errorHandler);

export default app;
