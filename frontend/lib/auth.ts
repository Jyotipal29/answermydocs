import Cookies from 'js-cookie'

const TOKEN_KEY = 'amd_token'

export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) ?? null
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: 'lax' })
}

export function clearToken(): void {
  Cookies.remove(TOKEN_KEY)
}
