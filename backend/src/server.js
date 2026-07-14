import "dotenv/config";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

const PORT = process.env.PORT || 5000;

async function start() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set. Copy .env.example to .env.");
    process.exit(1);
  }
  await connectDB(process.env.MONGODB_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}  (docs: /docs)`);
  });
}

start().catch((e) => {
  console.error("Failed to start:", e);
  process.exit(1);
});
