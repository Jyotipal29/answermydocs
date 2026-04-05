"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-[var(--accent)] text-[var(--accent-text)]"
            : "bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
        }`}
      >
        {content}
        {isStreaming && !content && (
          <span className="inline-flex items-center gap-1">
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
            <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
          </span>
        )}
      </div>
    </div>
  );
}
