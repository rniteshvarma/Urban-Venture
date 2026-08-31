/**
 * Helpers for the functional (HTTP-level) test suite.
 *
 * These tests drive a running dev server the same way a browser would, so they
 * exercise middleware, route handlers, auth and the database together. Start
 * the server first: `npm run dev`.
 */

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** A minimal cookie jar — enough for NextAuth's csrf + session cookies. */
export class Jar {
  private jar = new Map<string, string>();

  absorb(res: Response) {
    // Node exposes multiple Set-Cookie headers via getSetCookie().
    const raw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const line of raw) {
      const [pair] = line.split(";");
      const idx = pair.indexOf("=");
      if (idx > 0) this.jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
    }
  }

  header(): string {
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  get(name: string) {
    return this.jar.get(name);
  }
}

export interface Res {
  status: number;
  body: any;
  text: string;
}

/** fetch + cookie handling + tolerant JSON parse. */
export async function req(
  path: string,
  opts: { method?: string; body?: any; jar?: Jar; headers?: Record<string, string>; form?: string } = {}
): Promise<Res> {
  const { method = "GET", body, jar, headers = {}, form } = opts;

  const h: Record<string, string> = { ...headers };
  if (jar) h["cookie"] = jar.header();

  let payload: string | undefined;
  if (form !== undefined) {
    payload = form;
    h["content-type"] = "application/x-www-form-urlencoded";
  } else if (body !== undefined) {
    payload = JSON.stringify(body);
    h["content-type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { method, headers: h, body: payload, redirect: "manual" });
  jar?.absorb(res);

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* HTML or empty — leave null, `text` still available */
  }
  return { status: res.status, body: parsed, text };
}

/** Full NextAuth credentials sign-in. Returns a jar holding the session cookie. */
export async function login(email: string, password: string): Promise<Jar> {
  const jar = new Jar();
  const csrfRes = await req("/api/auth/csrf", { jar });
  const csrfToken = csrfRes.body?.csrfToken;
  if (!csrfToken) throw new Error("could not obtain csrf token");

  const params = new URLSearchParams({ csrfToken, email, password, redirect: "false", json: "true" });
  await req("/api/auth/callback/credentials", { method: "POST", form: params.toString(), jar });
  return jar;
}

/** The signed-in identity for a jar, or null. */
export async function whoami(jar: Jar): Promise<{ id: string; email: string; role: string } | null> {
  const res = await req("/api/auth/session", { jar });
  return res.body?.user ?? null;
}

export const ADMIN = { email: "uv@gmail.com", password: "12345678" };

/** A unique client account per run, so tests never collide on the unique email. */
export function freshClient() {
  const n = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { email: `test-client-${n}@example.com`, password: "TestPassw0rd!23", name: "Test Client", phone: `+9198${n.slice(-8)}` };
}
