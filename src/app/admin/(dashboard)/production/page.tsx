import ProductionBoard from "@/components/admin/ProductionBoard";
import { listProductionItems } from "@/lib/repo/orders";

export const dynamic = "force-dynamic";

export default async function AdminProductionPage() {
  const items = await listProductionItems();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Производство</h1>
        <span className="text-xs font-semibold text-text-muted">Позиций в работе: {items.length}</span>
      </div>
      <ProductionBoard items={items} />
    </div>
  );
}
