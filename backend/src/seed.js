import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import Project from "./models/Project.js";
import Employee from "./models/Employee.js";
import Seat from "./models/Seat.js";
import SeatAllocation from "./models/SeatAllocation.js";
import User from "./models/User.js";

// ---- config (meets assessment section 6 quotas) ----
const PROJECT_NAMES = [
  "Indigo", "Indreed", "Mydreed", "Preed", "Serfy", "Oreed",
  "bedegreed", "Opreed", "Serry", "Kaary", "Mered",
];
const FLOORS = 5;                 // >= 5
const ZONES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]; // 10 zones
const BAYS_PER_ZONE = 5;
const SEATS_PER_BAY = 22;         // 5 floors * 10 zones * 5 bays * 22 = 5500 seats

const TOTAL_EMPLOYEES = 5000;
const ALLOCATED = 4800;           // occupied seats
const PENDING = TOTAL_EMPLOYEES - ALLOCATED; // 200 pending (>=50)
const RESERVED = 100;             // >=100
const MAINTENANCE = 50;
// available = 5500 - 4800 - 100 - 50 = 550 (>=500)

const FIRST = ["Amit","Priya","Rahul","Sara","Vikram","Neha","Arjun","Divya","Karan","Meera","Rohan","Anjali","Sai","Isha","Dev","Tara","Nikhil","Pooja","Aditya","Ria","Manish","Kavya","Yash","Sneha","Varun","Ananya","Raj","Simran","Aman","Zoya"];
const LAST = ["Sharma","Verma","Rao","Iyer","Nair","Gupta","Singh","Patel","Reddy","Das","Khan","Menon","Bose","Joshi","Malhotra","Chopra","Kapoor","Bhat","Pillai","Sethi"];
const DEPTS = ["Engineering","Design","HR","Finance","Growth","Operations","Product","Sales","Support","Data"];
const ROLES = ["Engineer","Senior Engineer","Designer","Manager","Analyst","Lead","Associate","Specialist"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function run() {
  await connectDB(process.env.MONGODB_URI);
  console.log("Clearing existing data...");
  await Promise.all([
    Project.deleteMany({}),
    Employee.deleteMany({}),
    Seat.deleteMany({}),
    SeatAllocation.deleteMany({}),
    User.deleteMany({}),
  ]);

  // Ensure indexes exist before bulk inserts
  await Promise.all([
    Seat.syncIndexes(),
    Employee.syncIndexes(),
    SeatAllocation.syncIndexes(),
    User.syncIndexes(),
  ]);

  // ---- Projects ----
  console.log("Seeding projects...");
  const projects = await Project.insertMany(
    PROJECT_NAMES.map((name, i) => ({
      name,
      description: `${name} product team`,
      manager_name: `${pick(FIRST)} ${pick(LAST)}`,
      status: "active",
    }))
  );

  // ---- Seats (all available initially) ----
  console.log("Building seats...");
  const seatDocs = [];
  for (let f = 1; f <= FLOORS; f++) {
    for (const zone of ZONES) {
      for (let bay = 1; bay <= BAYS_PER_ZONE; bay++) {
        for (let n = 1; n <= SEATS_PER_BAY; n++) {
          seatDocs.push({
            floor: f,
            zone,
            bay: String(bay),
            seat_number: `${zone}${bay}-${n}`,
            status: "available",
          });
        }
      }
    }
  }
  console.log(`Inserting ${seatDocs.length} seats...`);
  const seats = await Seat.insertMany(seatDocs, { ordered: false });

  // ---- Employees ----
  console.log(`Building ${TOTAL_EMPLOYEES} employees...`);
  const empDocs = [];
  for (let i = 0; i < TOTAL_EMPLOYEES; i++) {
    const first = i === 0 ? "Amit" : pick(FIRST);
    const last = i === 0 ? "Sharma" : pick(LAST);
    const code = `EMP${String(i + 1).padStart(5, "0")}`;
    // Demo employee "amit@ethara.ai" matches assessment sample query
    const email =
      i === 0
        ? "amit@ethara.ai"
        : `${first.toLowerCase()}.${last.toLowerCase()}.${i}@ethara.ai`;
    empDocs.push({
      employee_code: code,
      name: `${first} ${last}`,
      email,
      department: pick(DEPTS),
      role: pick(ROLES),
      joining_date: new Date(2021 + (i % 4), i % 12, (i % 27) + 1),
      status: "active",
      project: projects[i % projects.length]._id, // even spread across projects
      seat_allocation_status: "pending",
    });
  }
  console.log("Inserting employees...");
  const employees = await Employee.insertMany(empDocs, { ordered: false });

  // ---- Choose which seats get occupied, keeping free seats on EVERY floor ----
  // seats are ordered floor->zone->bay->num. Per floor keep a tail free so each
  // floor has availability (realistic + demo queries like "Floor 3" work).
  const perFloor = ZONES.length * BAYS_PER_ZONE * SEATS_PER_BAY; // 1100
  const freePerFloor = Math.round((seats.length - ALLOCATED) / FLOORS); // 140
  const occupiedPerFloor = perFloor - freePerFloor; // 960 -> *5 = 4800
  const occupiableSeats = [];
  const freeSeats = [];
  for (let f = 0; f < FLOORS; f++) {
    const floorSeats = seats.slice(f * perFloor, (f + 1) * perFloor);
    occupiableSeats.push(...floorSeats.slice(0, occupiedPerFloor));
    freeSeats.push(...floorSeats.slice(occupiedPerFloor));
  }

  // Sort employees by project so each project's people sit in contiguous seats.
  console.log("Allocating seats (building project clusters)...");
  const sortedEmployees = [...employees].sort((a, b) =>
    a.project.toString().localeCompare(b.project.toString())
  );
  const toAllocate = sortedEmployees.slice(0, occupiableSeats.length);
  const pendingEmployees = sortedEmployees.slice(occupiableSeats.length); // stay pending

  const seatUpdates = [];
  const allocationDocs = [];
  const empUpdates = [];
  const now = new Date();

  for (let i = 0; i < toAllocate.length; i++) {
    const emp = toAllocate[i];
    const seat = occupiableSeats[i]; // clusters by floor/zone/bay, spread across floors
    seatUpdates.push({
      updateOne: {
        filter: { _id: seat._id },
        update: {
          status: "occupied",
          allocated_employee: emp._id,
          allocated_project: emp.project,
          allocation_date: now,
        },
      },
    });
    allocationDocs.push({
      employee: emp._id,
      seat: seat._id,
      project: emp.project,
      allocation_status: "active",
      allocation_date: now,
    });
    empUpdates.push({
      updateOne: {
        filter: { _id: emp._id },
        update: { seat_allocation_status: "allocated" },
      },
    });
  }

  console.log("Writing allocations...");
  // chunk bulk writes to keep memory reasonable
  await bulkInChunks(Seat, seatUpdates);
  await Employee.bulkWrite(empUpdates, { ordered: false });
  await insertInChunks(SeatAllocation, allocationDocs);

  // Mark a few pending employees as new joiners
  const newJoinerIds = pendingEmployees.slice(0, 60).map((e) => e._id);
  await Employee.updateMany(
    { _id: { $in: newJoinerIds } },
    { status: "new_joiner" }
  );

  // ---- Reserved + maintenance seats from the free pool (spread across floors) ----
  // Stride through freeSeats so reserved/maintenance land on multiple floors.
  const shuffledFree = strideSpread(freeSeats, FLOORS);
  const reservedIds = shuffledFree.slice(0, RESERVED).map((s) => s._id);
  const maintIds = shuffledFree
    .slice(RESERVED, RESERVED + MAINTENANCE)
    .map((s) => s._id);
  await Seat.updateMany({ _id: { $in: reservedIds } }, { status: "reserved" });
  await Seat.updateMany({ _id: { $in: maintIds } }, { status: "maintenance" });

  // ---- Auth users (sample credentials) ----
  console.log("Seeding users...");
  await User.insertMany([
    { name: "Admin", email: "admin@ethara.ai", password_hash: await User.hashPassword("admin123"), role: "admin" },
    { name: "HR User", email: "hr@ethara.ai", password_hash: await User.hashPassword("hr12345"), role: "hr" },
    { name: "Employee", email: "employee@ethara.ai", password_hash: await User.hashPassword("emp12345"), role: "employee" },
  ]);

  // ---- Report ----
  const [avail, occ, res, maint, pend] = await Promise.all([
    Seat.countDocuments({ status: "available" }),
    Seat.countDocuments({ status: "occupied" }),
    Seat.countDocuments({ status: "reserved" }),
    Seat.countDocuments({ status: "maintenance" }),
    Employee.countDocuments({ seat_allocation_status: "pending" }),
  ]);
  console.log("\n=== Seed complete ===");
  console.table({
    projects: projects.length,
    employees: employees.length,
    seats_total: seats.length,
    available: avail,
    occupied: occ,
    reserved: res,
    maintenance: maint,
    pending_allocation: pend,
  });
  console.log("\nLogin: admin@ethara.ai / admin123  |  hr@ethara.ai / hr12345");
  console.log("Demo AI query employee: amit@ethara.ai");

  await mongoose.disconnect();
  process.exit(0);
}

// Interleave items so a slice pulls from across all floor-groups
function strideSpread(items, groups) {
  const out = [];
  const per = Math.ceil(items.length / groups);
  for (let i = 0; i < per; i++) {
    for (let g = 0; g < groups; g++) {
      const idx = g * per + i;
      if (idx < items.length) out.push(items[idx]);
    }
  }
  return out;
}

async function bulkInChunks(Model, ops, size = 1000) {
  for (let i = 0; i < ops.length; i += size) {
    await Model.bulkWrite(ops.slice(i, i + size), { ordered: false });
  }
}
async function insertInChunks(Model, docs, size = 1000) {
  for (let i = 0; i < docs.length; i += size) {
    await Model.insertMany(docs.slice(i, i + size), { ordered: false });
  }
}

run().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
