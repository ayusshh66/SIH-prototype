import { Router } from "express";
import {
  getTasks,
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  recalculatePriority,
  completeTask,
} from "./maintenance.controller";

const router = Router();

router.get("/tasks/all", getAllTasks);
router.get("/tasks", getTasks);
router.post("/tasks", createTask);
router.get("/tasks/:id", getTaskById);
router.patch("/tasks/:id", updateTask);
router.post("/tasks/:id/recalculate-priority", recalculatePriority);
router.post("/tasks/:id/complete", completeTask);

export default router;
