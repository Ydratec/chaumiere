// Pour l'hébergement (Coolify, Docker) : répond « ok » tant que le serveur tourne. Ne touche pas à la base.
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, at: new Date().toISOString() });
}
