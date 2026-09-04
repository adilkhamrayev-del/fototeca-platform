"use client";

import { useActionState, useRef, useState } from "react";
import { saveBanner } from "./actions";
import type { BannerRecord } from "@/lib/repo/banner";

export default function BannerForm({ banner }: { banner: BannerRecord | null }) {
  const [state, formAction, pending] = useActionState(saveBanner, undefined);
  const [mediaUrl, setMediaUrl] = useState<string | null>(banner?.mediaUrl ?? null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(banner?.mediaType ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/banner-media", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "Не удалось загрузить файл.");
        return;
      }
      setMediaUrl(data.url);
      setMediaType(data.mediaType);
    } catch {
      setUploadError("Не удалось загрузить файл — проверьте соединение и попробуйте ещё раз.");
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
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {banner?.id && <input type="hidden" name="id" value={banner.id} />}
      <input type="hidden" name="mediaUrl" value={mediaUrl ?? ""} />
      <input type="hidden" name="mediaType" value={mediaType ?? ""} />

      <Field label="Метка (тег)" name="tag" defaultValue={banner?.tag} placeholder="Осенняя акция" />
      <Field label="Заголовок" name="title" defaultValue={banner?.title} required />
      <Field
        label="Описание"
        name="description"
        defaultValue={banner?.description}
        textarea
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Текст основной кнопки" name="primaryCta" defaultValue={banner?.primaryCta} />
        <Field
          label="Текст второй кнопки"
          name="secondaryCta"
          defaultValue={banner?.secondaryCta}
        />
      </div>

      <div className="flex flex-col gap-2 text-sm font-medium">
        Фото или короткое видео
        <p className="font-normal text-text-muted">
          JPG, PNG, WEBP, GIF (до 8 МБ) или MP4, WEBM, MOV (до 40 МБ, короткий ролик).
        </p>

        {mediaUrl ? (
          <div className="relative w-fit overflow-hidden rounded-xl border border-border">
            {mediaType === "video" ? (
              <video src={mediaUrl} className="h-40 w-auto" muted loop autoPlay playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="Медиа баннера" className="h-40 w-auto object-cover" />
            )}
            <button
              type="button"
              onClick={() => {
                setMediaUrl(null);
                setMediaType(null);
              }}
              className="absolute right-2 top-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-semibold text-white"
            >
              Убрать
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) void uploadFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-accent bg-accent-soft" : "border-border bg-surface-2"
            }`}
          >
            <span className="text-sm font-medium">
              {uploading ? "Загрузка…" : "Перетащите файл сюда или нажмите, чтобы выбрать"}
            </span>
            <span className="text-xs text-text-muted">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
        {uploadError && <span className="font-medium text-red-600">{uploadError}</span>}
      </div>

      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={banner?.isPublished ?? true}
          className="h-4 w-4 accent-accent"
        />
        Опубликован (виден на главной странице)
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        {state?.success && (
          <span className="text-sm font-medium text-ok">Сохранено — обновлено на сайте.</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const className =
    "rounded-xl border border-border px-3.5 py-2.5 text-sm outline-none focus:border-accent";
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={className}
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className={className}
        />
      )}
    </label>
  );
}
