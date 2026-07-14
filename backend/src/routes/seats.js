import { Router } from "express";
import Seat from "../models/Seat.js";
import {
  allocateSeat,
  releaseSeat,
  suggestSeats,
} from "../services/allocationService.js";
import { asyncHandler, auth, requireRole } from "../middleware/index.js";

const router = Router();

// GET /seats?floor=&zone=&status=&page=&limit=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { floor, zone, status } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 50);
    const q = {};
    if (floor) q.floor = Number(floor);
    if (zone) q.zone = zone;
    if (status) q.status = status;

    const [items, total] = await Promise.all([
      Seat.find(q)
        .populate("allocated_employee", "name employee_code")
        .populate("allocated_project", "name")
        .sort({ floor: 1, zone: 1, seat_number: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Seat.countDocuments(q),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  })
);

// GET /seats/available?floor=&zone=
router.get(
  "/available",
  asyncHandler(async (req, res) => {
    const { floor, zone } = req.query;
    const q = { status: "available" };
    if (floor) q.floor = Number(floor);
    if (zone) q.zone = zone;
    const seats = await Seat.find(q).limit(500).sort({ floor: 1, zone: 1 });
    res.json({ count: seats.length, items: seats });
  })
);

// GET /seats/suggest?projectId=  -> proximity-based suggestions
router.get(
  "/suggest",
  asyncHandler(async (req, res) => {
    const result = await suggestSeats(req.query.projectId, 10);
    res.json(result);
  })
);

// POST /seats
router.post(
  "/",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const seat = await Seat.create(req.body);
    res.status(201).json(seat);
  })
);

// POST /seats/allocate  { employeeId, seatId?, projectId? }
router.post(
  "/allocate",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const result = await allocateSeat(req.body);
    res.status(201).json(result);
  })
);

// POST /seats/release  { allocationId? employeeId? seatId? }
router.post(
  "/release",
  auth,
  requireRole("admin", "hr"),
  asyncHandler(async (req, res) => {
    const allocation = await releaseSeat(req.body);
    res.json({ message: "Seat released", allocation });
  })
);

export default router;
