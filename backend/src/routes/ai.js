import { Router } from "express";
import { answerQuery } from "../services/aiParser.js";
import { enhanceAnswer } from "../services/aiLLM.js";
import { asyncHandler } from "../middleware/index.js";

const router = Router();

// POST /ai/query  { query: "Where is my seat? My email is amit@ethara.ai" }
// Flow: rule-based parser extracts entities + queries DB (grounded truth),
// then Groq LLM rephrases from that data. Falls back to rule-based if no key.
router.post(
  "/query",
  asyncHandler(async (req, res) => {
    const { query } = req.body;
    const grounded = await answerQuery(query);
    const result = await enhanceAnswer(query, grounded);
    res.json(result);
  })
);

export default router;
