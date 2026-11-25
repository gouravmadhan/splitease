import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Group } from "./types";
import { toast } from "@/components/ui/toast";

/** Run a mutation, then refresh every query (balances are derived, so anything may change). */
export function useSave<T>(fn: (v: T) => Promise<any>, _keys: string[][] = [], onDone?: (r: any) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => { qc.invalidateQueries(); onDone?.(r); },
    onError: (e) => toast((e as Error).message, "err"),
  });
}
export const useGroups = () => useQuery({ queryKey: ["groups"], queryFn: () => api<Group[]>("/groups") });

/** Active group = the one flagged on the server; falls back to the first group. Deleting it falls back automatically. */
export function useActiveGroup() {
  const { data: groups, isLoading } = useGroups();
  const active = groups?.find((g) => g.isDefault) ?? groups?.[0];
  return { groups, active, isLoading };
}
export function useSetActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/groups/${id}/default`, { method: "POST" }),
    onMutate: (id) => { qc.setQueryData<Group[]>(["groups"], (old) => old?.map((g) => ({ ...g, isDefault: g._id === id }))); }, // instant switch
    onSettled: () => qc.invalidateQueries(),
    onError: (e) => toast((e as Error).message, "err"),
  });
}
/** Dashboard scope: the active group (default) or all groups combined. Remembered on this device. */
export function useScope() {
  const [scope, set] = useState<"active" | "all">(() => { try { return localStorage.getItem("dashScope") === "all" ? "all" : "active"; } catch { return "active"; } });
  return [scope, (s: "active" | "all") => { set(s); try { localStorage.setItem("dashScope", s); } catch {} }] as const;
}

export const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
