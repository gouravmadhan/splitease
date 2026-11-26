import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";

// Only the database layer is faked; the real Express app, auth guard, routes and crypto run.
const store = vi.hoisted(() => ({ doc: null as any }));
vi.mock("../server/db", () => ({ connectDB: async () => undefined }));
vi.mock("../server/models/index", async (orig) => {
  const real: any = await orig();
  return {
    ...real,
    Setting: {
      findOne: () => ({ lean: async () => store.doc }),
      findOneAndUpdate: async (_q: unknown, u: any) => { store.doc = { ...u }; },
      deleteOne: async () => { store.doc = null; },
    },
    Group: { find: () => ({ sort: () => ({ lean: async () => [] }) }) },
    Member: { aggregate: async () => [] },
    Advance: { aggregate: async () => [] },
  };
});

import { hashPasscode, invalidateAuthCache, issueToken, validToken, verifyHash } from "../server/services/auth";

let server: any, base = "";
beforeAll(async () => { const { app } = await import("../server/app"); server = app.listen(0); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; });
afterAll(() => server.close());
beforeEach(() => { store.doc = null; delete process.env.APP_PASSCODE; invalidateAuthCache(); });

async function call(path: string, o: { method?: string; body?: unknown; cookie?: string } = {}) {
  const res = await fetch(base + path, { method: o.method ?? "GET", headers: { "Content-Type": "application/json", ...(o.cookie ? { Cookie: o.cookie } : {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });
  return { status: res.status, json: await res.json().catch(() => ({})), cookie: res.headers.get("set-cookie")?.split(";")[0] };
}

describe("Scenario A: no password configured (the default)", () => {
  it("reports protection off and never blocks the API", async () => {
    expect((await call("/api/auth/status")).json).toEqual({ required: false, authenticated: true, managedBy: null });
    expect((await call("/api/groups")).status).toBe(200);
    expect((await call("/api/dashboard")).status).not.toBe(401);
  });
  it("treats an empty or whitespace APP_PASSCODE as disabled", async () => {
    for (const v of ["", "   "]) {
      process.env.APP_PASSCODE = v; invalidateAuthCache();
      expect((await call("/api/auth/status")).json.required).toBe(false);
      expect((await call("/api/groups")).status).toBe(200);
    }
  });
  it("does not validate anything when login is called with protection off", async () => {
    const r = await call("/api/auth/login", { method: "POST", body: { passcode: "whatever" } });
    expect(r.status).toBe(200); expect(r.json.required).toBe(false);
  });
});

describe("Scenario B: passcode managed from Settings", () => {
  const PASS = "s3cret-passcode";
  it("full lifecycle: add -> protected -> login -> change -> remove", async () => {
    // add (app is open, so no auth is needed to turn protection on)
    expect((await call("/api/auth/passcode", { method: "PUT", body: { passcode: "abc" } })).status).toBe(400); // too short
    const set = await call("/api/auth/passcode", { method: "PUT", body: { passcode: PASS } });
    expect(set.status).toBe(200); expect(set.cookie).toContain("se_session=");
    expect(JSON.stringify(store.doc)).not.toContain(PASS); // only a hash is stored

    // protection is now active
    expect((await call("/api/auth/status")).json).toEqual({ required: true, authenticated: false, managedBy: "settings" });
    const blocked = await call("/api/groups");
    expect(blocked.status).toBe(401); expect(blocked.json.code).toBe("AUTH_REQUIRED");
    expect((await call("/api/groups", { cookie: set.cookie })).status).toBe(200); // the device that set it stays logged in
    expect((await call("/api/health")).status).toBe(200); // health stays exempt

    // wrong vs right passcode are different outcomes
    const bad = await call("/api/auth/login", { method: "POST", body: { passcode: "nope" } });
    expect(bad.status).toBe(401); expect(bad.json.code).toBe("BAD_PASSCODE"); expect(bad.json.error).toBe("Incorrect passcode. Please try again.");
    const good = await call("/api/auth/login", { method: "POST", body: { passcode: PASS } });
    expect(good.status).toBe(200);
    expect((await call("/api/groups", { cookie: good.cookie })).status).toBe(200);
    expect((await call("/api/auth/status", { cookie: good.cookie })).json.authenticated).toBe(true);

    // change: needs the current passcode, validates against the NEW one afterwards, signs old sessions out
    expect((await call("/api/auth/passcode", { method: "PUT", cookie: good.cookie, body: { passcode: "brand-new-1", current: "wrong" } })).status).toBe(403);
    const changed = await call("/api/auth/passcode", { method: "PUT", cookie: good.cookie, body: { passcode: "brand-new-1", current: PASS } });
    expect(changed.status).toBe(200);
    expect((await call("/api/groups", { cookie: good.cookie })).status).toBe(401); // old session invalid
    expect((await call("/api/auth/login", { method: "POST", body: { passcode: PASS } })).status).toBe(401); // old passcode rejected
    const again = await call("/api/auth/login", { method: "POST", body: { passcode: "brand-new-1" } });
    expect(again.status).toBe(200);

    // remove: needs current, then the app is open again
    expect((await call("/api/auth/passcode", { method: "DELETE", cookie: again.cookie, body: { current: "wrong" } })).status).toBe(403);
    expect((await call("/api/auth/passcode", { method: "DELETE", cookie: again.cookie, body: { current: "brand-new-1" } })).status).toBe(200);
    expect((await call("/api/auth/status")).json).toEqual({ required: false, authenticated: true, managedBy: null });
    expect((await call("/api/groups")).status).toBe(200); // no cookie needed any more
  });
  it("rejects forged, tampered and expired session cookies", async () => {
    await call("/api/auth/passcode", { method: "PUT", body: { passcode: PASS } });
    for (const c of ["se_session=123.abc", "se_session=", `se_session=${Date.now() - 1000}.deadbeef`, "other=1"]) {
      expect((await call("/api/groups", { cookie: c })).status).toBe(401);
    }
  });
});

describe("Scenario C: passcode set by the APP_PASSCODE environment variable", () => {
  beforeEach(() => { process.env.APP_PASSCODE = "env-pass"; });
  it("protects the API and logs in with the right passcode only", async () => {
    expect((await call("/api/auth/status")).json).toEqual({ required: true, authenticated: false, managedBy: "env" });
    expect((await call("/api/groups")).status).toBe(401);
    expect((await call("/api/auth/login", { method: "POST", body: { passcode: "x" } })).status).toBe(401);
    const ok = await call("/api/auth/login", { method: "POST", body: { passcode: "env-pass" } });
    expect(ok.status).toBe(200);
    expect((await call("/api/groups", { cookie: ok.cookie })).status).toBe(200);
  });
  it("cannot be changed or removed from the app, and changing the variable signs everyone out", async () => {
    const ok = await call("/api/auth/login", { method: "POST", body: { passcode: "env-pass" } });
    expect((await call("/api/auth/passcode", { method: "PUT", cookie: ok.cookie, body: { passcode: "other-pass" } })).status).toBe(409);
    expect((await call("/api/auth/passcode", { method: "DELETE", cookie: ok.cookie, body: {} })).status).toBe(409);
    process.env.APP_PASSCODE = "rotated-pass";
    expect((await call("/api/groups", { cookie: ok.cookie })).status).toBe(401);
  });
  it("removing the variable switches protection off", async () => {
    delete process.env.APP_PASSCODE;
    expect((await call("/api/groups")).status).toBe(200);
  });
  it("logout clears the session cookie", async () => {
    const r = await call("/api/auth/logout", { method: "POST" });
    expect(r.status).toBe(200); expect(r.cookie).toBe("se_session=");
  });
});

describe("crypto helpers", () => {
  it("hashes with a salt and verifies", () => {
    const h = hashPasscode("hello-world");
    expect(h).not.toContain("hello-world"); expect(hashPasscode("hello-world")).not.toBe(h);
    expect(verifyHash("hello-world", h)).toBe(true); expect(verifyHash("Hello-world", h)).toBe(false);
  });
  it("tokens only validate with the secret that signed them", () => {
    const t = issueToken("secret-a");
    expect(validToken("secret-a", t)).toBe(true); expect(validToken("secret-b", t)).toBe(false); expect(validToken("secret-a", undefined)).toBe(false);
  });
});
