import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

const GREETING =
  "สวัสดีครับ ถามเรื่องยาหรือการสั่งซื้อในร้านได้เลย เช่น “เมทฟอร์มินกินตอนไหน” หรือ “สั่งยา Rx ต้องทำยังไง”";

export default function ChatWidget() {
  const { isAuthenticated, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, medicines? }
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  // ออกจากระบบแล้วล้างบทสนทนา (เป็นข้อมูลสุขภาพ ไม่ควรค้างให้คนถัดไปเห็น)
  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      setOpen(false);
      setError("");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending, open]);

  if (!isAuthenticated) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setSending(true);
    try {
      const res = await api.chat(
        next.map(({ role, content }) => ({ role, content })),
        token
      );
      setMessages([
        ...next,
        { role: "assistant", content: res.reply, medicines: res.medicines, mode: res.mode },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-20 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Pharmacy assistant"
          className="flex h-[30rem] max-h-[75vh] w-[calc(100vw-2rem)] max-w-sm flex-col border border-ink bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="font-display text-lg font-semibold leading-none text-ink">Ask the pharmacy</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                AI assistant · not medical advice
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="px-2 font-mono text-lg leading-none text-ink hover:text-muted"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
            <p className="mb-3 bg-paper p-3 text-ink">{GREETING}</p>

            {messages.map((m, i) => (
              <div key={i} className={`mb-3 flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words p-3 ${
                    m.role === "user" ? "bg-ink text-paper" : "bg-paper text-ink"
                  }`}
                >
                  {m.content}
                </p>
                {m.mode === "retrieval" && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                    AI is offline — answered from the drug database
                  </p>
                )}
                {m.medicines?.length > 0 && (
                  <div className="mt-1.5 flex max-w-[85%] flex-wrap gap-1.5">
                    {m.medicines.map((med) => (
                      <Link
                        key={med.id}
                        href={`/?q=${encodeURIComponent(med.name.replace(/\s*\(.*\)/, ""))}`}
                        onClick={() => setOpen(false)}
                        className="border border-line-strong px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-ink hover:border-leaf hover:text-leaf"
                      >
                        View {med.name.replace(/\s*\(.*\)/, "")} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Thinking... (the local model can take a moment)
              </p>
            )}
            {error && <p className="border border-ink px-3 py-2 text-xs text-ink">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-line p-3">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                maxLength={1000}
                placeholder="พิมพ์คำถามที่นี่"
                aria-label="Message"
                className="flex-1 resize-none border border-line-strong bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-ink"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="border border-ink bg-ink px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-paper hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-muted">
              ข้อมูลทั่วไป ไม่ใช่คำแนะนำทางการแพทย์ ฉุกเฉินโทร 1669 บอทเป็น AI อาจตอบผิดได้ โปรดยืนยันกับเภสัชกร
            </p>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="border border-ink bg-ink px-4 py-3 font-mono text-xs uppercase tracking-[0.08em] text-paper shadow-lg transition hover:bg-paper hover:text-ink"
      >
        {open ? "Close" : "Ask the assistant"}
      </button>
    </div>
  );
}
