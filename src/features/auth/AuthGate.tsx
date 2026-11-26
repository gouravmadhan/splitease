import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, inputCls } from "@/components/ui/ui";

export type AuthState = "INITIALIZING" | "AUTH_REQUIRED" | "AUTHENTICATING" | "AUTHENTICATED" | "AUTH_ERROR" | "APP_LOADING" | "APP_READY" | "APP_ERROR";
type Status = { required: boolean; authenticated: boolean; managedBy: "env" | "settings" | null };

const Splash = ({ label }: { label: string }) => (
  <div className="grid min-h-screen place-items-center"><div role="status" className="flex items-center gap-3 text-muted"><Loader2 className="animate-spin" size={20} />{label}</div></div>);

function PasscodeScreen({ busy, error, onSubmit }: { busy: boolean; error: string; onSubmit: (p: string) => void }) {
  const [value, setValue] = useState(""); const [show, setShow] = useState(false);
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm space-y-5 rounded-card bg-card p-6 shadow-lg">
        <div className="text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-2xl font-bold">SplitEase</h1>
          <p className="mt-1 text-sm text-muted">Enter your passcode to continue.</p>
        </div>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (value && !busy) onSubmit(value); }}>
          <div className="relative">
            <input autoFocus type={show ? "text" : "password"} aria-label="Passcode" autoComplete="current-password" className={`${inputCls} pr-12`} value={value}
              onChange={(e) => setValue(e.target.value)} placeholder="Passcode" disabled={busy} aria-invalid={!!error} />
            <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide passcode" : "Show passcode"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted">
              {show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
          </div>
          {error && <p role="alert" className="rounded-chip bg-pay-bg px-3 py-2 text-sm text-pay">{error}</p>}
          <Button type="submit" className="w-full py-3 text-base" disabled={busy || !value}>
            {busy ? <><Loader2 className="animate-spin" size={18} /> Checking...</> : <><Lock size={16} /> Unlock</>}</Button>
        </form>
      </div>
    </div>
  );
}

/**
 * Startup flow. One cheap status call decides everything:
 *   protection OFF (the default) -> straight to APP_READY, no passcode UI, no passcode requests
 *   protection ON, no session   -> AUTH_REQUIRED -> AUTHENTICATING -> AUTHENTICATED -> APP_LOADING -> APP_READY
 * Wrong passcode -> AUTH_ERROR (retry on the same screen). Unreachable/slow server -> APP_ERROR with Retry.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [state, setState] = useState<AuthState>("INITIALIZING");
  const [message, setMessage] = useState("");

  const check = useCallback(async () => {
    setState("INITIALIZING"); setMessage("");
    try {
      const s = await api<Status>("/auth/status");
      setState(!s.required || s.authenticated ? "APP_READY" : "AUTH_REQUIRED");
    } catch (e) { setMessage((e as Error).message); setState("APP_ERROR"); }
  }, []);

  useEffect(() => {
    check();
    const onRequired = () => { qc.clear(); setMessage(""); setState("AUTH_REQUIRED"); }; // session expired / protection switched on elsewhere
    window.addEventListener("auth-required", onRequired);
    return () => window.removeEventListener("auth-required", onRequired);
  }, [check, qc]);

  const login = async (passcode: string) => {
    setState("AUTHENTICATING"); setMessage("");
    try { await api("/auth/login", { method: "POST", body: JSON.stringify({ passcode }) }); }
    catch (e) { setMessage((e as ApiError).message); setState("AUTH_ERROR"); return; }
    setState("AUTHENTICATED"); setState("APP_LOADING");
    try { await qc.fetchQuery({ queryKey: ["groups"], queryFn: () => api("/groups"), staleTime: 0 }); setState("APP_READY"); }
    catch (e) { setMessage((e as Error).message); setState("APP_ERROR"); }
  };

  switch (state) {
    case "INITIALIZING": return <Splash label="Starting..." />;
    case "AUTHENTICATED": case "APP_LOADING": return <Splash label="Loading your data..." />;
    case "AUTH_REQUIRED": case "AUTHENTICATING": case "AUTH_ERROR":
      return <PasscodeScreen busy={state === "AUTHENTICATING"} error={state === "AUTH_ERROR" ? message : ""} onSubmit={login} />;
    case "APP_ERROR":
      return (<div className="grid min-h-screen place-items-center px-4"><div className="w-full max-w-sm space-y-4 rounded-card bg-card p-6 text-center">
        <h1 className="text-xl font-bold">Can't load SplitEase</h1><p className="text-sm text-muted">{message}</p>
        <Button className="w-full py-3" onClick={check}>Try again</Button></div></div>);
    default: return <>{children}</>;
  }
}
