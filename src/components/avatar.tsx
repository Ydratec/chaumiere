/* eslint-disable @next/next/no-img-element */
import { defaultCharacter, type Character } from "@/src/modules/characters/catalog";
import { CharacterSprite } from "./character-sprite";

/** Photo si elle existe, sinon le personnage du membre (ou un chat généré à partir du nom). */
export function Avatar({ url, name, character, size = 40 }: { url?: string | null; name: string; character?: Character | null; size?: number }) {
  // Un autocollant rond : contour d'encre (et marge blanche découpée dès qu'il est assez grand pour la voir).
  const ring = `shrink-0 rounded-full border-ink ${size >= 22 ? "border-2" : "border"} ${size >= 36 ? "cut" : ""}`;
  if (url) return <img src={url} alt={name} style={{ width: size, height: size }} className={`${ring} object-cover`} />;
  return (
    <span style={{ width: size, height: size }} className={`${ring} inline-flex items-center justify-center overflow-hidden bg-zinc-100`}>
      <CharacterSprite character={character ?? defaultCharacter(name)} portrait size={size} />
    </span>
  );
}
