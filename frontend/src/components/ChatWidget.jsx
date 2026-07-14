import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const suggestions = [
  "Where is my seat? My email is amit@ethara.ai",
  "How many Aditya Bhat are there?",
  "Show available seats on Floor 3",
  "Seats occupied for Project Indigo?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! Ask me where an employee sits, their project, available seats on a floor, project utilization, or search employees by name.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 flex items-center justify-center text-2xl transition"
        aria-label="AI Assistant"
        title="AI Assistant"
      >
        {open ? "×" : "💬"}
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Side panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b bg-brand-500 text-white">
          <div>
            <div className="font-semibold">AI Assistant</div>
            <div className="text-xs opacity-80">Ethara Seats</div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-2xl leading-none hover:opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
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
          {busy && <div className="text-gray-400 text-sm">Assistant is thinking…</div>}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((s) => (
              <button
                key={s}
                className="badge bg-gray-100 text-gray-600 hover:bg-gray-200 text-left"
                onClick={() => send(s)}
              >
                {s.length > 32 ? s.slice(0, 30) + "…" : s}
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
            <button className="btn-primary px-3" disabled={busy}>
              ➤
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
