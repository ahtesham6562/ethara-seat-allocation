import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    employee_code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: { type: String, default: "" },
    role: { type: String, default: "" },
    joining_date: { type: Date, default: Date.now },
    // Employment status
    status: {
      type: String,
      enum: ["active", "inactive", "new_joiner"],
      default: "active",
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    // Seat allocation status (derived convenience flag)
    seat_allocation_status: {
      type: String,
      enum: ["allocated", "pending"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

export default mongoose.model("Employee", employeeSchema);
