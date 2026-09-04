"use server";

import { createOrder } from "@/lib/repo/orders";

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
  express: boolean;
  price: number;
  uploadDraftId: string;
};

export async function submitOrder(
  input: SubmitOrderInput,
): Promise<{ orderNumber: string } | { error: string }> {
  if (!input.clientName.trim()) return { error: "Укажите имя" };
  const phoneDigits = input.clientPhone.replace(/\D/g, "");
  if (phoneDigits.length < 10) return { error: "Укажите корректный номер телефона" };

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
      express: input.express,
      price: input.price,
      uploadDraftId: input.uploadDraftId,
    });
    return { orderNumber };
  } catch (err) {
    console.error(err);
    return { error: "Не удалось сохранить заказ — попробуйте ещё раз" };
  }
}
