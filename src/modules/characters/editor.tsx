"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CharacterSprite } from "@/src/components/character-sprite";
import { ItemIcon } from "@/src/modules/farm/art";
import { buySkin, saveCharacter } from "./actions";
import { ACCESSORIES, COLORS, SPECIES, canWear, skinKey, type Accessory, type Character, type Species } from "./catalog";

export function CharacterEditor({ roomId, saved, owned, unlocks, coins }: {
  roomId: string;
  saved: Character;
  owned: string[];
  unlocks: string[];
  coins: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(saved);
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  const hasSpecies = (s: Species) => SPECIES[s].price === 0 || owned.includes(skinKey("species", s));
  const hasAccessory = (a: Accessory) => (ACCESSORIES[a].requires ? unlocks.includes(ACCESSORIES[a].requires!) : owned.includes(skinKey("accessory", a)));
  const toBuy = [
    ...(hasSpecies(draft.species) ? [] : [{ kind: "species" as const, id: draft.species, price: SPECIES[draft.species].price }]),
    ...(!draft.accessory || hasAccessory(draft.accessory) || ACCESSORIES[draft.accessory].requires
      ? [] : [{ kind: "accessory" as const, id: draft.accessory, price: ACCESSORIES[draft.accessory].price }]),
  ];
  const lockedByRoom = !!draft.accessory && !!ACCESSORIES[draft.accessory].requires && !hasAccessory(draft.accessory);
  const total = toBuy.reduce((s, b) => s + b.price, 0);
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  /** Essaie un personnage ; s'il est déjà débloqué, il est enregistré tout de suite. */
  function pick(next: Character) {
    setDraft(next);
    setMsg("");
    if (canWear(next, owned, unlocks)) startTransition(async () => { setMsg(await saveCharacter(roomId, next)); router.refresh(); });
  }

  function unlock() {
    startTransition(async () => {
      for (const b of toBuy) {
        const err = await buySkin(roomId, b.kind, b.id);
        if (err) return setMsg(err);
      }
      setMsg(await saveCharacter(roomId, draft));
      router.refresh();
    });
  }

  const tile = (active: boolean) => `relative flex flex-col items-center gap-1 rounded-2xl p-2 transition ${active ? "bg-indigo-50 ring-2 ring-indigo-500" : "bg-white shadow-sm"}`;
  const price = (n: number) => (
    <span className="absolute -right-1 -top-1 inline-flex items-center gap-0.5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
      {n}<ItemIcon id="coins" size={10} />
    </span>
  );

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-center rounded-[1.6rem] bg-[#efd9ba] pb-3 pt-6">
        <CharacterSprite character={draft} walking size={150} />
      </div>

      <div>
        <h3 className="eyebrow mb-2">Espèce</h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SPECIES) as Species[]).map((s) => (
            <button key={s} onClick={() => pick({ ...draft, species: s })} className={tile(draft.species === s)}>
              <CharacterSprite character={{ ...draft, species: s, accessory: null }} size={52} />
              <span className="text-xs font-medium">{SPECIES[s].name}</span>
              {!hasSpecies(s) && price(SPECIES[s].price)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-2">Couleur</h3>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c, i) => (
            <button
              key={c.name}
              aria-label={c.name}
              aria-pressed={draft.color === i}
              onClick={() => pick({ ...draft, color: i })}
              className={`size-9 rounded-full ring-1 ring-black/10 ${draft.color === i ? "ring-2 ring-zinc-900 ring-offset-2" : ""}`}
              style={{ background: `linear-gradient(135deg, ${c.fur} 55%, ${c.dark} 55%)` }}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="eyebrow mb-2">Accessoire</h3>
        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => pick({ ...draft, accessory: null })} className={tile(!draft.accessory)}>
            <CharacterSprite character={{ ...draft, accessory: null }} portrait size={40} />
            <span className="text-[11px] font-medium">Aucun</span>
          </button>
          {(Object.keys(ACCESSORIES) as Accessory[]).map((a) => (
            <button key={a} onClick={() => pick({ ...draft, accessory: a })} className={tile(draft.accessory === a)}>
              <CharacterSprite character={{ ...draft, accessory: a }} portrait size={40} />
              <span className="text-[11px] font-medium">{ACCESSORIES[a].name}</span>
              {!hasAccessory(a) && (ACCESSORIES[a].requires
                ? <span className="absolute -right-1 -top-1 rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">Serre</span>
                : price(ACCESSORIES[a].price))}
            </button>
          ))}
        </div>
      </div>

      {changed && !canWear(draft, owned, unlocks) && (
        lockedByRoom ? (
          <p className="text-center text-sm text-zinc-600">La couronne se débloque avec un projet de la serre.</p>
        ) : (
          <button disabled={pending || total > coins} onClick={unlock} className="btn w-full">
            Débloquer · {total} <ItemIcon id="coins" size={16} />
          </button>
        )
      )}
      {msg && <p role="alert" className="text-center text-sm text-red-700">{msg}</p>}
    </section>
  );
}
