import { Router } from "express";
import Project from "../models/Project.js";
import Employee from "../models/Employee.js";
import { asyncHandler, auth, requireRole } from "../middleware/index.js";

const router = Router();

// POST /projects
router.post(
  "/",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  })
);

// GET /projects
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const projects = await Project.find().sort({ name: 1 });
    res.json(projects);
  })
);

// GET /projects/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
  })
);

// GET /projects/:id/employees
router.get(
  "/:id/employees",
  asyncHandler(async (req, res) => {
    const employees = await Employee.find({ project: req.params.id })
      .select("employee_code name email department role seat_allocation_status")
      .sort({ name: 1 });
    res.json(employees);
  })
);

export default router;
