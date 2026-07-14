import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "hr", "employee"],
      default: "employee",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

userSchema.methods.checkPassword = function (plain) {
  return bcrypt.compare(plain, this.password_hash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

export default mongoose.model("User", userSchema);
