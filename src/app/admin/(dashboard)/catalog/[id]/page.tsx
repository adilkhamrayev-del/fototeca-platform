import { notFound } from "next/navigation";
import CatalogItemForm from "@/components/admin/CatalogItemForm";
import CatalogFormatsEditor from "@/components/admin/CatalogFormatsEditor";
import { getCatalogItemById } from "@/lib/repo/catalog";
import {
  deleteCatalogFormatAction,
  deleteCoverOptionAction,
  updateCatalogItemAction,
  upsertCatalogFormatAction,
  upsertCoverOptionAction,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EditCatalogItemPage({
  params,
}: PageProps<"/admin/catalog/[id]">) {
  const { id } = await params;
  const item = await getCatalogItemById(id);
  if (!item) notFound();

  const boundUpdate = updateCatalogItemAction.bind(null, id);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">{item.title}</h1>
        <p className="mt-1 text-xs text-text-muted">/catalog/{item.slug}</p>
      </div>

      <CatalogItemForm item={item} action={boundUpdate} />

      <div>
        <h2 className="font-heading text-lg font-bold">Форматы, цены и обложки</h2>
        <p className="mt-1 text-xs text-text-muted">
          Изменения сразу видны в каталоге и в форме заказа.
        </p>
        <div className="mt-4">
          <CatalogFormatsEditor
            formats={item.formats}
            upsertFormatAction={upsertCatalogFormatAction.bind(null, item.id)}
            deleteFormatAction={deleteCatalogFormatAction.bind(null, item.id)}
            upsertCoverAction={upsertCoverOptionAction.bind(null, item.id)}
            deleteCoverAction={deleteCoverOptionAction.bind(null, item.id)}
          />
        </div>
      </div>
    </div>
  );
}
