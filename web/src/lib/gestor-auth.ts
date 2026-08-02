import { hashPassword, setSession } from "@/lib/auth";
import { db, ensureProfile } from "@/lib/db";

const CLOUD_KEY = "dieta_cloud_v1";

export type CloudSession = {
  tenantId: string;
  operatorKey: string;
  tenantName?: string;
  expiresAt?: string | null;
  apiToken?: string | null;
};

function gestorBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GESTOR_URL?.trim().replace(/\/$/, "") ||
    "https://gestor.synchops.online"
  );
}

export function isGestorAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_GESTOR_AUTH !== "0";
}

export function getCloudSession(): CloudSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLOUD_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CloudSession;
  } catch {
    return null;
  }
}

export function clearCloudSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CLOUD_KEY);
}

function setCloudSession(session: CloudSession) {
  sessionStorage.setItem(CLOUD_KEY, JSON.stringify(session));
}

/** Garante usuário local vinculado ao operador liberado no Gestor. */
async function ensureLocalUserForOperator(
  displayName: string,
  operatorKey: string
): Promise<number> {
  const marker = `gestor:${operatorKey}`;
  const existing = await db.users.filter((u) => u.name === marker).first();
  if (existing?.id) {
    await ensureProfile(existing.id);
    return existing.id;
  }

  const passwordHash = await hashPassword(`cloud:${operatorKey}`);
  const id = await db.users.add({
    name: marker,
    passwordHash,
    createdAt: new Date().toISOString(),
  });
  const profile = await ensureProfile(id);
  if (profile.id) {
    await db.profiles.update(profile.id, {
      ...profile,
      goal: displayName ? `Conta: ${displayName}` : profile.goal,
      updatedAt: new Date().toISOString(),
    });
  }
  return id;
}

type GestorLoginOk = {
  ok: true;
  operator: { id: string; name: string; email?: string };
  tenant_id: string;
  tenant_name?: string;
  api_token?: string;
  expires_at?: string | null;
};

type GestorLoginFail = {
  ok: false;
  reason?: string;
  can_renew?: boolean;
};

/**
 * Login liberado pelo Gestor (pagamento + grant calculo-de-dieta).
 * Cria sessão local + metadados cloud.
 */
export async function loginViaGestor(login: string, pin: string): Promise<number> {
  const res = await fetch(`${gestorBaseUrl()}/api/auth/operator-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: login.trim(),
      pin: pin.trim(),
      app: "calculo-de-dieta",
    }),
  });

  let data: GestorLoginOk | GestorLoginFail;
  try {
    data = (await res.json()) as GestorLoginOk | GestorLoginFail;
  } catch {
    throw new Error("Resposta inválida do Gestor. Tente de novo.");
  }

  if (!res.ok || !data || data.ok !== true) {
    const fail = data as GestorLoginFail;
    throw new Error(fail?.reason || "Acesso negado. Verifique liberação e pagamento no Gestor.");
  }

  const operatorKey = data.operator.id;
  const userId = await ensureLocalUserForOperator(data.operator.name || login, operatorKey);
  setCloudSession({
    tenantId: data.tenant_id,
    operatorKey,
    tenantName: data.tenant_name,
    expiresAt: data.expires_at,
    apiToken: data.api_token,
  });
  setSession(userId);
  return userId;
}
