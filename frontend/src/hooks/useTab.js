import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export function useTab(defaultTab) {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || defaultTab;
  const setTab = useCallback((t) => setParams({ tab: t }), [setParams]);
  return [tab, setTab];
}
