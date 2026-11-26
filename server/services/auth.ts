import crypto from "node:crypto";
import type { Request, RequestHandler, Response } from "express";
import { Setting } from "../models/index.js";

/**
 * Optional passcode protection.
 *  - APP_PASSCODE env var (non-empty) wins and is managed on the server.
 *  - Otherwise a passcode may be set from the app's Settings (stored only as a scrypt hash).
 *  - Neither set (or empty/whitespace) means protection is OFF and nothing is ever blocked.
 * Logged-in devices get an HttpOnly, signed session cookie. The raw passcode is never stored in the browser.
 */
export const COOKIE = "se_session";
const SESSION_DAYS = 30;
export type AuthConfig = { mode: "env" | "settings" | null; secret?: string; verify?: (p: string) => boolean };

const sha = (s: string) => crypto.createHash("sha256").update(s).digest();
export const safeEq = (a: string, b: string) => crypto.timingSafeEqual(sha(a), sha(b));
const hmac = (secret: string, msg: string) => crypto.createHmac("sha256", secret).update(msg).digest("hex");

export function hashPasscode(p: string) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString("hex")}:${crypto.scryptSync(p, salt, 32).toString("hex")}`;
}
export function verifyHash(p: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return crypto.timingSafeEqual(crypto.scryptSync(p, Buffer.from(salt, "hex"), 32), Buffer.from(hash, "hex"));
}
export function issueToken(secret: string) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  return `${exp}.${hmac(secret, String(exp))}`;
}
export function validToken(secret: string, token?: string) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !(+exp > Date.now())) return false;
  return safeEq(sig, hmac(secret, exp));
}

let cache: { cfg: AuthConfig; at: number } | null = null;
export const invalidateAuthCache = () => { cache = null; };

export async function getAuthConfig(): Promise<AuthConfig> {
  const env = (process.env.APP_PASSCODE ?? "").trim();
  if (env) return { mode: "env", secret: sha(`splitease:${env}`).toString("hex"), verify: (p) => safeEq(p, env) }; // changing the env var invalidates old sessions
  if (cache && Date.now() - cache.at < 5000) return cache.cfg;
  const doc = await Setting.findOne({ key: "auth" }).lean() as any;
  const cfg: AuthConfig = doc?.passcodeHash && doc?.sessionSecret
    ? { mode: "settings", secret: doc.sessionSecret, verify: (p) => verifyHash(p, doc.passcodeHash) }
    : { mode: null };
  cache = { cfg, at: Date.now() };
  return cfg;
}

export function readCookie(req: Request, name: string) {
  const part = (req.headers.cookie ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : undefined;
}
export function setSession(req: Request, res: Response, secret: string) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie", `${COOKIE}=${issueToken(secret)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? "; Secure" : ""}`);
}
export function clearSession(req: Request, res: Response) {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
}

const EXEMPT = new Set(["/health", "/auth/status", "/auth/login", "/auth/logout"]);
/** When protection is off this is a no-op. When on, every other /api route needs a valid session. */
export const authGuard: RequestHandler = async (req, res, next) => {
  try {
    const cfg = await getAuthConfig();
    if (!cfg.mode || EXEMPT.has(req.path)) return next();
    if (validToken(cfg.secret!, readCookie(req, COOKIE))) return next();
    res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
  } catch (e) { next(e); }
};
