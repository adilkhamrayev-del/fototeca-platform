"use client";

import { useActionState } from "react";
import type { ArticleRecord } from "@/lib/repo/articles";

type ActionState = { success?: boolean; error?: string } | undefined;
type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

export default function ArticleForm({
  article,
  action,
  submitLabel,
}: {
  article?: ArticleRecord;
  action: ActionFn;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Заголовок
          <input
            type="text"
            name="title"
            defaultValue={article?.title}
            required
            className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Тег
          <input
            type="text"
            name="tag"
            defaultValue={article?.tag}
            placeholder="Гайд"
            className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Краткое описание (для карточки)
        <textarea
          name="excerpt"
          defaultValue={article?.excerpt}
          rows={2}
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Текст статьи
        <textarea
          name="content"
          defaultValue={article?.content}
          rows={10}
          className="rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Статус
        <select
          name="status"
          defaultValue={article?.status ?? "DRAFT"}
          className="w-fit rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        >
          <option value="DRAFT">Черновик</option>
          <option value="PUBLISHED">Опубликована</option>
        </select>
      </label>

      {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Сохранение…" : submitLabel}
        </button>
        {state?.success && <span className="text-sm font-medium text-ok">Сохранено.</span>}
      </div>
    </form>
  );
}
