import { useEffect, useState } from "react";
import { nowMinute } from "./minutes";

/** The current minute, refreshed every 30 s (moves the "agora" line). */
export function useNowMinute() {
  const [now, setNow] = useState(() => nowMinute());
  useEffect(() => {
    const id = setInterval(() => setNow(nowMinute()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
