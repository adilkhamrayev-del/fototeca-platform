"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import type { CoverMaterialVariant, MaterialKind } from "@/lib/repo/cover-variants";

type RowState = { error?: string; success?: true } | undefined;
type UpsertFn = (
  material: MaterialKind,
  state: RowState,
  formData: FormData,
) => Promise<RowState>;
type DeleteFn = (id: string) => Promise<{ error?: string }>;

const inputClass =
  "w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-accent";

export default function CoverMaterialsEditor({
  tkanevaya,
  ekokozha,
  upsertAction,
  deleteAction,
}: {
  tkanevaya: CoverMaterialVariant[];
  ekokozha: CoverMaterialVariant[];
  upsertAction: UpsertFn;
  deleteAction: DeleteFn;
}) {
  return (
    <div className="flex flex-col gap-6">
      <MaterialSection
        title="Тканевая — варианты"
        material="tkanevaya"
        variants={tkanevaya}
        upsertAction={upsertAction}
        deleteAction={deleteAction}
      />
      <MaterialSection
        title="Экокожа — варианты"
        material="ekokozha"
        variants={ekokozha}
        upsertAction={upsertAction}
        deleteAction={deleteAction}
      />
    </div>
  );
}

function MaterialSection({
  title,
  material,
  variants,
  upsertAction,
  deleteAction,
}: {
  title: string;
  material: MaterialKind;
  variants: CoverMaterialVariant[];
  upsertAction: UpsertFn;
  deleteAction: DeleteFn;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <p className="mb-3 text-sm font-bold">{title}</p>
      <div className="flex flex-col gap-2">
        {variants.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            material={material}
            upsertAction={upsertAction}
            deleteAction={deleteAction}
          />
        ))}
        <NewVariantRow material={material} upsertAction={upsertAction} />
      </div>
    </div>
  );
}

function PhotoUpload({
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
      const res = await fetch("/api/admin/cover-media", { method: "POST", body });
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
    <div className="flex items-center gap-2">
      {imageUrl ? (
        <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Превью варианта" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white opacity-0 hover:opacity-100"
          >
            Убрать
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="h-9 w-9 shrink-0 rounded-lg border-2 border-dashed border-border text-[10px] font-medium text-text-muted disabled:opacity-50"
          title="Загрузить фото варианта"
        >
          {uploading ? "…" : "Фото"}
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {uploadError && <span className="text-[11px] font-medium text-red-600">{uploadError}</span>}
    </div>
  );
}

function VariantRow({
  variant,
  material,
  upsertAction,
  deleteAction,
}: {
  variant: CoverMaterialVariant;
  material: MaterialKind;
  upsertAction: UpsertFn;
  deleteAction: DeleteFn;
}) {
  const boundAction = upsertAction.bind(null, material);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(variant.imageUrl ?? null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="variantId" value={variant.id} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <PhotoUpload imageUrl={imageUrl} onChange={setImageUrl} />
      <input
        name="name"
        defaultValue={variant.name}
        required
        className={`${inputClass} w-48`}
        placeholder="Название варианта"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        {pending ? "…" : "Сохранить"}
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={() => {
          if (!confirm(`Удалить вариант «${variant.name}»?`)) return;
          setDeleteError(null);
          startDelete(async () => {
            const result = await deleteAction(variant.id);
            if (result.error) setDeleteError(result.error);
          });
        }}
        className="text-xs font-semibold text-red-600 disabled:opacity-50"
      >
        Удалить
      </button>
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
      {deleteError && <span className="text-xs font-medium text-red-600">{deleteError}</span>}
    </form>
  );
}

function NewVariantRow({
  material,
  upsertAction,
}: {
  material: MaterialKind;
  upsertAction: UpsertFn;
}) {
  const boundAction = upsertAction.bind(null, material);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 pt-1">
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <PhotoUpload imageUrl={imageUrl} onChange={setImageUrl} />
      <input name="name" required placeholder="Новый вариант" className={`${inputClass} w-48`} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? "…" : "+ Добавить вариант"}
      </button>
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  );
}
