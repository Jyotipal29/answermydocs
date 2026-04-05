"use client";

import { useState, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Session {
  id: string;
  name: string;
  created_at: string;
  primary_pdf: string;
  supporting_pdfs: string[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/sessions`);
      if (res.ok) {
        const data: Session[] = await res.json();
        setSessions(data);
      }
    } catch {
      // silently fail on initial load
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewChat = async (file: File) => {
    try {
      // Create session
      const sessionRes = await fetch(`${API_URL}/sessions`, { method: "POST" });
      if (!sessionRes.ok) throw new Error("Failed to create session.");
      const session: Session = await sessionRes.json();

      // Upload PDF
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", session.id);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.detail || "Upload failed.");
      }

      await fetchSessions();
      setActiveSessionId(session.id);
      setChatHistories((prev) => ({ ...prev, [session.id]: [] }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create chat.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await fetch(`${API_URL}/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      setChatHistories((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
      }
    } catch {
      // silently fail
    }
  };

  const handleAttachPdf = async (file: File) => {
    if (!activeSessionId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("session_id", activeSessionId);

      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed.");
      }

      await fetchSessions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to attach PDF.");
    }
  };

  const setMessages = (sessionId: string, messages: Message[]) => {
    setChatHistories((prev) => ({ ...prev, [sessionId]: messages }));
  };

  const currentMessages = activeSessionId
    ? chatHistories[activeSessionId] ?? []
    : [];

  return (
    <div className="flex h-full">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
      />
      <main className="flex flex-1 flex-col min-h-0 min-w-0 bg-[var(--bg-page)]">
        <ChatPanel
          session={activeSession}
          messages={currentMessages}
          setMessages={(msgs) =>
            activeSessionId && setMessages(activeSessionId, msgs)
          }
          onAttachPdf={handleAttachPdf}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
        />
      </main>
    </div>
  );
}
