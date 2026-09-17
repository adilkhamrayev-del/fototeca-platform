"use client";

import { useActionState, useRef, useState } from "react";
import type { CatalogItemRecord } from "@/lib/repo/catalog";

type ActionState = { success?: boolean; error?: string } | undefined;
type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

// Same upload-a-photo widget as the cover-option/material-variant rows
// (PhotoUpload in CatalogFormatsEditor.tsx etc.) — the catalog item's own
// card photo, shown on the homepage/catalog grid instead of the plain
// gradient once one is set (see CatalogGrid.tsx).
function ItemPhotoUpload({
  imageUrl,
  onChange,
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/catalog-item-media", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Не удалось загрузить файл.");
        return;
      }
      onChange(data.url);
    } catch {
      setUploadError("Не удалось загрузить файл — проверьте соединение.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void uploadFile(file);
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium">
      Фото карточки
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <div className="relative h-16 w-24 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Фото карточки товара" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-[11px] font-semibold text-white opacity-0 hover:opacity-100"
            >
              Убрать
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs font-medium text-text-muted disabled:opacity-50"
          >
            {uploading ? "…" : "Загрузить"}
          </button>
        )}
        {imageUrl && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs font-semibold text-accent-ink underline disabled:opacity-50"
          >
            {uploading ? "Загрузка…" : "Заменить фото"}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {uploadError && <span className="text-xs font-medium text-red-600">{uploadError}</span>}
      <p className="text-xs text-text-muted">
        Если не задать — на карточке будет цветной градиент, как сейчас.
      </p>
    </div>
  );
}

export default function CatalogItemForm({
  item,
  action,
}: {
  item: CatalogItemRecord;
  action: ActionFn;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(item.coverImageUrl ?? null);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <ItemPhotoUpload imageUrl={imageUrl} onChange={setImageUrl} />

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
