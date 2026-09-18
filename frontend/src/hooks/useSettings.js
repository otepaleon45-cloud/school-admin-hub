import { useEffect, useState } from "react";
import api from "@/lib/api";

let cache = null;
const listeners = new Set();

export function refreshSettings() {
  return api.get("/settings").then((r) => {
    cache = r.data;
    listeners.forEach((fn) => fn(cache));
    return cache;
  });
}

export function useSettings() {
  const [settings, setSettings] = useState(cache);
  useEffect(() => {
    listeners.add(setSettings);
    if (!cache) refreshSettings().catch(() => {});
    return () => listeners.delete(setSettings);
  }, []);
  return settings || { nom_ecole: "", sigle: "", ville: "", annee_scolaire: "", options: [] };
}
