import axios from 'axios'
import { getToken } from '@/lib/auth'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export function extractApiError(e: unknown): string {
  if (e && typeof e === 'object') {
    const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
    if (typeof detail === 'string' && detail.length > 0) return detail
    const msg = (e as { message?: unknown }).message
    if (typeof msg === 'string' && msg.length > 0) return msg
  }
  return 'Something went wrong'
}

export const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Types ────────────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'enterprise'
export type DocumentStatus = 'uploading' | 'processing' | 'ready' | 'failed'

export interface User {
  id: string
  email: string
  name: string | null
  plan: UserPlan
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface Document {
  id: string
  user_id: string
  filename: string
  page_count: number | null
  chunk_count: number | null
  file_size_bytes: number
  status: DocumentStatus
  created_at: string
}

export interface Source {
  doc_id: string
  filename: string
  page_number: number
  chunk_index: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  sources: Source[]
  created_at: string
}

export interface Conversation {
  id: string
  user_id: string
  workspace_id: string | null
  document_id: string | null
  title: string
  created_at: string
  updated_at: string
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface Workspace {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface WorkspaceDetail extends Workspace {
  documents: Document[]
}

export interface UsageResponse {
  messages_this_month: number
  messages_limit: number        // -1 = unlimited
  documents_count: number
  documents_limit: number       // -1 = unlimited
  storage_bytes: number
  storage_limit_bytes: number
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/signup', { email, password }),

  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),

  googleAuth: (id_token: string) =>
    api.post<TokenResponse>('/auth/google', { id_token }),

  getMe: () => api.get<User>('/auth/me'),

  getUsage: () => api.get<UsageResponse>('/auth/me/usage'),
}

// ── Documents ────────────────────────────────────────────────────────────────

export const documentsApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<Document>('/documents/upload', form)
  },

  list: () => api.get<Document[]>('/documents'),

  get: (id: string) => api.get<Document>(`/documents/${id}`),

  delete: (id: string) => api.delete(`/documents/${id}`),
}

// ── Workspaces ───────────────────────────────────────────────────────────────

export const workspacesApi = {
  create: (name: string) => api.post<Workspace>('/workspaces', { name }),
  list: () => api.get<Workspace[]>('/workspaces'),
  get: (id: string) => api.get<WorkspaceDetail>(`/workspaces/${id}`),
  addDocument: (workspaceId: string, documentId: string) =>
    api.post(`/workspaces/${workspaceId}/documents`, { document_id: documentId }),
  removeDocument: (workspaceId: string, documentId: string) =>
    api.delete(`/workspaces/${workspaceId}/documents/${documentId}`),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
}

// ── Conversations ────────────────────────────────────────────────────────────

export const conversationsApi = {
  list: () => api.get<Conversation[]>('/conversations'),
  get: (id: string) => api.get<ConversationDetail>(`/conversations/${id}`),
  delete: (id: string) => api.delete(`/conversations/${id}`),
  rename: (id: string, title: string) => api.patch<Conversation>(`/conversations/${id}`, { title }),
}

// ── Chat SSE ─────────────────────────────────────────────────────────────────

export interface ChatSSECallbacks {
  onConversationId: (id: string) => void
  onToken: (token: string) => void
  onSources: (sources: Source[]) => void
  onDone: () => void
  onError: (error: string) => void
}

export async function sendChatMessage(
  message: string,
  documentIds: string[],
  callbacks: ChatSSECallbacks,
  conversationId?: string,
): Promise<void> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      message,
      document_ids: documentIds,
      conversation_id: conversationId ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    callbacks.onError(err.detail ?? 'Request failed')
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const raw = line.slice(6).trim()
      if (raw === '[DONE]') {
        callbacks.onDone()
        return
      }
      try {
        const payload = JSON.parse(raw)
        if (payload.type === 'conversation_id') callbacks.onConversationId(payload.conversation_id)
        else if (payload.type === 'token') callbacks.onToken(payload.content ?? '')
        else if (payload.type === 'sources') callbacks.onSources(payload.sources ?? [])
        else if (payload.type === 'error') callbacks.onError(payload.message ?? 'Unknown error')
      } catch {
        // malformed SSE line — skip
      }
    }
  }
}

// ── Document status SSE ───────────────────────────────────────────────────────
// Uses fetch (not EventSource) because EventSource cannot send Authorization headers.

export function subscribeToDocumentStatus(
  docId: string,
  onEvent: (event: { status: string; message: string }) => void,
  onDone: () => void,
): () => void {
  const controller = new AbortController()

  async function run() {
    const token = getToken()
    try {
      const res = await fetch(`${BASE_URL}/documents/${docId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal,
      })
      if (!res.ok || !res.body) { onDone(); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            onEvent(data)
            if (data.status === 'ready' || data.status === 'failed') {
              reader.cancel()
              onDone()
              return
            }
          } catch { /* skip */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') onDone()
    }
  }

  run()
  return () => controller.abort()
}
