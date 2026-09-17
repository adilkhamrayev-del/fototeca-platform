"use client";

import { useActionState, useState, useTransition } from "react";
import type { CoverMaterialVariant, MaterialKind } from "@/lib/repo/cover-variants";
import PhotoUploadField from "./PhotoUploadField";

type RowState = { error?: string; success?: true } | undefined;
type UpsertFn = (
  material: MaterialKind,
  state: RowState,
  formData: FormData,
) => Promise<RowState>;
type DeleteFn = (id: string) => Promise<{ error?: string }>;

const inputClass =
  "w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-accent";

// Same Save/Delete pair styling as every other row-level form in the admin
// catalog editors (cover options, box-material variants) — see the
// matching comment in CatalogFormatsEditor.tsx.
const saveButtonClass =
  "rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50";
const deleteButtonClass =
  "rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50";

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
      <PhotoUploadField imageUrl={imageUrl} onChange={setImageUrl} endpoint="/api/admin/cover-media" alt="Превью варианта" />
      <input
        name="name"
        defaultValue={variant.name}
        required
        className={`${inputClass} w-48`}
        placeholder="Название варианта"
      />
      <button type="submit" disabled={pending} className={saveButtonClass}>
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
        className={deleteButtonClass}
      >
        {deleting ? "…" : "Удалить"}
      </button>
      {state?.success && <span className="text-xs font-medium text-ok">Сохранено</span>}
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
      <PhotoUploadField imageUrl={imageUrl} onChange={setImageUrl} endpoint="/api/admin/cover-media" alt="Превью варианта" />
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
