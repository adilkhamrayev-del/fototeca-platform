"use client";

import { useActionState, useState, useTransition } from "react";
import type { CatalogFormat, CoverOption, CoverVariantKind } from "@/lib/content";
import PhotoUploadField from "./PhotoUploadField";

const VARIANT_KIND_LABELS: Record<CoverVariantKind, string> = {
  none: "Без вариантов",
  tkanevaya: "Попап: варианты ткани",
  ekokozha: "Попап: варианты экокожи",
  kombi: "Попап: комби (ткань или экокожа + фото клиента)",
};

type RowState = { error?: string; success?: true } | undefined;
type UpsertFormatFn = (state: RowState, formData: FormData) => Promise<RowState>;
type UpsertCoverFn = (state: RowState, formData: FormData) => Promise<RowState>;
type DeleteFn = (id: string) => Promise<{ error?: string }>;

const inputClass =
  "w-full rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-accent";

// Same size/weight as the format's own "Сохранить формат" button below —
// every row-level Save/Delete pair in the admin (cover options here, cover-
// material and box-material variants in their own editors) uses these two
// so the whole catalog editor reads as one consistent set of controls
// instead of the small text-link "Удалить" it used to be next to a
// smaller outlined "Сохранить".
const saveButtonClass =
  "rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50";
const deleteButtonClass =
  "rounded-lg border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 disabled:opacity-50";

function computePx(widthMm: string, heightMm: string, dpi: string): string {
  const w = Number(widthMm);
  const h = Number(heightMm);
  const d = Number(dpi);
  if (!w || !h || !d) return "";
  const wPx = Math.round((w / 25.4) * d);
  const hPx = Math.round((h / 25.4) * d);
  return `${wPx}×${hPx} px`;
}

export default function CatalogFormatsEditor({
  formats,
  upsertFormatAction,
  deleteFormatAction,
  upsertCoverAction,
  deleteCoverAction,
}: {
  formats: CatalogFormat[];
  upsertFormatAction: UpsertFormatFn;
  deleteFormatAction: DeleteFn;
  upsertCoverAction: (formatId: string, state: RowState, formData: FormData) => Promise<RowState>;
  deleteCoverAction: DeleteFn;
}) {
  return (
    <div className="flex flex-col gap-5">
      {formats.map((format) => (
        <FormatCard
          key={format.id}
          format={format}
          upsertFormatAction={upsertFormatAction}
          deleteFormatAction={deleteFormatAction}
          upsertCoverAction={upsertCoverAction}
          deleteCoverAction={deleteCoverAction}
        />
      ))}
      <NewFormatCard upsertFormatAction={upsertFormatAction} />
    </div>
  );
}

function FormatCard({
  format,
  upsertFormatAction,
  deleteFormatAction,
  upsertCoverAction,
  deleteCoverAction,
}: {
  format: CatalogFormat;
  upsertFormatAction: UpsertFormatFn;
  deleteFormatAction: DeleteFn;
  upsertCoverAction: (formatId: string, state: RowState, formData: FormData) => Promise<RowState>;
  deleteCoverAction: DeleteFn;
}) {
  const [state, formAction, pending] = useActionState(upsertFormatAction, undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [widthMm, setWidthMm] = useState(String(format.widthMm));
  const [heightMm, setHeightMm] = useState(String(format.heightMm));
  const [dpi, setDpi] = useState(String(format.dpi));

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-4">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="formatId" value={format.id} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Название">
            <input name="name" defaultValue={format.name} required className={inputClass} />
          </Field>
          <Field label="Ширина, мм">
            <input
              type="number"
              step="0.1"
              name="widthMm"
              value={widthMm}
              onChange={(e) => setWidthMm(e.target.value)}
              min={1}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Высота, мм">
            <input
              type="number"
              step="0.1"
              name="heightMm"
              value={heightMm}
              onChange={(e) => setHeightMm(e.target.value)}
              min={1}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Разрешение, dpi">
            <input
              type="number"
              name="dpi"
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              min={1}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Цена за разворот, ₸">
            <input
              type="number"
              name="pricePerSpread"
              defaultValue={format.pricePerSpread}
              min={0}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Мин. разворотов">
            <input
              type="number"
              name="minSpreads"
              defaultValue={format.minSpreads}
              min={1}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Макс. разворотов">
            <input
              type="number"
              name="maxSpreads"
              defaultValue={format.maxSpreads}
              min={1}
              required
              className={inputClass}
            />
          </Field>
        </div>
        <p className="text-xs text-text-muted">
          В пикселях получится: {computePx(widthMm, heightMm, dpi) || "—"}
        </p>

        {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={saveButtonClass}>
            {pending ? "Сохранение…" : "Сохранить формат"}
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (!confirm(`Удалить формат «${format.name}»?`)) return;
              setDeleteError(null);
              startDelete(async () => {
                const result = await deleteFormatAction(format.id);
                if (result.error) setDeleteError(result.error);
              });
            }}
            className={deleteButtonClass}
          >
            {deleting ? "Удаление…" : "Удалить формат"}
          </button>
          {state?.success && <span className="text-xs font-medium text-ok">Сохранено</span>}
        </div>
        {deleteError && <p className="text-xs font-medium text-red-600">{deleteError}</p>}
      </form>

      <div className="mt-4 border-t border-border pt-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
          Обложки этого формата
        </p>
        <div className="flex flex-col gap-2">
          {format.coverOptions.map((cover) => (
            <CoverRow
              key={cover.id}
              cover={cover}
              formatId={format.id}
              upsertCoverAction={upsertCoverAction}
              deleteCoverAction={deleteCoverAction}
            />
          ))}
          <NewCoverRow formatId={format.id} upsertCoverAction={upsertCoverAction} />
        </div>
      </div>
    </div>
  );
}

function CoverRow({
  cover,
  formatId,
  upsertCoverAction,
  deleteCoverAction,
}: {
  cover: CoverOption;
  formatId: string;
  upsertCoverAction: (formatId: string, state: RowState, formData: FormData) => Promise<RowState>;
  deleteCoverAction: DeleteFn;
}) {
  const boundAction = upsertCoverAction.bind(null, formatId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(cover.imageUrl ?? null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="coverId" value={cover.id} />
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <PhotoUploadField imageUrl={imageUrl} onChange={setImageUrl} endpoint="/api/admin/cover-media" alt="Фото обложки" />
      <input
        name="name"
        defaultValue={cover.name}
        required
        className={`${inputClass} w-40`}
        placeholder="Название"
      />
      <input
        type="number"
        name="priceModifier"
        defaultValue={cover.priceModifier}
        min={0}
        required
        className={`${inputClass} w-32`}
        placeholder="Наценка, ₸"
      />
      <select name="variantKind" defaultValue={cover.variantKind} className={`${inputClass} w-52`}>
        {Object.entries(VARIANT_KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={saveButtonClass}>
        {pending ? "…" : "Сохранить"}
      </button>
      <button
        type="button"
        disabled={deleting}
        onClick={() => {
          if (!confirm(`Удалить обложку «${cover.name}»?`)) return;
          setDeleteError(null);
          startDelete(async () => {
            const result = await deleteCoverAction(cover.id);
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

function NewCoverRow({
  formatId,
  upsertCoverAction,
}: {
  formatId: string;
  upsertCoverAction: (formatId: string, state: RowState, formData: FormData) => Promise<RowState>;
}) {
  const boundAction = upsertCoverAction.bind(null, formatId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 pt-1">
      <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
      <PhotoUploadField imageUrl={imageUrl} onChange={setImageUrl} endpoint="/api/admin/cover-media" alt="Фото обложки" />
      <input name="name" required placeholder="Новая обложка" className={`${inputClass} w-40`} />
      <input
        type="number"
        name="priceModifier"
        min={0}
        defaultValue={0}
        placeholder="Наценка, ₸"
        className={`${inputClass} w-32`}
      />
      <select name="variantKind" defaultValue="none" className={`${inputClass} w-52`}>
        {Object.entries(VARIANT_KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-accent-ink disabled:opacity-50"
      >
        {pending ? "…" : "+ Добавить обложку"}
      </button>
      {state?.error && <span className="text-xs font-medium text-red-600">{state.error}</span>}
    </form>
  );
}

function NewFormatCard({ upsertFormatAction }: { upsertFormatAction: UpsertFormatFn }) {
  const [state, formAction, pending] = useActionState(upsertFormatAction, undefined);
  const [widthMm, setWidthMm] = useState("");
  const [heightMm, setHeightMm] = useState("");
  const [dpi, setDpi] = useState("300");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-border p-4"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Новый формат</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Название">
          <input name="name" required placeholder="35×35 см" className={inputClass} />
        </Field>
        <Field label="Ширина, мм">
          <input
            type="number"
            step="0.1"
            name="widthMm"
            value={widthMm}
            onChange={(e) => setWidthMm(e.target.value)}
            min={1}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Высота, мм">
          <input
            type="number"
            step="0.1"
            name="heightMm"
            value={heightMm}
            onChange={(e) => setHeightMm(e.target.value)}
            min={1}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Разрешение, dpi">
          <input
            type="number"
            name="dpi"
            value={dpi}
            onChange={(e) => setDpi(e.target.value)}
            min={1}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Цена за разворот, ₸">
          <input type="number" name="pricePerSpread" min={0} required className={inputClass} />
        </Field>
        <Field label="Мин. разворотов">
          <input type="number" name="minSpreads" min={1} defaultValue={1} required className={inputClass} />
        </Field>
        <Field label="Макс. разворотов">
          <input type="number" name="maxSpreads" min={1} defaultValue={60} required className={inputClass} />
        </Field>
      </div>
      <p className="text-xs text-text-muted">
        В пикселях получится: {computePx(widthMm, heightMm, dpi) || "—"}
      </p>
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Добавление…" : "+ Добавить формат"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
      {label}
      {children}
    </label>
  );
}
