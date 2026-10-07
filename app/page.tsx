import Link from "next/link";
import { Wordmark } from "@/src/components/logo";
import { Icon } from "@/src/components/icons";
import { Avatar } from "@/src/components/avatar";
import { getMyRooms } from "@/src/modules/rooms/context";
import { JoinForms } from "@/src/modules/rooms/join-forms";
import { logout } from "./actions";
import { LoginForm } from "./login-form";

export default async function Home() {
  const rooms = await getMyRooms();
  if (!rooms) return <LoginForm />;

  return (
    <main className="min-h-screen px-4 py-6 text-zinc-900">
      <div className="mx-auto max-w-md space-y-6">
        <header className="flex items-center justify-between">
          <h1><Wordmark /></h1>
          <form action={logout}>
            <button className="btn-soft">Se déconnecter</button>
          </form>
        </header>
        <h2 className="eyebrow pt-4">Mes salles</h2>
        {rooms.length > 0 && (
          <ul className="rows">
            {rooms.map((r) => (
              <li key={r.room_id}>
                <Link
                  href={`/r/${r.room_id}`}
                  className="group flex items-center gap-4 py-3"
                >
                  <Avatar url={r.rooms.avatar_url} name={r.rooms.name} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold tracking-tight">{r.rooms.name}</p>
                    <p className="text-sm text-zinc-500">Tu es « {r.username} »</p>
                  </div>
                  <span className="text-zinc-400 transition group-hover:translate-x-0.5"><Icon name="arrow" size={18} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rooms.length === 0 && <p className="text-zinc-600">Tu n&apos;as pas encore de salle : rejoins-en une ou crée la tienne.</p>}
        <JoinForms />
      </div>
    </main>
  );
}
