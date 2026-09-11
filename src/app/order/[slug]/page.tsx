import { notFound } from "next/navigation";
import Header from "@/components/Header";
import OrderConfigurator from "@/components/order/OrderConfigurator";
import { getCatalogItemBySlug } from "@/lib/repo/catalog";
import { listCoverMaterialVariants } from "@/lib/repo/cover-variants";
import { listBoxMaterialVariants } from "@/lib/repo/box-variants";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/order/[slug]">) {
  const { slug } = await params;
  const [item, coverMaterialVariants, boxMaterialVariants] = await Promise.all([
    getCatalogItemBySlug(slug),
    listCoverMaterialVariants(),
    listBoxMaterialVariants(),
  ]);
  if (!item || !item.isActive || !item.requiresUpload || item.formats.length === 0) notFound();

  return (
    <>
      <Header />
      <OrderConfigurator
        item={item}
        coverMaterialVariants={coverMaterialVariants}
        boxMaterialVariants={boxMaterialVariants}
      />
    </>
  );
}
