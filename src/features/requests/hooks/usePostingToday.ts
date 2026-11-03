import { useEffect, useState } from "react";
import { postingToday } from "../marriage-posting";

export function usePostingToday(enabled: boolean) {
  const [today, setToday] = useState(postingToday);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setToday(postingToday());
    refresh();
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [enabled]);
  return today;
}
