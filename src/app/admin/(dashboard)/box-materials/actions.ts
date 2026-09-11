"use server";

import { revalidatePath } from "next/cache";
import {
  createBoxMaterialVariant,
  deleteBoxMaterialVariant,
  updateBoxMaterialVariant,
  type BoxMaterialKind,
} from "@/lib/repo/box-variants";

// These swatches show up on every order page's box-lining picker (shown
// when "Подарочная упаковка" is checked, see OrderConfigurator) — revalidate
// the same paths a catalog edit does, plus the admin page itself.
async function revalidateEverywhere() {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin/box-materials");
  revalidatePath("/order", "layout");
}

type RowState = { error?: string; success?: true } | undefined;

function parseMaterial(value: FormDataEntryValue | null): BoxMaterialKind | null {
  return value === "barkhat" || value === "velur" ? value : null;
}

export async function upsertBoxMaterialVariantAction(
  material: BoxMaterialKind,
  _prevState: RowState,
  formData: FormData,
): Promise<RowState> {
  const variantId = String(formData.get("variantId") || "");
  const name = String(formData.get("name") ?? "").trim();
  const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();
  const imageUrl = imageUrlRaw ? imageUrlRaw : null;

  if (!name) return { error: "Укажите название варианта" };

  if (variantId) {
    await updateBoxMaterialVariant(variantId, { name, imageUrl });
  } else {
    await createBoxMaterialVariant({ material, name, imageUrl });
  }
  await revalidateEverywhere();
  return { success: true };
}

export async function deleteBoxMaterialVariantAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteBoxMaterialVariant(id);
  } catch (error) {
    console.error(error);
    return { error: "Не удалось удалить вариант — попробуйте ещё раз" };
  }
  await revalidateEverywhere();
  return {};
}

// Re-exported so the client component can type-check the material param
// without importing the repo layer (which pulls in `pg`) into the bundle.
export type { BoxMaterialKind };
