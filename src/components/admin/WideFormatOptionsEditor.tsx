"use client";

import { useActionState, useState } from "react";
import type { WideFormatOption, WideFormatPricingMode } from "@/lib/content";
import PhotoUploadField from "./PhotoUploadField";

type RowState = { error?: string; success?: true } | undefined;
type UpsertFn = (state: RowState, formData: FormData) => Promise<RowState>;
type DeleteFn = (id: string) => Promise<{ error?: string }>;

const inputClass =
  "w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-accent";

// Same Save/Delete pair styling as every other row-level form in the admin
// catalog editors (cover options, cover-material/box-material variants) —
// see the matching comment in CatalogFormatsEditor.tsx.
const saveButtonClass =
  "rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50";
const deleteButtonClass =
  "rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50";

export default function WideFormatOptionsEditor({
  options,
  upsertAction,
  deleteAction,
}: {
  options: WideFormatOption[];
  upsertAction: UpsertFn;
  deleteAction: DeleteFn;
}) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <OptionRow
          key={option.id}
          option={option}
          upsertAction={upsertAction}
          deleteAction={deleteAction}
        />
      ))}
      <NewOptionRow upsertAction={upsertAction} />
    </div>
  );
}

function PricingFields({ defaults }: { defaults?: WideFormatOption }) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Тип расчёта
        <select
          name="pricingMode"
          defaultValue={defaults?.pricingMode ?? ("area" satisfies WideFormatPricingMode)}
          className={inputClass}
        >
          <option value="area">По площади (холсты)</option>
          <option value="perimeter_area">Периметр + площадь (картины)</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        ₸ за м²
        <input
          type="number"
          name="pricePerSqm"
          min={0}
          defaultValue={defaults?.pricePerSqm ?? 0}
          className={`${inputClass} w-24`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        ₸ за пог. метр
        <input
          type="number"
          name="pricePerMeter"
          min={0}
          defaultValue={defaults?.pricePerMeter ?? 0}
          className={`${inputClass} w-24`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Ширина, см (мин–макс)
        <span className="flex items-center gap-1">
          <input
            type="number"
            name="minWidthCm"
            min={1}
            defaultValue={defaults?.minWidthCm ?? 10}
            className={`${inputClass} w-16`}
          />
          —
          <input
            type="number"
            name="maxWidthCm"
            min={1}
            defaultValue={defaults?.maxWidthCm ?? 300}
            className={`${inputClass} w-16`}
          />
        </span>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Высота, см (мин–макс)
        <span className="flex items-center gap-1">
          <input
            type="number"
            name="minHeightCm"
            min={1}
            defaultValue={defaults?.minHeightCm ?? 10}
            className={`${inputClass} w-16`}
          />
          —
          <input
            type="number"
            name="maxHeightCm"
            min={1}
            defaultValue={defaults?.maxHeightCm ?? 300}
            className={`${inputClass} w-16`}
          />
        </span>
      </label>
    </>
  );
}

function OptionRow({
  option,
  upsertAction,
  deleteAction,
}: {
  option: WideFormatOption;
  upsertAction: UpsertFn;
  deleteAction: DeleteFn;
}) {
  const [state, formAction, pending] = useActionState(upsertAction, undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(option.imageUrl ?? null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface-2 p-4"
    >
      <input type="hidden" name="optionId" value={option.id} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <div className="flex flex-col gap-1 text-xs text-text-muted">
        Фото
        <PhotoUploadField
          imageUrl={imageUrl}
          onChange={setImageUrl}
          endpoint="/api/admin/wide-format-media"
          alt={option.name}
        />
      </div>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Название
        <input
          name="name"
          defaultValue={option.name}
          required
          className={`${inputClass} w-48`}
        />
      </label>
      <PricingFields defaults={option} />
      <div className="flex items-center gap-2 pb-0.5">
        <button type="submit" disabled={pending} className={saveButtonClass}>
          {pending ? "…" : "Сохранить"}
        </button>
        <DeleteButton name={option.name} id={option.id} deleteAction={deleteAction} />
      </div>
      {state?.success && <span className="text-xs font-medium text-ok">Сохранено</span>}
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  );
}

function DeleteButton({
  id,
  name,
  deleteAction,
}: {
  id: string;
  name: string;
  deleteAction: DeleteFn;
}) {
  return (
    <form
      action={async () => {
        if (!confirm(`Удалить тип «${name}»?`)) return;
        await deleteAction(id);
      }}
    >
      <button type="submit" className={deleteButtonClass}>
        Удалить
      </button>
    </form>
  );
}

function NewOptionRow({ upsertAction }: { upsertAction: UpsertFn }) {
  const [state, formAction, pending] = useActionState(upsertAction, undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-2xl border-2 border-dashed border-border p-4"
    >
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <div className="flex flex-col gap-1 text-xs text-text-muted">
        Фото
        <PhotoUploadField
          imageUrl={imageUrl}
          onChange={setImageUrl}
          endpoint="/api/admin/wide-format-media"
          alt="Новый тип"
        />
      </div>
      <label className="flex flex-col gap-1 text-xs text-text-muted">
        Название
        <input name="name" required placeholder="Новый тип" className={`${inputClass} w-48`} />
      </label>
      <PricingFields />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-surface px-3 py-2 text-xs font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? "…" : "+ Добавить тип"}
      </button>
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  );
}
