"use client";

import { useActionState } from "react";

type ActionState = { error?: string } | undefined;
type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

export default function NewCatalogItemForm({ action }: { action: ActionFn }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
      <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium">
        Название
        <input
          type="text"
          name="title"
          required
          placeholder="Фотокнига в коробе"
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Цена «от», ₸
        <input
          type="number"
          name="priceFrom"
          min={0}
          required
          className="w-32 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="flex items-center gap-2.5 pb-2.5 text-sm font-medium">
        <input type="checkbox" name="requiresUpload" defaultChecked className="h-4 w-4 accent-accent" />
        Требует загрузки фото
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Создание…" : "+ Добавить"}
      </button>
      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
