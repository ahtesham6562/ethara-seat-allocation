import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const suggestions = [
  "Where is my seat? My email is amit@ethara.ai",
  "Which project is amit@ethara.ai assigned to?",
  "Show all available seats on Floor 3",
  "How many seats are occupied for Project Indigo?",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! Ask me where an employee sits, their project, available seats on a floor, or project seat utilization.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r = await api.aiQuery(q);
      setMessages((m) => [
        ...m,
        { role: "bot", text: r.answer, source: r.source, intent: r.intent },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: `Error: ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">AI Assistant</h1>

      <div className="card h-[60vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  m.role === "user"
                    ? "bg-brand-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}
              >
                {m.text}
                {m.source && (
                  <div className="mt-1 text-[10px] opacity-60">
                    via {m.source}
                    {m.intent ? ` · ${m.intent}` : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="text-gray-400 text-sm">Assistant is thinking…</div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                className="badge bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={() => send(s)}
              >
                {s.length > 40 ? s.slice(0, 38) + "…" : s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              className="input"
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="btn-primary" disabled={busy}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
