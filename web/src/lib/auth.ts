const SESSION_KEY = "dieta_session_v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = enc.encode("calculo-de-dieta-salt-v1");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function writeCookie(userId: number) {
  document.cookie = `${SESSION_KEY}=${userId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearCookie() {
  document.cookie = `${SESSION_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function setSession(userId: number) {
  sessionStorage.setItem(SESSION_KEY, String(userId));
  writeCookie(userId);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem("dieta_cloud_v1");
  clearCookie();
}

export function getSessionId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_KEY}=([^;]*)`));
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return null;
  sessionStorage.setItem(SESSION_KEY, String(n));
  return n;
}

export function isLoggedIn(): boolean {
  return getSessionId() != null;
}
