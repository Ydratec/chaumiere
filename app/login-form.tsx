"use client";

import { useActionState } from "react";
import { Cat } from "@/src/components/cat";
import { Wordmark } from "@/src/components/logo";
import { login } from "./actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, "");
  return (
    <main className="min-h-screen px-4 py-8 text-zinc-900">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-md flex-col justify-center">
        <header className="mb-8">
          <div className="mb-6 flex items-end justify-between">
            <Wordmark />
            <div className="flex -space-x-2"><Cat coat={0} size={52} /><Cat coat={2} mood="love" size={52} /><Cat coat={1} mood="wow" size={52} /></div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Connecte-toi</h1>
        </header>
        <form action={action} className="space-y-4">
          <label className="block">
            <span className="eyebrow">Identifiant</span>
            <input name="username" autoComplete="username" autoCapitalize="none" required className="field mt-1.5 bg-white shadow-sm" />
          </label>
          <label className="block">
            <span className="eyebrow">Code PIN</span>
            <input
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              placeholder="4 chiffres"
              required
              className="field mt-1.5 bg-white tracking-[0.5em] shadow-sm"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={pending}
            className="btn w-full"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  );
}
