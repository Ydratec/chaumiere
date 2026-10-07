/* eslint-disable @next/next/no-img-element */
import { defaultCharacter, type Character } from "@/src/modules/characters/catalog";
import { CharacterSprite } from "./character-sprite";

/** Photo si elle existe, sinon le personnage du membre (ou un chat généré à partir du nom). */
export function Avatar({ url, name, character, size = 40 }: { url?: string | null; name: string; character?: Character | null; size?: number }) {
  if (url) return <img src={url} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />;
  return (
    <span style={{ width: size, height: size }} className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100">
      <CharacterSprite character={character ?? defaultCharacter(name)} portrait size={size * 0.92} />
    </span>
  );
}
