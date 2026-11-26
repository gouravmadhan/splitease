import { Router } from "express";
import { z } from "zod";
import { Setting } from "../models/index.js";
import { clearSession, getAuthConfig, hashPasscode, invalidateAuthCache, readCookie, COOKIE, setSession, validToken } from "../services/auth.js";
import { wrap, HttpError } from "./util.js";
import crypto from "node:crypto";

export const auth = Router();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// "Is protection on, and is this browser logged in?" Never needs a session, never needs a passcode.
auth.get("/auth/status", wrap(async (req, res) => {
  const cfg = await getAuthConfig();
  res.json({ required: !!cfg.mode, authenticated: !cfg.mode || validToken(cfg.secret!, readCookie(req, COOKIE)), managedBy: cfg.mode });
}));

auth.post("/auth/login", wrap(async (req, res) => {
  const cfg = await getAuthConfig();
  if (!cfg.mode) return res.json({ ok: true, required: false }); // nothing to validate
  const { passcode } = z.object({ passcode: z.string().max(200) }).parse(req.body);
  if (!cfg.verify!(passcode)) { await sleep(400); throw new HttpError(401, "Incorrect passcode. Please try again.", "BAD_PASSCODE"); }
  setSession(req, res, cfg.secret!);
  res.json({ ok: true });
}));

auth.post("/auth/logout", wrap(async (req, res) => { clearSession(req, res); res.json({ ok: true }); }));

const setBody = z.object({ passcode: z.string().min(4, "Passcode must be at least 4 characters").max(100), current: z.string().max(200).optional() });
// Set or change the passcode from Settings. Changing needs the current one. Rotating the secret signs everyone else out.
auth.put("/auth/passcode", wrap(async (req, res) => {
  const b = setBody.parse(req.body);
  const cfg = await getAuthConfig();
  if (cfg.mode === "env") throw new HttpError(409, "The passcode is managed by the APP_PASSCODE environment variable on the server.", "ENV_MANAGED");
  if (cfg.mode === "settings" && !cfg.verify!(b.current ?? "")) throw new HttpError(403, "Current passcode is incorrect.", "BAD_PASSCODE");
  const secret = crypto.randomBytes(32).toString("hex");
  await Setting.findOneAndUpdate({ key: "auth" }, { key: "auth", passcodeHash: hashPasscode(b.passcode), sessionSecret: secret }, { upsert: true });
  invalidateAuthCache();
  setSession(req, res, secret); // this device stays logged in
  res.json({ ok: true });
}));

auth.delete("/auth/passcode", wrap(async (req, res) => {
  const cfg = await getAuthConfig();
  if (cfg.mode === "env") throw new HttpError(409, "The passcode is managed by the APP_PASSCODE environment variable on the server.", "ENV_MANAGED");
  if (cfg.mode === "settings") {
    const current = z.object({ current: z.string().max(200).optional() }).parse(req.body ?? {}).current ?? "";
    if (!cfg.verify!(current)) throw new HttpError(403, "Current passcode is incorrect.", "BAD_PASSCODE");
    await Setting.deleteOne({ key: "auth" });
    invalidateAuthCache();
  }
  clearSession(req, res);
  res.json({ ok: true });
}));
