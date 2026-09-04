"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCatalogFormat,
  createCatalogItem,
  createCoverOption,
  deleteCatalogFormat,
  deleteCoverOption,
  getCatalogItemById,
  updateCatalogFormat,
  updateCatalogItem,
  updateCoverOption,
} from "@/lib/repo/catalog";
import type { CoverVariantKind } from "@/lib/content";

// Every mutation here can affect prices/availability a customer sees mid
// order, so each one revalidates the full chain: the admin list/edit pages
// (so the change shows up without a manual refresh), the public catalog
// list and item page, and the order configurator page — all keyed by the
// item's slug, which is what /catalog/[slug] and /order/[slug] actually use
// (not its id).
async function revalidateCatalog(catalogItemId: string) {
  const item = await getCatalogItemById(catalogItemId);
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${catalogItemId}`);
  if (item) {
    revalidatePath(`/catalog/${item.slug}`);
    revalidatePath(`/order/${item.slug}`);
  }
}

// A format/cover-option row is a bare id — the caller only knows which
// catalog item it belongs to via the page it's rendered on, so every
// row-level action takes that item's id explicitly (passed via .bind from
// the page) purely to know what to revalidate afterward.

export async function updateCatalogItemAction(
  id: string,
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const priceFrom = Number(formData.get("priceFrom"));
  const isActive = formData.get("isActive") === "on";

  if (!title.trim()) return { error: "Укажите название" };
  if (!Number.isFinite(priceFrom) || priceFrom < 0) return { error: "Некорректная цена" };

  await updateCatalogItem(id, { title, description, priceFrom, isActive });
  await revalidateCatalog(id);

  return { success: true };
}

export async function createCatalogItemAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const priceFrom = Number(formData.get("priceFrom"));
  const requiresUpload = formData.get("requiresUpload") !== "off"; // default on

  if (!title) return { error: "Укажите название" };
  if (!Number.isFinite(priceFrom) || priceFrom < 0) return { error: "Некорректная цена" };

  const id = await createCatalogItem({
    title,
    description: description || title,
    priceFrom,
    requiresUpload,
  });
  await revalidateCatalog(id);
  redirect(`/admin/catalog/${id}`);
}

function parsePositiveInt(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function parsePositiveFloat(value: FormDataEntryValue | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

type RowState = { error?: string } | undefined;

export async function upsertCatalogFormatAction(
  catalogItemId: string,
  _prevState: RowState,
  formData: FormData,
) {
  const formatId = String(formData.get("formatId") || "");
  const name = String(formData.get("name") ?? "").trim();
  const widthMm = parsePositiveFloat(formData.get("widthMm"), 0);
  const heightMm = parsePositiveFloat(formData.get("heightMm"), 0);
  const dpi = parsePositiveInt(formData.get("dpi"), 300);
  const pricePerSpread = parsePositiveInt(formData.get("pricePerSpread"), 0);
  const minSpreads = parsePositiveInt(formData.get("minSpreads"), 1);
  const maxSpreads = parsePositiveInt(formData.get("maxSpreads"), 60);

  if (!name) return { error: "Укажите название формата" };
  if (!widthMm || !heightMm) return { error: "Укажите ширину и высоту в миллиметрах" };
  if (!dpi) return { error: "Укажите разрешение (пикс/дюйм)" };
  if (minSpreads < 1 || maxSpreads < minSpreads) {
    return { error: "Проверьте мин./макс. разворотов" };
  }

  const input = { name, widthMm, heightMm, dpi, pricePerSpread, minSpreads, maxSpreads };
  if (formatId) {
    await updateCatalogFormat(formatId, input);
  } else {
    await createCatalogFormat(catalogItemId, input);
  }
  await revalidateCatalog(catalogItemId);
  return { success: true as const };
}

export async function deleteCatalogFormatAction(
  catalogItemId: string,
  formatId: string,
): Promise<{ error?: string }> {
  try {
    await deleteCatalogFormat(formatId);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "Нельзя удалить формат — он уже используется в заказах." };
    }
    throw error;
  }
  await revalidateCatalog(catalogItemId);
  return {};
}

export async function upsertCoverOptionAction(
  catalogItemId: string,
  catalogFormatId: string,
  _prevState: RowState,
  formData: FormData,
) {
  const coverId = String(formData.get("coverId") || "");
  const name = String(formData.get("name") ?? "").trim();
  const priceModifier = parsePositiveInt(formData.get("priceModifier"), 0);
  const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();
  const imageUrl = imageUrlRaw ? imageUrlRaw : null;
  const variantKindRaw = String(formData.get("variantKind") ?? "none");
  const variantKind: CoverVariantKind = (
    ["none", "tkanevaya", "ekokozha", "kombi"] as const
  ).includes(variantKindRaw as CoverVariantKind)
    ? (variantKindRaw as CoverVariantKind)
    : "none";

  if (!name) return { error: "Укажите название обложки" };

  if (coverId) {
    await updateCoverOption(coverId, { name, priceModifier, imageUrl, variantKind });
  } else {
    await createCoverOption(catalogFormatId, { name, priceModifier, imageUrl, variantKind });
  }
  await revalidateCatalog(catalogItemId);
  return { success: true as const };
}

export async function deleteCoverOptionAction(
  catalogItemId: string,
  coverId: string,
): Promise<{ error?: string }> {
  try {
    await deleteCoverOption(coverId);
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { error: "Нельзя удалить обложку — она уже используется в заказах." };
    }
    throw error;
  }
  await revalidateCatalog(catalogItemId);
  return {};
}

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23503"
  );
}
