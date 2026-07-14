import mongoose from "mongoose";

const seatAllocationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seat",
      required: true,
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    allocation_status: {
      type: String,
      enum: ["active", "released"],
      default: "active",
    },
    allocation_date: { type: Date, default: Date.now },
    released_date: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

// Rule: one employee = one ACTIVE allocation; one seat = one ACTIVE allocation.
// Partial unique indexes enforce this at DB level.
seatAllocationSchema.index(
  { employee: 1 },
  { unique: true, partialFilterExpression: { allocation_status: "active" } }
);
seatAllocationSchema.index(
  { seat: 1 },
  { unique: true, partialFilterExpression: { allocation_status: "active" } }
);

export default mongoose.model("SeatAllocation", seatAllocationSchema);
