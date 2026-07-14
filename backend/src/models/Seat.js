import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    floor: { type: Number, required: true },
    zone: { type: String, required: true, trim: true },
    bay: { type: String, required: true, trim: true },
    seat_number: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "maintenance"],
      default: "available",
    },
    // Current occupant (denormalized for fast reads); source of truth is SeatAllocation
    allocated_employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    allocated_project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    allocation_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Business rule: no duplicate seat number on the same floor/zone
seatSchema.index({ floor: 1, zone: 1, seat_number: 1 }, { unique: true });
seatSchema.index({ status: 1 });

export default mongoose.model("Seat", seatSchema);
