"use server";

import { revalidatePath } from "next/cache";
import {
  createCoverMaterialVariant,
  deleteCoverMaterialVariant,
  updateCoverMaterialVariant,
  type MaterialKind,
} from "@/lib/repo/cover-variants";

// These swatches show up on every order page's "Тканевая"/"Экокожа"/"Комби"
// popup (see OrderConfigurator) — revalidate the same paths a catalog edit
// does, plus the admin page itself.
async function revalidateEverywhere() {
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin/cover-materials");
  revalidatePath("/order", "layout");
}

type RowState = { error?: string; success?: true } | undefined;

function parseMaterial(value: FormDataEntryValue | null): MaterialKind | null {
  return value === "tkanevaya" || value === "ekokozha" ? value : null;
}

export async function upsertCoverMaterialVariantAction(
  material: MaterialKind,
  _prevState: RowState,
  formData: FormData,
): Promise<RowState> {
  const variantId = String(formData.get("variantId") || "");
  const name = String(formData.get("name") ?? "").trim();
  const imageUrlRaw = String(formData.get("imageUrl") ?? "").trim();
  const imageUrl = imageUrlRaw ? imageUrlRaw : null;

  if (!name) return { error: "Укажите название варианта" };

  if (variantId) {
    await updateCoverMaterialVariant(variantId, { name, imageUrl });
  } else {
    await createCoverMaterialVariant({ material, name, imageUrl });
  }
  await revalidateEverywhere();
  return { success: true };
}

export async function deleteCoverMaterialVariantAction(id: string): Promise<{ error?: string }> {
  try {
    await deleteCoverMaterialVariant(id);
  } catch (error) {
    console.error(error);
    return { error: "Не удалось удалить вариант — попробуйте ещё раз" };
  }
  await revalidateEverywhere();
  return {};
}

// Re-exported so the client component can type-check the material param
// without importing the repo layer (which pulls in `pg`) into the bundle.
export type { MaterialKind };
