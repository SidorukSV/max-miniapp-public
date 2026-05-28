import { useEffect, useMemo, useState } from "react";

export function useMaxWebApp() {
  const [webApp, setWebApp] = useState(null);
  const [initData, setInitData] = useState("");
  const [initDataUnsafe, setInitDataUnsafe] = useState(null);
  const [phone, setPhone] = useState(null);

  useEffect(() => {
    const wa = window.WebApp;
    if (!wa) return;

    const sync = () => {
      // берём актуальное из wa каждый раз, когда “готово”
      setWebApp(wa);
      setInitData(wa.initData ?? "");
      setInitDataUnsafe(wa.initDataUnsafe ?? null);
    };

    // 1) первичная попытка (иногда уже есть)
    sync();

    // 2) говорим хосту, что UI готов
    wa.ready?.();

    return () => {
      wa.offEvent?.("WebAppReady", sync);
    };
  }, []);

  const user = initDataUnsafe?.user ?? null;
  const platform = webApp?.platform ?? null;
  const version = webApp?.version ?? null;

  return { webApp, initData, initDataUnsafe, user, platform, version };
}