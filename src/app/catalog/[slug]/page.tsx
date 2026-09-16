import { redirect, notFound } from "next/navigation";
import { getCatalogItemBySlug } from "@/lib/repo/catalog";

export const dynamic = "force-dynamic";

// This used to be a standalone "item details" page (gradient placeholder,
// description, a separate "Оформить заказ" button) sitting between the
// catalog grid and the actual order configurator — an extra click that
// showed nothing the configurator itself doesn't already show up top. The
// catalog grid now links straight to /order/[slug]; this route stays only
// as a redirect so any old bookmarked/shared /catalog/[slug] link still
// lands somewhere useful instead of a dead 404.
export default async function CatalogItemRedirectPage({
  params,
}: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug(slug);
  if (!item || !item.isActive) notFound();
  redirect(`/order/${slug}`);
}
