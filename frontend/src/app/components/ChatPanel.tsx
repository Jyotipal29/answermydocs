"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { Session, Message } from "../page";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatPanelProps {
  session: Session | null;
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  onAttachPdf: (file: File) => void;
  onNewChat: (file: File) => void;
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  loadingMessages: boolean;
}

export default function ChatPanel({
  session,
  messages,
  setMessages,
  onAttachPdf,
  onNewChat,
  onToggleSidebar,
  sidebarOpen,
  loadingMessages,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [attachUploading, setAttachUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const newChatInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question || streaming || !session) return;

    const userMessage: Message = { role: "user", content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setStreaming(true);

    setMessages([...updatedMessages, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
          question,
          chat_history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Chat request failed.");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream.");

      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages([
          ...updatedMessages,
          { role: "assistant", content: accumulated },
        ]);
      }
    } catch {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  };

  const handleAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
    e.target.value = "";
    setAttachUploading(true);
    await onAttachPdf(file);
    setAttachUploading(false);
  };

  // No session selected
  if (!session) {
    return (
      <div className="flex flex-1 flex-col h-full">
        {/* Toggle button when sidebar closed */}
        {!sidebarOpen && (
          <div className="px-4 pt-4">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors duration-150"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        )}
        <label className="flex flex-1 flex-col items-center justify-center gap-4 cursor-pointer">
          <svg className="w-12 h-12 text-[var(--border-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="text-sm text-[var(--text-muted)]">
            Upload a doc to start a conversation
          </p>
          <input
            ref={newChatInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.name.toLowerCase().endsWith(".pdf")) {
                onNewChat(file);
              }
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-panel)]">
        {!sidebarOpen && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors duration-150"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium text-[var(--text-primary)] truncate">
            {session.name || "Untitled"}
          </h2>
          {session.supporting_pdfs.length > 0 && (
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              +{session.supporting_pdfs.length} supporting{" "}
              {session.supporting_pdfs.length === 1 ? "PDF" : "PDFs"}
            </p>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadingMessages ? (
          <div className="flex flex-1 h-full flex-col items-center justify-center gap-3">
            <svg className="w-6 h-6 animate-spin text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs text-[var(--text-muted)]">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 h-full flex-col items-center justify-center gap-4">
            <svg className="w-12 h-12 text-[var(--border-hover)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
            <p className="text-sm text-[var(--text-muted)]">
              Ask anything about your document
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6 space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={
                  streaming && i === messages.length - 1 && msg.role === "assistant"
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Supporting PDF chips */}
      {session.supporting_pdfs.length > 0 && (
        <div className="max-w-3xl mx-auto w-full px-6 flex flex-wrap gap-1.5 pb-2">
          {session.supporting_pdfs.map((name, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              {name}
            </span>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-panel)]">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2 px-6 py-4"
        >
          {/* Paperclip button */}
          <button
            type="button"
            onClick={() => attachInputRef.current?.click()}
            disabled={attachUploading}
            className="shrink-0 p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors duration-150 disabled:opacity-40"
            title="Attach supporting PDF"
          >
            {attachUploading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            )}
          </button>
          <input
            ref={attachInputRef}
            type="file"
            accept=".pdf"
            onChange={handleAttach}
            className="hidden"
          />

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            disabled={streaming}
            className="flex-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-input)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors duration-150 focus:border-[var(--border-hover)] disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-text)] transition-colors duration-150 hover:bg-[#e0e0e0] disabled:opacity-40 disabled:hover:bg-[var(--accent)]"
          >
            {streaming ? (
              <span className="inline-flex items-center gap-1">
                <span className="typing-dot h-1 w-1 rounded-full bg-[var(--accent-text)]" />
                <span className="typing-dot h-1 w-1 rounded-full bg-[var(--accent-text)]" />
                <span className="typing-dot h-1 w-1 rounded-full bg-[var(--accent-text)]" />
              </span>
            ) : (
              "Send"
            )}
          </button>
        </form>
        <p className="text-center text-[10px] text-[var(--text-muted)] pb-3 opacity-60">
          Powered by GPT-4o
        </p>
      </div>
    </div>
  );
}
