"use client";

import { useActionState } from "react";
import { login } from "./actions";

const input =
  "w-full rounded-xl border border-zinc-300 px-4 py-3 text-base outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-md flex-col justify-center">
        <header className="mb-8">
          <p className="text-sm font-bold text-indigo-600">ENTRE AMIS</p>
          <h1 className="mt-3 text-3xl font-bold">Retrouve ta salle</h1>
          <p className="mt-2 text-zinc-600">Connecte-toi pour découvrir la question du jour.</p>
        </header>
        <form action={action} className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-medium">
            Identifiant
            <input name="username" autoComplete="username" required className={`${input} mt-1.5`} />
          </label>
          <label className="block text-sm font-medium">
            Code PIN
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              placeholder="4 chiffres"
              required
              className={`${input} mt-1.5`}
            />
          </label>
          <label className="block text-sm font-medium">
            Code de la salle
            <input name="code" required className={`${input} mt-1.5`} />
          </label>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Rejoindre la salle
          </button>
        </form>
      </div>
    </main>
  );
}
