import Seat from "../models/Seat.js";
import Employee from "../models/Employee.js";
import SeatAllocation from "../models/SeatAllocation.js";

/**
 * Suggest available seats for an employee, prioritizing proximity to their
 * project team. "Proximity" = zone/bay where the project already occupies the
 * most seats. Falls back to any available seat (alternate zones) if the
 * preferred area is full.
 *
 * @returns {Promise<{preferred: Seat[], alternate: Seat[]}>}
 */
export async function suggestSeats(projectId, limit = 10) {
  // Find the busiest zone/bay for this project (its "team area")
  const clusters = await Seat.aggregate([
    { $match: { allocated_project: projectId ? toObjId(projectId) : null } },
    { $group: { _id: { zone: "$zone", bay: "$bay", floor: "$floor" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 },
  ]);

  let preferred = [];
  if (clusters.length) {
    const { zone, bay, floor } = clusters[0]._id;
    preferred = await Seat.find({
      status: "available",
      zone,
      bay,
      floor,
    }).limit(limit);
    if (preferred.length < limit) {
      // Widen to the whole zone/floor
      const more = await Seat.find({
        status: "available",
        zone,
        floor,
        _id: { $nin: preferred.map((s) => s._id) },
      }).limit(limit - preferred.length);
      preferred = preferred.concat(more);
    }
  }

  const alternate = await Seat.find({
    status: "available",
    _id: { $nin: preferred.map((s) => s._id) },
  }).limit(limit);

  return { preferred, alternate };
}

/**
 * Allocate a seat to an employee. Atomic & safe on standalone MongoDB.
 * If seatId omitted, auto-picks the best suggested seat.
 *
 * Business rules enforced:
 *  - one active seat per employee (partial unique index on SeatAllocation.employee)
 *  - one active employee per seat (guarded status update + partial unique index)
 *  - reserved/maintenance seats cannot be allocated
 */
export async function allocateSeat({ employeeId, seatId, projectId }) {
  const employee = await Employee.findById(employeeId);
  if (!employee) throw httpError(404, "Employee not found");

  // Reject if employee already has an active allocation
  const existing = await SeatAllocation.findOne({
    employee: employeeId,
    allocation_status: "active",
  });
  if (existing) throw httpError(409, "Employee already has an active seat");

  const project = projectId || employee.project || null;

  // Resolve target seat
  let targetSeatId = seatId;
  if (!targetSeatId) {
    const { preferred, alternate } = await suggestSeats(project, 1);
    const pick = preferred[0] || alternate[0];
    if (!pick) throw httpError(409, "No available seats");
    targetSeatId = pick._id;
  }

  // Atomically claim the seat: only succeeds if still available
  const seat = await Seat.findOneAndUpdate(
    { _id: targetSeatId, status: "available" },
    {
      status: "occupied",
      allocated_employee: employeeId,
      allocated_project: project,
      allocation_date: new Date(),
    },
    { new: true }
  );
  if (!seat) throw httpError(409, "Seat is not available");

  // Create the allocation record
  let allocation;
  try {
    allocation = await SeatAllocation.create({
      employee: employeeId,
      seat: seat._id,
      project,
      allocation_status: "active",
      allocation_date: new Date(),
    });
  } catch (e) {
    // Roll back the seat claim on any failure (e.g. dup active employee)
    await Seat.updateOne(
      { _id: seat._id },
      { status: "available", allocated_employee: null, allocated_project: null, allocation_date: null }
    );
    if (e.code === 11000) throw httpError(409, "Employee already has an active seat");
    throw e;
  }

  employee.seat_allocation_status = "allocated";
  if (employee.status === "new_joiner") employee.status = "active";
  await employee.save();

  return { allocation, seat };
}

/**
 * Release a seat. Identify by allocationId, employeeId, or seatId.
 * Released seats become available again.
 */
export async function releaseSeat({ allocationId, employeeId, seatId }) {
  const query = { allocation_status: "active" };
  if (allocationId) query._id = allocationId;
  else if (employeeId) query.employee = employeeId;
  else if (seatId) query.seat = seatId;
  else throw httpError(400, "Provide allocationId, employeeId, or seatId");

  const allocation = await SeatAllocation.findOne(query);
  if (!allocation) throw httpError(404, "No active allocation found");

  allocation.allocation_status = "released";
  allocation.released_date = new Date();
  await allocation.save();

  await Seat.updateOne(
    { _id: allocation.seat },
    {
      status: "available",
      allocated_employee: null,
      allocated_project: null,
      allocation_date: null,
    }
  );

  await Employee.updateOne(
    { _id: allocation.employee },
    { seat_allocation_status: "pending" }
  );

  return allocation;
}

// --- helpers ---
import mongoose from "mongoose";
function toObjId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}
export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
