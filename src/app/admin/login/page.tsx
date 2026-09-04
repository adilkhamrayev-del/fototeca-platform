"use client";

import { useState, useActionState } from "react";
import { login } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-surface p-8"
      >
        <h1 className="font-heading text-xl font-bold">Вход в админ-панель</h1>
        <p className="text-sm text-text-muted">Fototeca — управление сайтом</p>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Пароль
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoFocus
              required
              className="w-full rounded-xl border border-border px-3.5 py-2.5 pr-16 text-sm outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-muted hover:bg-surface-2"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
        </label>

        {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Проверка…" : "Войти"}
        </button>
      </form>
    </main>
  );
}
