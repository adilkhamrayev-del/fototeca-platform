"use client";

import { useMemo, useRef, useState } from "react";
import type { CatalogItemRecord } from "@/lib/repo/catalog";
import type { CoverMaterialVariant } from "@/lib/repo/cover-variants";
import { submitOrder } from "@/app/order/[slug]/actions";

type FileStatus = "checking" | "ok" | "bad";

type UploadEntry = {
  id: string;
  name: string;
  previewUrl: string;
  status: FileStatus;
  reason?: string;
  width?: number;
  height?: number;
};

const PACKAGING_PRICE = 1500;
const EXPRESS_SURCHARGE_PER_SPREAD = 150;

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function OrderConfigurator({
  item,
  coverMaterialVariants,
}: {
  item: CatalogItemRecord;
  coverMaterialVariants: CoverMaterialVariant[];
}) {
  const [formatId, setFormatId] = useState(item.formats[0].id);
  const format = useMemo(
    () => item.formats.find((f) => f.id === formatId) ?? item.formats[0],
    [item.formats, formatId],
  );

  const [coverOptionId, setCoverOptionId] = useState(format.coverOptions[0].id);
  const coverOption =
    format.coverOptions.find((c) => c.id === coverOptionId) ?? format.coverOptions[0];

  // Material variant selection — only relevant for cover options with
  // variantKind !== "none" (see CoverVariantKind in src/lib/content.ts).
  // Used the same way for "tkanevaya"/"ekokozha" (a plain pick) and for
  // "kombi" (one fabric-OR-eco-leather sub-variant — Комби combines that
  // with the customer's own uploaded photo, see coverComboPhotoUrl below).
  // Switching to a different cover option clears all of this — see
  // selectCoverOption below.
  const [coverVariantId, setCoverVariantId] = useState<string | null>(null);
  // Only meaningful for variantKind "kombi" — the customer's own photo for
  // the other half of the cover, uploaded via CoverVariantModal.
  const [coverComboPhotoUrl, setCoverComboPhotoUrl] = useState<string | null>(null);
  const [variantModalOptionId, setVariantModalOptionId] = useState<string | null>(null);

  const tkanevayaVariants = useMemo(
    () => coverMaterialVariants.filter((v) => v.material === "tkanevaya"),
    [coverMaterialVariants],
  );
  const ekokozhaVariants = useMemo(
    () => coverMaterialVariants.filter((v) => v.material === "ekokozha"),
    [coverMaterialVariants],
  );
  const allMaterialVariants = useMemo(
    () => [...tkanevayaVariants, ...ekokozhaVariants],
    [tkanevayaVariants, ekokozhaVariants],
  );

  function selectCoverOption(option: CatalogItemRecord["formats"][number]["coverOptions"][number]) {
    setCoverOptionId(option.id);
    if (option.variantKind === "none") {
      setCoverVariantId(null);
      setCoverComboPhotoUrl(null);
      return;
    }
    if (option.id !== coverOptionId) {
      setCoverVariantId(null);
      setCoverComboPhotoUrl(null);
    }
    setVariantModalOptionId(option.id);
  }

  function coverVariantLabel(): string | null {
    if (coverOption.variantKind === "none") return null;
    const variant = allMaterialVariants.find((v) => v.id === coverVariantId);
    if (coverOption.variantKind === "kombi") {
      const materialLabel = variant?.material === "tkanevaya" ? "ткань" : "экокожа";
      const parts = [
        variant ? `${materialLabel}: ${variant.name}` : null,
        coverComboPhotoUrl ? "своё фото" : null,
      ].filter(Boolean);
      return parts.length ? parts.join(" + ") : null;
    }
    return variant?.name ?? null;
  }

  // For a plain tkanevaya/ekokozha cover, only require a pick if that
  // material actually has swatches configured yet (site launched before
  // any were added shouldn't block checkout). Комби always needs a photo —
  // that's what makes it "combi" — but the material sub-variant is only
  // required if either material list has swatches.
  const variantRequired =
    coverOption.variantKind === "kombi"
      ? true
      : coverOption.variantKind !== "none" &&
        (coverOption.variantKind === "tkanevaya" ? tkanevayaVariants : ekokozhaVariants).length >
          0;
  const variantSatisfied =
    coverOption.variantKind === "none" ||
    (coverOption.variantKind === "kombi"
      ? Boolean(coverComboPhotoUrl) &&
        (allMaterialVariants.length === 0 || Boolean(coverVariantId))
      : !variantRequired || Boolean(coverVariantId));

  const [spreads, setSpreads] = useState(format.minSpreads);
  const [endpapers, setEndpapers] = useState(true);
  const [packaging, setPackaging] = useState(false);
  const [express, setExpress] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [files, setFiles] = useState<UploadEntry[]>([]);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [draftId] = useState(randomId);
  const nextIndex = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function selectFormat(id: string) {
    setFormatId(id);
    const nextFormat = item.formats.find((f) => f.id === id);
    if (nextFormat) {
      setSpreads(nextFormat.minSpreads);
      setCoverOptionId(nextFormat.coverOptions[0].id);
      setCoverVariantId(null);
      setCoverComboPhotoUrl(null);
      setVariantModalOptionId(null);
    }
  }

  function updateEntry(id: string, patch: Partial<UploadEntry>) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    for (const file of Array.from(fileList)) {
      const id = randomId();
      const previewUrl = URL.createObjectURL(file);
      const index = nextIndex.current++;

      setFiles((prev) => [...prev, { id, name: file.name, previewUrl, status: "checking" }]);

      if (file.type !== "image/jpeg") {
        updateEntry(id, { status: "bad", reason: "Нужен JPG-файл" });
        continue;
      }

      // Client-side pre-check — instant feedback while the server call is
      // in flight. The server response below is what actually counts.
      const dims = await readImageDimensions(previewUrl).catch(() => null);
      if (dims && (dims.width !== format.widthPx || dims.height !== format.heightPx)) {
        updateEntry(id, {
          status: "bad",
          reason: `${dims.width}×${dims.height} px, нужно ${format.widthPx}×${format.heightPx} px`,
          width: dims.width,
          height: dims.height,
        });
        // Still send to the server below — a client-side canvas read can be
        // wrong for some color profiles, so let the server have the final say.
      }

      const body = new FormData();
      body.set("file", file);
      body.set("itemSlug", item.slug);
      body.set("formatId", format.id);
      body.set("draftId", draftId);
      body.set("index", String(index));

      try {
        const res = await fetch("/api/upload", { method: "POST", body });
        const result = await res.json();
        if (result.valid) {
          updateEntry(id, {
            status: "ok",
            reason: undefined,
            width: result.width,
            height: result.height,
          });
        } else {
          updateEntry(id, { status: "bad", reason: result.reason ?? "Файл не подошёл" });
        }
      } catch {
        updateEntry(id, {
          status: "bad",
          reason: "Не удалось проверить файл на сервере — проверьте соединение",
        });
      }
    }
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  const validCount = files.filter((f) => f.status === "ok").length;
  const checkingCount = files.filter((f) => f.status === "checking").length;
  const progress = Math.min(100, Math.round((validCount / spreads) * 100));

  const total =
    spreads * format.pricePerSpread +
    coverOption.priceModifier +
    (packaging ? PACKAGING_PRICE : 0) +
    (express ? spreads * EXPRESS_SURCHARGE_PER_SPREAD : 0);

  const canSubmit =
    validCount >= spreads &&
    checkingCount === 0 &&
    clientName.trim().length > 0 &&
    clientPhone.replace(/\D/g, "").length >= 10 &&
    variantSatisfied &&
    !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitOrder({
      clientName,
      clientPhone,
      catalogItemId: item.id,
      catalogFormatId: format.id,
      coverOptionId: coverOption.id,
      coverVariantId,
      coverComboPhotoUrl,
      spreads,
      endpapers,
      packaging,
      express,
      price: total,
      uploadDraftId: draftId,
    });
    setSubmitting(false);
    if ("error" in result) {
      setSubmitError(result.error);
      return;
    }
    setOrderNumber(result.orderNumber);
  }

  if (orderNumber) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center gap-4 px-6 pt-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold">Заказ №{orderNumber} оформлен</h1>
        <p className="max-w-md text-sm text-text-muted">
          {item.title}, {format.name}, обложка «{coverOption.name}»
          {coverVariantLabel() ? ` (${coverVariantLabel()})` : ""}, {spreads} разворотов —
          заказ сохранён, файлы приняты. Мы свяжемся с вами по телефону {clientPhone} для
          подтверждения и оплаты.
        </p>
      </main>
    );
  }

  return (
    <main className="flex-1 pb-16">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8 lg:px-14">
        <span className="inline-flex items-center rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink">
          Шаг 2 из 3
        </span>
      </div>

      <div className="mx-auto max-w-6xl px-6 pt-4 lg:px-14">
        <h1 className="font-heading text-3xl font-bold">
          {item.title} «{coverOption.name}», {format.name}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Загрузите развороты — мы сразу подскажем, если что-то не так с файлом
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pt-8 lg:grid-cols-[370px_1fr] lg:px-14">
        {/* Config column */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-bold">Ваши данные</h3>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Имя
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Как к вам обращаться"
                className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Телефон
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+7 700 000 00 00"
                className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>

          {item.formats.length > 1 && (
            <div className="rounded-3xl border border-border bg-surface p-6">
              <h3 className="mb-3 text-sm font-bold">Формат</h3>
              <div className="flex flex-wrap gap-2">
                {item.formats.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => selectFormat(f.id)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      f.id === format.id
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-border text-text-muted"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-bold">Тип обложки</h3>
            <p className="mb-3 mt-1 text-xs text-text-muted">
              Хит2, тканевая и экокожа — варианты одного уровня, выбирается один
            </p>
            <div className="grid grid-cols-4 gap-2">
              {format.coverOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectCoverOption(option)}
                  className={`overflow-hidden rounded-xl border-2 ${
                    option.id === coverOptionId ? "border-accent" : "border-transparent"
                  }`}
                  aria-label={option.name}
                >
                  {option.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={option.imageUrl}
                      alt={option.name}
                      className="block h-11 w-full object-cover"
                    />
                  ) : (
                    <span
                      className="block h-11 w-full"
                      style={{
                        background: `linear-gradient(160deg, ${option.gradient[0]}, ${option.gradient[1]})`,
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {format.coverOptions.map((option) => (
                <span
                  key={option.id}
                  className={`text-center text-[10.5px] ${
                    option.id === coverOptionId
                      ? "font-semibold text-accent-ink"
                      : "text-text-muted"
                  }`}
                >
                  {option.name}
                </span>
              ))}
            </div>
            <p className="mt-3.5 text-xs text-text-muted">
              Выбран тип обложки: <b className="text-text">{coverOption.name}</b>
              {coverVariantLabel() && <> — {coverVariantLabel()}</>}
            </p>
            {coverOption.variantKind !== "none" && variantRequired && (
              <button
                type="button"
                onClick={() => setVariantModalOptionId(coverOption.id)}
                className="mt-2 text-xs font-semibold text-accent-ink underline"
              >
                {variantSatisfied ? "Изменить вариант" : "Выбрать вариант"}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-3xl border border-border bg-surface p-6">
            <span className="text-sm font-bold">Разворотов</span>
            <div className="flex items-center gap-3.5">
              <button
                type="button"
                onClick={() => setSpreads((s) => Math.max(format.minSpreads, s - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border font-bold"
              >
                −
              </button>
              <span className="text-base font-bold">{spreads}</span>
              <button
                type="button"
                onClick={() => setSpreads((s) => Math.min(format.maxSpreads, s + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-bold text-accent-ink"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 rounded-3xl border border-border bg-surface p-6">
            <label className="flex items-center gap-2.5 text-[13px] font-medium">
              <input
                type="checkbox"
                checked={endpapers}
                onChange={(e) => setEndpapers(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Форзацы под цвет обложки
            </label>
            <label className="flex items-center gap-2.5 text-[13px] font-medium text-text-muted">
              <input
                type="checkbox"
                checked={packaging}
                onChange={(e) => setPackaging(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Подарочная упаковка (+{formatPrice(PACKAGING_PRICE)} ₸)
            </label>
            <label className="flex items-center gap-2.5 text-[13px] font-medium text-text-muted">
              <input
                type="checkbox"
                checked={express}
                onChange={(e) => setExpress(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              Экспресс-печать (+2 дня → 1 день)
            </label>
          </div>
        </div>

        {/* Upload column */}
        <div className="flex flex-col gap-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-accent bg-accent-soft" : "border-accent/60 bg-accent-soft/60"
            }`}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4M12 4l-4 4M12 4l4 4"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="font-heading text-lg font-bold">Перетащите файлы сюда</h3>
            <p className="max-w-sm text-[13px] text-text-muted">
              JPG, sRGB, {format.widthPx}×{format.heightPx} px, имена 01, 02, 03…
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white"
            >
              Выбрать файлы
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-3">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className={`overflow-hidden rounded-2xl border ${
                      f.status === "bad" ? "border-transparent bg-red-50" : "border-border bg-surface"
                    }`}
                  >
                    <div className="relative h-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={f.previewUrl}
                        alt={f.name}
                        className={`h-full w-full object-cover ${f.status === "bad" ? "opacity-55" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[11px] text-white"
                        aria-label="Удалить"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-2.5">
                      {f.status === "checking" && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                          Проверка…
                        </span>
                      )}
                      {f.status === "ok" && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok">
                          ✓ {f.width}×{f.height}
                        </span>
                      )}
                      {f.status === "bad" && (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600"
                          title={f.reason}
                        >
                          ✕ {f.reason ?? "ошибка"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full bg-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-text-muted">
                {validCount} из {spreads} загружено
                {files.some((f) => f.status === "bad") &&
                  ` · ${files.filter((f) => f.status === "bad").length} файл(ов) нужно исправить`}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 mt-7 border-t border-border bg-surface px-6 py-5 lg:px-14">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-text-muted">Итого</span>
            <div className="font-heading text-2xl font-bold">{formatPrice(total)} ₸</div>
            <span className="text-[11.5px] text-text-muted">
              {spreads} разворотов × {formatPrice(format.pricePerSpread)} ₸ + обложка «
              {coverOption.name}»
              {endpapers ? " + форзацы" : ""}
            </span>
            {submitError && (
              <p className="mt-1.5 text-[12.5px] font-medium text-red-600">{submitError}</p>
            )}
          </div>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="shrink-0 rounded-xl bg-accent px-7 py-3.5 text-sm font-semibold text-white disabled:opacity-45"
          >
            {submitting ? "Сохраняем…" : "Оформить заказ"}
          </button>
        </div>
      </div>

      {variantModalOptionId && (
        <CoverVariantModal
          option={
            format.coverOptions.find((o) => o.id === variantModalOptionId) ?? coverOption
          }
          tkanevayaVariants={tkanevayaVariants}
          ekokozhaVariants={ekokozhaVariants}
          coverVariantId={coverVariantId}
          coverComboPhotoUrl={coverComboPhotoUrl}
          onDone={(variantId, comboPhotoUrl) => {
            setCoverVariantId(variantId);
            setCoverComboPhotoUrl(comboPhotoUrl);
            setVariantModalOptionId(null);
          }}
          onClose={() => setVariantModalOptionId(null)}
        />
      )}
    </main>
  );
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

const MATERIAL_LABELS: Record<"tkanevaya" | "ekokozha", string> = {
  tkanevaya: "Ткань",
  ekokozha: "Экокожа",
};

// Popup shown when the customer picks a cover option with a variantKind
// other than "none" — a single material grid for "tkanevaya"/"ekokozha",
// or two grids (pick one of each) for "kombi". Swatches come from
// coverMaterialVariants, the site-wide list managed at
// /admin/cover-materials — the same list is reused across every catalog
// item/format, so it's passed down from the order page rather than being
// per-format data.
function CoverVariantModal({
  option,
  tkanevayaVariants,
  ekokozhaVariants,
  coverVariantId,
  coverComboPhotoUrl,
  onDone,
  onClose,
}: {
  option: CatalogItemRecord["formats"][number]["coverOptions"][number];
  tkanevayaVariants: CoverMaterialVariant[];
  ekokozhaVariants: CoverMaterialVariant[];
  coverVariantId: string | null;
  coverComboPhotoUrl: string | null;
  onDone: (variantId: string | null, comboPhotoUrl: string | null) => void;
  onClose: () => void;
}) {
  const isKombi = option.variantKind === "kombi";
  const singleMaterial = option.variantKind === "tkanevaya" ? "tkanevaya" : "ekokozha";
  const singleVariants = singleMaterial === "tkanevaya" ? tkanevayaVariants : ekokozhaVariants;

  // Комби: first pick which material forms the "other half" of the cover
  // — either fabric or eco-leather, never both — then a specific swatch
  // from that material's list, plus the customer's own uploaded photo.
  const initialKombiMaterial: "tkanevaya" | "ekokozha" | null = tkanevayaVariants.some(
    (v) => v.id === coverVariantId,
  )
    ? "tkanevaya"
    : ekokozhaVariants.some((v) => v.id === coverVariantId)
      ? "ekokozha"
      : tkanevayaVariants.length > 0
        ? "tkanevaya"
        : ekokozhaVariants.length > 0
          ? "ekokozha"
          : null;
  const [kombiMaterial, setKombiMaterial] = useState(initialKombiMaterial);
  const [kombiVariantId, setKombiVariantId] = useState(isKombi ? coverVariantId : null);
  const [comboPhotoUrl, setComboPhotoUrl] = useState(coverComboPhotoUrl);

  const kombiVariants = kombiMaterial === "tkanevaya" ? tkanevayaVariants : ekokozhaVariants;
  const kombiVariantOk = kombiVariants.length === 0 || Boolean(kombiVariantId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-3xl bg-white p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-heading text-lg font-bold">
            Обложка «{option.name}» — выберите вариант
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold"
          >
            ×
          </button>
        </div>

        {isKombi ? (
          <>
            <p className="text-xs text-text-muted">
              Часть обложки «Комби» — ваше фото, остальное — ткань или экокожа на выбор.
            </p>

            {tkanevayaVariants.length > 0 && ekokozhaVariants.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                  Материал
                </p>
                <div className="flex gap-2">
                  {(["tkanevaya", "ekokozha"] as const).map((material) => (
                    <button
                      key={material}
                      type="button"
                      onClick={() => {
                        setKombiMaterial(material);
                        setKombiVariantId(null);
                      }}
                      className={`rounded-lg border px-3.5 py-2 text-xs font-semibold ${
                        kombiMaterial === material
                          ? "border-accent bg-accent-soft text-accent-ink"
                          : "border-border text-text-muted"
                      }`}
                    >
                      {MATERIAL_LABELS[material]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {kombiMaterial && kombiVariants.length > 0 && (
              <VariantGrid
                label={MATERIAL_LABELS[kombiMaterial]}
                variants={kombiVariants}
                selectedId={kombiVariantId}
                onSelect={setKombiVariantId}
              />
            )}
            {tkanevayaVariants.length === 0 && ekokozhaVariants.length === 0 && (
              <p className="text-xs text-text-muted">
                Варианты ткани и экокожи ещё не добавлены в админке — можно продолжить с одним
                фото.
              </p>
            )}

            <ComboPhotoUpload photoUrl={comboPhotoUrl} onChange={setComboPhotoUrl} />

            <button
              type="button"
              disabled={!kombiVariantOk || !comboPhotoUrl}
              onClick={() => onDone(kombiVariantId, comboPhotoUrl)}
              className="mt-1 self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-45"
            >
              Готово
            </button>
          </>
        ) : singleVariants.length > 0 ? (
          <VariantGrid
            label={MATERIAL_LABELS[singleMaterial]}
            variants={singleVariants}
            selectedId={coverVariantId}
            onSelect={(variantId) => onDone(variantId, null)}
          />
        ) : (
          <p className="text-xs text-text-muted">Варианты ещё не добавлены в админке.</p>
        )}
      </div>
    </div>
  );
}

function ComboPhotoUpload({
  photoUrl,
  onChange,
}: {
  photoUrl: string | null;
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
      const res = await fetch("/api/order/combo-cover-photo", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Не удалось загрузить фото.");
        return;
      }
      onChange(data.url);
    } catch {
      setUploadError("Не удалось загрузить фото — проверьте соединение.");
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
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
        Ваше фото для комби
      </p>
      {photoUrl ? (
        <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Ваше фото для комби" className="h-full w-full object-cover" />
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
          className="rounded-xl border-2 border-dashed border-border px-4 py-2.5 text-xs font-semibold text-text-muted disabled:opacity-50"
        >
          {uploading ? "Загрузка…" : "Загрузить фото"}
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
      {uploadError && (
        <p className="mt-1.5 text-[11px] font-medium text-red-600">{uploadError}</p>
      )}
    </div>
  );
}

function VariantGrid({
  label,
  variants,
  selectedId,
  onSelect,
}: {
  label: string;
  variants: CoverMaterialVariant[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">{label}</p>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelect(variant.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 ${
              variant.id === selectedId ? "border-accent" : "border-transparent"
            }`}
          >
            <div className="h-14 w-full overflow-hidden rounded-lg bg-surface-2">
              {variant.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={variant.imageUrl}
                  alt={variant.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-text-muted">
                  Нет фото
                </div>
              )}
            </div>
            <span
              className={`text-center text-[10.5px] leading-tight ${
                variant.id === selectedId ? "font-semibold text-accent-ink" : "text-text-muted"
              }`}
            >
              {variant.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
