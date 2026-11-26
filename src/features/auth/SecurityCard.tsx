import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "@/lib/api";
import { useSave } from "@/lib/hooks";
import { toast } from "@/components/ui/toast";
import { Card } from "@/components/ui/extra";
import { Button, Field, inputCls } from "@/components/ui/ui";

type Status = { required: boolean; authenticated: boolean; managedBy: "env" | "settings" | null };

export default function SecurityCard() {
  const { data } = useQuery({ queryKey: ["auth-status"], queryFn: () => api<Status>("/auth/status") });
  const [current, setCurrent] = useState(""); const [next, setNext] = useState("");
  const clear = () => { setCurrent(""); setNext(""); };
  const save = useSave(() => api("/auth/passcode", { method: "PUT", body: JSON.stringify({ passcode: next, current: current || undefined }) }), [], () => { toast("Passcode saved"); clear(); });
  const remove = useSave(() => api("/auth/passcode", { method: "DELETE", body: JSON.stringify({ current }) }), [], () => { toast("Passcode removed. The app is now open."); clear(); });
  const logout = useSave(() => api("/auth/logout", { method: "POST" }), [], () => window.dispatchEvent(new Event("auth-required")));
  if (!data) return <Card><p className="text-sm text-muted">Loading security settings...</p></Card>;

  const on = data.required;
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-full ${on ? "bg-receive-bg text-receive" : "bg-page text-muted"}`}>{on ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}</span>
        <div className="flex-1"><h2 className="font-semibold">Passcode protection</h2><p className="text-sm text-muted">{on ? "On. This device stays signed in for 30 days." : "Off. Anyone with the link can open the app."}</p></div>
      </div>

      {data.managedBy === "env" && <p className="rounded-chip bg-page/50 p-3 text-sm text-muted">The passcode is set by the <code>APP_PASSCODE</code> environment variable on the server. To change or remove it, edit that variable and redeploy.</p>}

      {data.managedBy !== "env" && (
        <div className="space-y-3">
          {on && <Field label="Current passcode"><input type="password" autoComplete="current-password" className={inputCls} value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>}
          <Field label={on ? "New passcode (at least 4 characters)" : "Set a passcode (at least 4 characters)"}><input type="password" autoComplete="new-password" className={inputCls} value={next} onChange={(e) => setNext(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-2">
            <Button disabled={save.isPending || next.length < 4 || (on && !current)} onClick={() => save.mutate(undefined)}>{on ? "Change passcode" : "Turn on protection"}</Button>
            {on && <Button variant="danger" disabled={remove.isPending || !current} onClick={() => confirm("Remove the passcode? Anyone with the link will be able to open the app.") && remove.mutate(undefined)}>Remove passcode</Button>}
          </div>
        </div>)}

      {on && <Button variant="soft" onClick={() => logout.mutate(undefined)}><LogOut size={16} /> Log out of this device</Button>}
    </Card>
  );
}
