/**
 * Groq LLM layer (OpenAI-compatible). Grounded: it only rephrases answers from
 * data we already fetched from MongoDB — it never invents seat numbers.
 * If GROQ_API_KEY is missing or the call fails, we fall back to the rule-based
 * answer produced by aiParser. Node 22 has global fetch (no extra dependency).
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are Ethara's seat-allocation assistant.
Answer ONLY using the JSON context provided. Do not invent seat numbers, floors,
projects, or names. If the context lacks the answer, say you couldn't find it and
suggest giving an email or full name. Keep answers to 1-2 short sentences.`;

export async function enhanceAnswer(query, parserResult) {
  const key = process.env.GROQ_API_KEY;
  // No key -> pure rule-based mode (assessment fallback requirement)
  if (!key) return { ...parserResult, source: "rule-based" };

  try {
    const context = {
      intent: parserResult.intent,
      grounded_answer: parserResult.answer,
      data: parserResult.data || null,
    };
    const resp = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 150,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User question: ${query}\n\nContext (JSON):\n${JSON.stringify(
              context
            )}`,
          },
        ],
      }),
    });

    if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`);
    const json = await resp.json();
    const text = json.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty LLM response");

    return { ...parserResult, answer: text, source: "groq" };
  } catch (e) {
    // Any failure -> grounded rule-based answer still works
    console.warn("Groq fallback:", e.message);
    return { ...parserResult, source: "rule-based-fallback" };
  }
}
