import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { asyncHandler, auth } from "../middleware/index.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

// POST /auth/register  (admin-seeded normally; open here for demo convenience)
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email, password required" });
    const password_hash = await User.hashPassword(password);
    const user = await User.create({ name, email, password_hash, role });
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  })
);

// POST /auth/login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user || !(await user.checkPassword(password || "")))
      return res.status(401).json({ error: "Invalid credentials" });
    res.json({ token: signToken(user), user: publicUser(user) });
  })
);

// GET /auth/me
router.get(
  "/me",
  auth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

function publicUser(u) {
  return { id: u._id, name: u.name, email: u.email, role: u.role };
}

export default router;
