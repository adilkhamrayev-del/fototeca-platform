"use server";

import { revalidatePath } from "next/cache";
import { updateOrderStatus, type OrderStatus } from "@/lib/repo/orders";

export async function updateOrderStatusAction(
  id: string,
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const valid: OrderStatus[] = [
    "AWAITING_PAYMENT",
    "AWAITING_FILES",
    "IN_PRODUCTION",
    "READY",
    "COMPLETED",
    "CANCELLED",
  ];
  if (!valid.includes(status)) return { error: "Некорректный статус" };

  await updateOrderStatus(id, status);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/production");
  revalidatePath("/admin");

  return { success: true };
}
