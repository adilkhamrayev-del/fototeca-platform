"use client";

import { useMemo, useRef, useState } from "react";
import type { CatalogItemRecord } from "@/lib/repo/catalog";
import { submitWideFormatOrder } from "@/app/order/[slug]/actions";

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function formatPhoneDisplay(digits: string): string {
  const match = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  if (!match) return `+${digits}`;
  return `+7 ${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
}

// Same rounding rule as the server's computeWideFormatPrice — this is only
// a live preview for the customer, the actual charge is always recomputed
// server-side from the option's own rates at submit time.
function estimatePrice(
  option: CatalogItemRecord["wideFormatOptions"][number],
  widthCm: number,
  heightCm: number,
): number {
  const areaSqm = (widthCm / 100) * (heightCm / 100);
  const perimeterM = (2 * (widthCm + heightCm)) / 100;
  const price =
    option.pricingMode === "perimeter_area"
      ? perimeterM * option.pricePerMeter + areaSqm * option.pricePerSqm
      : areaSqm * option.pricePerSqm;
  return Math.round(price);
}

export default function WideFormatConfigurator({
  item,
  loggedInClient,
}: {
  item: CatalogItemRecord;
  loggedInClient: { name: string; phone: string } | null;
}) {
  const [optionId, setOptionId] = useState(item.wideFormatOptions[0]?.id ?? "");
  const option = useMemo(
    () => item.wideFormatOptions.find((o) => o.id === optionId) ?? item.wideFormatOptions[0],
    [item.wideFormatOptions, optionId],
  );

  const [widthCm, setWidthCm] = useState(option?.minWidthCm ?? 30);
  const [heightCm, setHeightCm] = useState(option?.minHeightCm ?? 30);

  function selectOption(id: string) {
    setOptionId(id);
    const next = item.wideFormatOptions.find((o) => o.id === id);
    if (next) {
      setWidthCm(next.minWidthCm);
      setHeightCm(next.minHeightCm);
    }
  }

  const [clientName, setClientName] = useState(loggedInClient?.name ?? "");
  const [clientPhone, setClientPhone] = useState(loggedInClient?.phone ?? "");

  const [draftId] = useState(randomId);
  const [fileEntry, setFileEntry] = useState<{
    name: string;
    status: "uploading" | "ok" | "bad";
    reason?: string;
    url?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setFileEntry({ name: file.name, status: "uploading" });
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("draftId", draftId);
      const res = await fetch("/api/order/wide-format-file", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setFileEntry({ name: file.name, status: "bad", reason: data.error });
        return;
      }
      setFileEntry({ name: file.name, status: "ok", url: data.url });
    } catch {
      setFileEntry({
        name: file.name,
        status: "bad",
        reason: "Не удалось загрузить — проверьте соединение",
      });
    }
  }

  if (!option) {
    return (
      <main className="mx-auto flex max-w-2xl flex-1 flex-col items-center gap-3 px-6 pt-24 text-center">
        <h1 className="font-heading text-xl font-bold">Товар временно недоступен</h1>
        <p className="text-sm text-text-muted">Типы печати ещё не настроены в админке.</p>
      </main>
    );
  }

  const widthValid = widthCm >= option.minWidthCm && widthCm <= option.maxWidthCm;
  const heightValid = heightCm >= option.minHeightCm && heightCm <= option.maxHeightCm;
  const total = widthValid && heightValid ? estimatePrice(option, widthCm, heightCm) : 0;

  const canSubmit =
    widthValid &&
    heightValid &&
    fileEntry?.status !== "uploading" &&
    clientName.trim().length > 0 &&
    clientPhone.replace(/\D/g, "").length >= 10 &&
    !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitWideFormatOrder({
      clientName,
      clientPhone,
      catalogItemId: item.id,
      wideFormatOptionId: option.id,
      widthCm,
      heightCm,
      printFileUrl: fileEntry?.status === "ok" ? (fileEntry.url ?? null) : null,
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
          {option.name}, {widthCm}×{heightCm} см — заказ сохранён. Мы свяжемся с вами по телефону{" "}
          {clientPhone} для подтверждения и оплаты.
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
          {item.title} «{option.name}»
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Укажите размеры в сантиметрах — мы сразу посчитаем стоимость
        </p>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-6 pt-8 lg:grid-cols-[370px_1fr] lg:px-14">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-bold">Ваши данные</h3>
            {loggedInClient ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3.5 py-2.5 text-[13px]">
                <div>
                  <p className="font-semibold">{loggedInClient.name}</p>
                  <p className="text-text-muted">{formatPhoneDisplay(loggedInClient.phone)}</p>
                </div>
                <a href="/account/login" className="shrink-0 text-xs font-semibold text-accent-ink underline">
                  Не вы?
                </a>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {item.wideFormatOptions.length > 1 && (
            <div className="rounded-3xl border border-border bg-surface p-6">
              <h3 className="mb-3 text-sm font-bold">Тип</h3>
              <div className="grid grid-cols-2 gap-2">
                {item.wideFormatOptions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOption(o.id)}
                    className={`flex flex-col items-center gap-1.5 overflow-hidden rounded-xl border-2 p-1.5 transition ${
                      o.id === option.id
                        ? "border-accent shadow-[0_0_0_3px_var(--color-accent-soft)]"
                        : "border-transparent bg-surface-2"
                    }`}
                  >
                    {o.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.imageUrl}
                        alt={o.name}
                        className="h-16 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-16 w-full items-center justify-center rounded-lg bg-surface text-[10px] text-text-muted">
                        Нет фото
                      </span>
                    )}
                    <span
                      className={`text-xs font-semibold ${
                        o.id === option.id ? "text-accent-ink" : "text-text-muted"
                      }`}
                    >
                      {o.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-bold">Размеры</h3>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Ширина, см ({option.minWidthCm}–{option.maxWidthCm})
              <input
                type="number"
                value={widthCm}
                min={option.minWidthCm}
                max={option.maxWidthCm}
                onChange={(e) => setWidthCm(Number(e.target.value))}
                className={`rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent ${
                  widthValid ? "border-border" : "border-red-300"
                }`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium">
              Высота, см ({option.minHeightCm}–{option.maxHeightCm})
              <input
                type="number"
                value={heightCm}
                min={option.minHeightCm}
                max={option.maxHeightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className={`rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent ${
                  heightValid ? "border-border" : "border-red-300"
                }`}
              />
            </label>
            {(!widthValid || !heightValid) && (
              <p className="text-[12.5px] font-medium text-red-600">
                Проверьте размеры — допустимо {option.minWidthCm}–{option.maxWidthCm} ×{" "}
                {option.minHeightCm}–{option.maxHeightCm} см
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5 rounded-3xl border border-border bg-surface p-6">
            <h3 className="text-sm font-bold">Файл для печати</h3>
            <p className="text-xs text-text-muted">
              Загрузите готовый макет — любой формат (JPG, PDF, TIFF, PSD). Можно оформить заказ и
              прислать файл позже.
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files);
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                dragOver ? "border-accent bg-accent-soft" : "border-border"
              }`}
            >
              <p className="text-xs text-text-muted">Перетащите файл сюда</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-muted"
              >
                {fileEntry ? "Заменить файл" : "Выбрать файл"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files);
                e.target.value = "";
              }}
            />
            {fileEntry && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5 text-xs">
                <span className="truncate">{fileEntry.name}</span>
                {fileEntry.status === "uploading" && <span className="text-text-muted">Загрузка…</span>}
                {fileEntry.status === "ok" && <span className="font-semibold text-ok">✓</span>}
                {fileEntry.status === "bad" && (
                  <span className="font-semibold text-red-600" title={fileEntry.reason}>
                    ✕ {fileEntry.reason ?? "ошибка"}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-accent-soft p-6">
            <h3 className="text-sm font-bold text-accent-ink">Как считается цена</h3>
            <p className="mt-1.5 text-xs text-accent-ink/80">
              {option.pricingMode === "perimeter_area"
                ? `Периметр × ${formatPrice(option.pricePerMeter)} ₸/пог.м + площадь × ${formatPrice(option.pricePerSqm)} ₸/м²`
                : `Площадь × ${formatPrice(option.pricePerSqm)} ₸/м²`}
            </p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 mt-7 border-t border-border bg-surface px-6 py-5 lg:px-14">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-text-muted">Итого (ориентировочно)</span>
            <div className="font-heading text-2xl font-bold">{formatPrice(total)} ₸</div>
            <span className="text-[11.5px] text-text-muted">
              {widthCm}×{heightCm} см, «{option.name}» — точная цена подтверждается при обработке заказа
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
    </main>
  );
}
