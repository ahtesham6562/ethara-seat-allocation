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
      <div className="fixed bottom-7 right-7 z-40 group">
        {/* Hover label */}
        {!open && (
          <span className="absolute right-full top-1/2 -translate-y-1/2 mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 pointer-events-none">
            Ask AI Assistant
          </span>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          className="relative h-[68px] w-[68px] rounded-full bg-gradient-to-br from-brand-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-brand-500/40 flex items-center justify-center transition-transform duration-200 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-brand-500/30"
          aria-label="AI Assistant"
        >
          {/* Pulse ring (only when closed) */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-brand-500 opacity-60 animate-ping" />
          )}

          <span className="relative">
            {open ? (
              // Close icon
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              // Chat + sparkle icon
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5z" />
                <path d="M12.2 7.6l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9z" fill="currentColor" stroke="none" />
              </svg>
            )}
          </span>
        </button>
      </div>

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
        <div className="h-16 px-4 flex items-center justify-between bg-gradient-to-r from-brand-500 via-indigo-500 to-purple-600 text-white">
          <div className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5z" />
              </svg>
            </span>
            <div>
              <div className="font-semibold leading-tight">AI Assistant</div>
              <div className="text-xs opacity-80 leading-tight">Ethara Seats</div>
            </div>
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
