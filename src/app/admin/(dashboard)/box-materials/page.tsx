import { listBoxMaterialVariants } from "@/lib/repo/box-variants";
import BoxMaterialsEditor from "@/components/admin/BoxMaterialsEditor";
import { upsertBoxMaterialVariantAction, deleteBoxMaterialVariantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function BoxMaterialsPage() {
  const variants = await listBoxMaterialVariants();
  const barkhat = variants.filter((v) => v.material === "barkhat");
  const velur = variants.filter((v) => v.material === "velur");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Материалы коробов</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Отделка внутри подарочной упаковки (короба) — бархат и велюр. Это не имеет отношения к
          обложке самой книги («Варианты обложек» — отдельный раздел). Показывается клиенту при
          выборе опции «Подарочная упаковка» на странице заказа.
        </p>
      </div>
      <BoxMaterialsEditor
        barkhat={barkhat}
        velur={velur}
        upsertAction={upsertBoxMaterialVariantAction}
        deleteAction={deleteBoxMaterialVariantAction}
      />
    </div>
  );
}
