// Personnage d'un joueur dans l'usine de Noël : corps + accessoire, découpés dans les planches pixel art.
// L'image affichée (`frame`) est pilotée par la boucle du jeu (voir frameAt dans ./sprites).
import type { Character } from "@/src/modules/characters/catalog";
import { accessorySheet, bodySheet, FRAME_H, FRAME_W, frameRect, type Animation, type Direction, type UsineAccessory } from "./sprites";

export function WorkerSprite({
  character, accessory = null, animation = "idle", direction = "down", frame = 0, scale = 2,
}: {
  character: Pick<Character, "species" | "color">;
  accessory?: UsineAccessory | null;
  animation?: Animation;
  direction?: Direction;
  frame?: number;
  scale?: number;
}) {
  const r = frameRect(animation, direction, frame);
  const layer = (src: string) => ({
    position: "absolute" as const, inset: 0,
    backgroundImage: `url(${src})`,
    backgroundPosition: `-${r.x * scale}px -${r.y * scale}px`,
    backgroundSize: `${4 * FRAME_W * scale}px ${16 * FRAME_H * scale}px`,
    imageRendering: "pixelated" as const,
  });
  const acc = accessorySheet(character.species, accessory);
  return (
    <div style={{ position: "relative", width: FRAME_W * scale, height: FRAME_H * scale }} aria-hidden>
      <div style={layer(bodySheet(character))} />
      {acc && <div style={layer(acc)} />}
    </div>
  );
}
