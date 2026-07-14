import jwt from "jsonwebtoken";

// Wrap async route handlers so thrown errors reach the error middleware
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Central error handler
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.code === 11000 ? 409 : 500);
  const message =
    err.code === 11000
      ? `Duplicate value: ${JSON.stringify(err.keyValue)}`
      : err.message || "Server error";
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
}

// Verify JWT and attach req.user
export function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Restrict route to given roles (use after auth)
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ error: "Forbidden: insufficient role" });
  next();
};
