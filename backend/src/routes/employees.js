import { Router } from "express";
import Employee from "../models/Employee.js";
import { asyncHandler, auth, requireRole } from "../middleware/index.js";

const router = Router();

// GET /employees?search=&project=&status=&department=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { search, project, status, department } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, parseInt(req.query.limit) || 25);

    const q = {};
    if (project) q.project = project;
    if (status) q.status = status;
    if (department) q.department = department;
    if (search) {
      q.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employee_code: { $regex: search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Employee.find(q)
        .populate("project", "name")
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Employee.countDocuments(q),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  })
);

// GET /employees/:id  (with current seat)
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const employee = await Employee.findById(req.params.id).populate(
      "project",
      "name manager_name"
    );
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  })
);

// POST /employees
router.post(
  "/",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  })
);

// PUT /employees/:id
router.put(
  "/:id",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  })
);

// DELETE /employees/:id  -> soft deactivate
router.delete(
  "/:id",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { status: "inactive" },
      { new: true }
    );
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json({ message: "Employee deactivated", employee });
  })
);

export default router;
