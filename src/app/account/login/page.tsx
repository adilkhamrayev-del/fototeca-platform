"use client";

import { useActionState } from "react";
import { loginAsClient } from "./actions";

export default function AccountLoginPage() {
  const [state, formAction, pending] = useActionState(loginAsClient, undefined);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <form
        action={formAction}
        className="flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-border bg-surface p-8"
      >
        <h1 className="font-heading text-xl font-bold">Личный кабинет</h1>
        <p className="text-sm text-text-muted">
          Укажите номер телефона, который вы указывали при заказе — покажем историю ваших заказов.
        </p>

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Телефон
          <input
            type="tel"
            name="phone"
            autoFocus
            required
            placeholder="+7 700 000 00 00"
            className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
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
