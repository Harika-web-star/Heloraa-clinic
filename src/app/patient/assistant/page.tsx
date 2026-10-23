"use client";

import { useState } from "react";
import Link from "next/link";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function AssistantPage() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ragSources, setRagSources] = useState(0);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm the Heloraa Medical Assistant. I can help you understand your health records, prepare for a consultation, or organize questions for your doctor.",
    },
  ]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!message.trim() || loading) {
      return;
    }

    const userMessage = message.trim();

    setMessage("");

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setRagSources(data.rag?.sources?.length || 0);

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: data.answer,
        },
      ]);
    } catch {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content:
            "I'm unable to process that right now. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-5xl flex-col">

        {/* Header */}

        <div className="mb-6">

          <Link
            href="/patient"
            className="text-sm text-slate-500 hover:text-black"
          >
            ← Back to Patient Portal
          </Link>

          <div className="mt-5">
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">Heloraa AI</p>
              <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                Gemini + RAG
              </span>
              {ragSources > 0 && (
                <span className="text-[11px] text-slate-400">
                  {ragSources} record{ragSources === 1 ? "" : "s"} retrieved
                </span>
              )}
            </div>

            <h1 className="mt-1 text-3xl font-semibold text-[#0A0D14]">
              Medical Assistant
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Your healthcare information, organized and easier to understand.
            </p>
          </div>

        </div>

        {/* Chat */}

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border bg-white shadow-sm">

          <div className="flex-1 space-y-5 overflow-y-auto p-6">

            {messages.map((item, index) => (
              <div
                key={index}
                className={`flex ${
                  item.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-4 text-sm leading-6 ${
                    item.role === "user"
                      ? "bg-[#0A0D14] text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {item.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-5 py-4 text-sm text-slate-500">
                  Thinking...
                </div>
              </div>
            )}

          </div>

          {/* Input */}

          <form
            onSubmit={sendMessage}
            className="border-t bg-white p-4"
          >
            <div className="flex gap-3">

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about your health records..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              <button
                type="submit"
                disabled={loading || !message.trim()}
                className="rounded-xl bg-[#0A0D14] px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                Send
              </button>

            </div>
          </form>

        </div>

      </div>
    </main>
  );
}