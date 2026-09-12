import { Router } from "express";
import { getTasks, getTaskById, createTask, updateTask } from "./maintenance.controller";

const router = Router();

router.get("/tasks", getTasks);
router.get("/tasks/:id", getTaskById);
router.post("/tasks", createTask);
router.patch("/tasks/:id", updateTask);

export default router;