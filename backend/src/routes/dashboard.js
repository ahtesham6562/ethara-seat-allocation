import { Router } from "express";
import Seat from "../models/Seat.js";
import Employee from "../models/Employee.js";
import { asyncHandler } from "../middleware/index.js";

const router = Router();

// GET /dashboard/summary
router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const [seatAgg, totalEmployees, pendingAllocation] = await Promise.all([
      Seat.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Employee.countDocuments({ status: { $ne: "inactive" } }),
      Employee.countDocuments({ seat_allocation_status: "pending", status: { $ne: "inactive" } }),
    ]);

    const byStatus = Object.fromEntries(seatAgg.map((s) => [s._id, s.count]));
    const totalSeats = seatAgg.reduce((n, s) => n + s.count, 0);

    res.json({
      total_employees: totalEmployees,
      total_seats: totalSeats,
      occupied_seats: byStatus.occupied || 0,
      available_seats: byStatus.available || 0,
      reserved_seats: byStatus.reserved || 0,
      maintenance_seats: byStatus.maintenance || 0,
      new_joiners_pending_allocation: pendingAllocation,
    });
  })
);

// GET /dashboard/project-utilization
router.get(
  "/project-utilization",
  asyncHandler(async (req, res) => {
    const data = await Seat.aggregate([
      { $match: { allocated_project: { $ne: null } } },
      { $group: { _id: "$allocated_project", occupied: { $sum: 1 } } },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $project: {
          _id: 0,
          project_id: "$_id",
          project: "$project.name",
          occupied_seats: "$occupied",
        },
      },
      { $sort: { occupied_seats: -1 } },
    ]);
    res.json(data);
  })
);

// GET /dashboard/floor-utilization
router.get(
  "/floor-utilization",
  asyncHandler(async (req, res) => {
    const data = await Seat.aggregate([
      {
        $group: {
          _id: "$floor",
          total: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ["$status", "occupied"] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
          reserved: { $sum: { $cond: [{ $eq: ["$status", "reserved"] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          floor: "$_id",
          total_seats: "$total",
          occupied: 1,
          available: 1,
          reserved: 1,
          occupancy_pct: {
            $round: [{ $multiply: [{ $divide: ["$occupied", "$total"] }, 100] }, 1],
          },
        },
      },
      { $sort: { floor: 1 } },
    ]);
    res.json(data);
  })
);

export default router;
