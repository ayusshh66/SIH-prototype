import express from "express";
import cors from "cors";

// Import all module routes
import maintenanceRoutes from "./modules/maintenance/maintenance.routes";
import assetsRoutes from "./modules/assets/assets.routes";
import corridorsRoutes from "./modules/corridors/corridors.routes";
import trainsRoutes from "./modules/trains/trains.routes";
import blocksRoutes from "./modules/blocks/blocks.routes";
import planningRoutes from "./modules/planning/planning.routes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
const apiRouter = express.Router();

apiRouter.use("/", maintenanceRoutes);
apiRouter.use("/", assetsRoutes);
apiRouter.use("/", corridorsRoutes);
apiRouter.use("/", trainsRoutes);
apiRouter.use("/", blocksRoutes);
apiRouter.use("/", planningRoutes);

// Mount the API router
app.use("/api", apiRouter);

// Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

export default app;