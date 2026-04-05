"use client";

import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { Session } from "../page";

interface UserInfo {
  name: string;
  email: string;
  image: string | null;
}

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: (file: File) => void;
  onDeleteSession: (id: string) => void;
  user: UserInfo | null;
}

export default function Sidebar({
  open,
  onToggle,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  user,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onNewChat(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith(".pdf")) {
      onNewChat(file);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <aside
      className={`shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] flex flex-col transition-all duration-200 ease-in-out overflow-hidden ${
        open ? "w-72" : "w-0 border-r-0"
      }`}
    >
      <div className="flex flex-col h-full min-w-[288px]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h1 className="text-sm font-semibold text-[var(--accent)]">
              AnswerMyDocs
            </h1>
            <p className="text-[11px] text-[var(--text-muted)]">
              Chat with your PDFs
            </p>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors duration-150"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* Upload dropzone */}
        <div className="px-3 py-2">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-3 py-5 text-center transition-colors duration-150 ${
              dragOver
                ? "border-[var(--accent)] bg-[var(--bg-input)]"
                : "border-[var(--border-subtle)] hover:border-[var(--border-hover)]"
            }`}
          >
            <p className="text-xs font-medium text-[var(--text-primary)] mb-1">
              Upload PDF
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">
              Drag & drop or click to select
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {sessions.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-[var(--text-muted)]">
              No chats yet
            </p>
          )}
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                title={formatDate(session.created_at)}
                className={`group flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--bg-input)] text-[var(--text-primary)] border-l-2 border-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-input)] hover:text-[var(--text-primary)]"
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <span className="flex-1 truncate">
                  {session.name || "Untitled"}
                </span>
                <span
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="hidden shrink-0 rounded p-0.5 text-[var(--text-muted)] hover:text-red-400 group-hover:block"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>

        {/* User info + logout */}
        {user && (
          <div className="border-t border-[var(--border-subtle)] px-3 py-3">
            <div className="flex items-center gap-2.5">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="w-7 h-7 rounded-full shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                  <span className="text-xs text-[var(--text-muted)]">
                    {(user.name || user.email)?.[0]?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-primary)] truncate">
                  {user.name || user.email}
                </p>
                {user.name && (
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                title="Sign out"
                className="shrink-0 p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition-colors duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
