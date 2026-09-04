"use server";

import { revalidatePath } from "next/cache";
import { setProductionStage, type ProductionStage } from "@/lib/repo/orders";

const VALID_STAGES: ProductionStage[] = ["PRINTING", "ASSEMBLY", "COVER", "DONE"];

export async function advanceProductionStage(itemId: string, stage: ProductionStage) {
  if (!VALID_STAGES.includes(stage)) return;

  await setProductionStage(itemId, stage);

  revalidatePath("/admin/production");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}
