"use client";

import { useRef, useState } from "react";

// Shared photo-upload widget for every admin editor that manages a single
// image (catalog item card, cover option, cover-material/box-material
// variant, wide-format option) — click-to-pick AND drag-and-drop onto the
// same drop target, with the same "dragging over" highlight everywhere.
// Extracted from what used to be four near-identical PhotoUpload/
// ItemPhotoUpload components, one per editor file.
export default function PhotoUploadField({
  imageUrl,
  onChange,
  endpoint,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  size = "sm",
  alt = "Фото",
}: {
  imageUrl: string | null;
  onChange: (url: string | null) => void;
  endpoint: string;
  accept?: string;
  size?: "sm" | "md";
  alt?: string;
}) {
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
      const res = await fetch(endpoint, { method: "POST", body });
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

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  const boxSize = size === "md" ? "h-16 w-24" : "h-9 w-9";

  return (
    <div className="flex items-center gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative ${boxSize} shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
          dragOver
            ? "border-accent bg-accent-soft"
            : imageUrl
              ? "border-border"
              : "border-dashed border-border"
        }`}
      >
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={alt} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold text-white opacity-0 hover:opacity-100 disabled:opacity-100"
              title="Заменить фото — можно перетащить новый файл сюда"
            >
              {uploading ? "…" : "Заменить"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full items-center justify-center text-[10px] font-medium text-text-muted disabled:opacity-50"
            title="Загрузить фото — можно перетащить файл сюда"
          >
            {uploading ? "…" : "Фото"}
          </button>
        )}
      </div>
      {imageUrl && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[11px] font-semibold text-text-muted underline"
        >
          Убрать
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      {uploadError && <span className="text-[11px] font-medium text-red-600">{uploadError}</span>}
    </div>
  );
}
