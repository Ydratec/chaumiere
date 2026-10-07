"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { savePrefs, sendTest, subscribe, unsubscribe, type Prefs } from "./actions";

const LABELS: Record<keyof Prefs, string> = {
  question: "Question du jour (9 h)",
  games: "Jeux : défis, à toi de jouer",
  chat: "Messages de la discussion",
  farm: "Serre : récoltes, échanges, projets",
};

/** État de l'appareil (lu côté navigateur seulement). */
function device(): "unsupported" | "install" | "ok" {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    // iPhone dans Safari : les notifications n'existent que pour l'app installée sur l'écran d'accueil
    return /iPhone|iPad/.test(navigator.userAgent) ? "install" : "unsupported";
  }
  return "ok";
}

function key(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function NotificationSettings({ initial }: { initial: Prefs }) {
  const state = useSyncExternalStore(() => () => {}, device, () => "ok" as const);
  const [sub, setSub] = useState<PushSubscription | null | undefined>(undefined); // undefined = on ne sait pas encore
  const [prefs, setPrefs] = useState(initial);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state !== "ok") return;
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then(setSub).catch(() => setSub(null));
  }, [state]);

  function enable() {
    startTransition(async () => {
      if ((await Notification.requestPermission()) !== "granted")
        return setMsg("Notifications refusées : autorise-les dans les réglages du téléphone pour cette app.");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      await navigator.serviceWorker.ready;
      const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
      setMsg(await subscribe(JSON.parse(JSON.stringify(s))));
      setSub(s);
    });
  }
  function disable() {
    startTransition(async () => {
      if (sub) {
        await unsubscribe(sub.endpoint);
        await sub.unsubscribe();
      }
      setSub(null);
    });
  }
  function toggle(k: keyof Prefs) {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    startTransition(() => savePrefs(next));
  }

  if (state === "unsupported") return <p className="text-sm text-zinc-500">Ce navigateur ne gère pas les notifications.</p>;
  if (state === "install")
    return <p className="text-sm text-zinc-600">Sur iPhone, installe d&apos;abord l&apos;app : Safari → Partager → « Sur l&apos;écran d&apos;accueil », puis ouvre-la depuis l&apos;icône.</p>;

  return (
    <div className="space-y-3">
      {sub === null && <button disabled={pending} onClick={enable} className="btn w-full">Activer sur cet appareil</button>}
      {sub && (
        <>
          <div className="rows">
            {(Object.keys(LABELS) as (keyof Prefs)[]).map((k) => (
              <label key={k} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                {LABELS[k]}
                <input type="checkbox" checked={prefs[k]} onChange={() => toggle(k)} className="size-5 accent-indigo-600" />
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button disabled={pending} onClick={() => startTransition(() => sendTest())} className="btn-soft flex-1 bg-white shadow-sm">Envoyer un test</button>
            <button disabled={pending} onClick={disable} className="btn-soft flex-1 bg-white shadow-sm">Désactiver ici</button>
          </div>
        </>
      )}
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
    </div>
  );
}
