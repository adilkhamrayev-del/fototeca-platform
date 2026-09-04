import { listCoverMaterialVariants } from "@/lib/repo/cover-variants";
import CoverMaterialsEditor from "@/components/admin/CoverMaterialsEditor";
import { upsertCoverMaterialVariantAction, deleteCoverMaterialVariantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CoverMaterialsPage() {
  const variants = await listCoverMaterialVariants();
  const tkanevaya = variants.filter((v) => v.material === "tkanevaya");
  const ekokozha = variants.filter((v) => v.material === "ekokozha");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Варианты обложек</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Общие для всего сайта наборы расцветок ткани и экокожи — показываются клиенту во
          всплывающем окне при выборе обложки «Тканевая», «Экокожа» или «Комби» (для «Комби» —
          выбор одного варианта, либо из ткани, либо из экокожи, плюс своё фото — клиент
          загружает его сам при оформлении заказа). Общий вид обложки «Комби» на плашке типа
          обложки редактируется в карточке позиции каталога.
        </p>
      </div>
      <CoverMaterialsEditor
        tkanevaya={tkanevaya}
        ekokozha={ekokozha}
        upsertAction={upsertCoverMaterialVariantAction}
        deleteAction={deleteCoverMaterialVariantAction}
      />
    </div>
  );
}
