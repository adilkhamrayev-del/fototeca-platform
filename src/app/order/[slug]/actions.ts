"use server";

import { createOrder, createWideFormatOrder } from "@/lib/repo/orders";

export type SubmitOrderInput = {
  clientName: string;
  clientPhone: string;
  catalogItemId: string;
  catalogFormatId: string;
  coverOptionId: string;
  coverVariantId?: string | null;
  coverComboPhotoUrl?: string | null;
  spreads: number;
  endpapers: boolean;
  packaging: boolean;
  // Box-lining swatch (бархат/велюр) the customer picked — only meaningful
  // when packaging is true, see box_material_variants in db/schema.sql.
  boxMaterialId?: string | null;
  express: boolean;
  price: number;
  uploadDraftId: string;
  fileLinkUrl?: string | null;
  // Durable URLs for the customer's uploaded spread photos, in page order
  // — see NewOrderInput's own comment in src/lib/repo/orders.ts.
  spreadPhotoUrls?: string[];
  // "Виньетка" (выпускные альбомы) only — two more upload blocks alongside
  // spreadPhotoUrls above. See NewOrderInput's own comment.
  coverPhotoUrls?: string[];
  commonFileUrls?: string[];
};

export async function submitOrder(
  input: SubmitOrderInput,
): Promise<{ orderNumber: string } | { error: string }> {
  if (!input.clientName.trim()) return { error: "Укажите имя" };
  const phoneDigits = input.clientPhone.replace(/\D/g, "");
  if (phoneDigits.length < 10) return { error: "Укажите корректный номер телефона" };
  const fileLinkUrl = input.fileLinkUrl?.trim() || null;
  if (fileLinkUrl && !/^https?:\/\//i.test(fileLinkUrl)) {
    return { error: "Ссылка на файлы должна начинаться с http:// или https://" };
  }

  try {
    const { orderNumber } = await createOrder({
      clientName: input.clientName.trim(),
      clientPhone: phoneDigits,
      catalogItemId: input.catalogItemId,
      catalogFormatId: input.catalogFormatId,
      coverOptionId: input.coverOptionId,
      coverVariantId: input.coverVariantId ?? null,
      coverComboPhotoUrl: input.coverComboPhotoUrl ?? null,
      spreads: input.spreads,
      endpapers: input.endpapers,
      packaging: input.packaging,
      boxMaterialId: input.boxMaterialId ?? null,
      express: input.express,
      price: input.price,
      uploadDraftId: input.uploadDraftId,
      fileLinkUrl,
      spreadPhotoUrls: input.spreadPhotoUrls ?? [],
      coverPhotoUrls: input.coverPhotoUrls ?? [],
      commonFileUrls: input.commonFileUrls ?? [],
    });
    return { orderNumber };
  } catch (err) {
    console.error(err);
    return { error: "Не удалось сохранить заказ — попробуйте ещё раз" };
  }
}

export type SubmitWideFormatOrderInput = {
  clientName: string;
  clientPhone: string;
  catalogItemId: string;
  wideFormatOptionId: string;
  widthCm: number;
  heightCm: number;
  printFileUrl?: string | null;
};

export async function submitWideFormatOrder(
  input: SubmitWideFormatOrderInput,
): Promise<{ orderNumber: string } | { error: string }> {
  if (!input.clientName.trim()) return { error: "Укажите имя" };
  const phoneDigits = input.clientPhone.replace(/\D/g, "");
  if (phoneDigits.length < 10) return { error: "Укажите корректный номер телефона" };
  if (!Number.isFinite(input.widthCm) || !Number.isFinite(input.heightCm)) {
    return { error: "Укажите размеры" };
  }

  try {
    // Price is recomputed server-side from the option's own rates — see
    // computeWideFormatPrice's own comment for why we never trust a
    // client-submitted price for a customer-typed size.
    const { orderNumber } = await createWideFormatOrder({
      clientName: input.clientName.trim(),
      clientPhone: phoneDigits,
      catalogItemId: input.catalogItemId,
      wideFormatOptionId: input.wideFormatOptionId,
      widthCm: input.widthCm,
      heightCm: input.heightCm,
      printFileUrl: input.printFileUrl ?? null,
    });
    return { orderNumber };
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Не удалось сохранить заказ — попробуйте ещё раз";
    return { error: message };
  }
}
