"use client";

import { useActionState } from "react";
import type { CatalogItemRecord } from "@/lib/repo/catalog";

type ActionState = { success?: boolean; error?: string } | undefined;
type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

export default function CatalogItemForm({
  item,
  action,
}: {
  item: CatalogItemRecord;
  action: ActionFn;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Название
        <input
          type="text"
          name="title"
          defaultValue={item.title}
          required
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Описание
        <textarea
          name="description"
          defaultValue={item.description}
          rows={3}
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Цена «от», ₸
        <input
          type="number"
          name="priceFrom"
          defaultValue={item.priceFrom}
          min={0}
          required
          className="w-40 rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={item.isActive}
          className="h-4 w-4 accent-accent"
        />
        Активна (видна в каталоге)
      </label>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <div className="mt-1 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        {state?.success && <span className="text-sm font-medium text-ok">Сохранено.</span>}
      </div>
    </form>
  );
}
