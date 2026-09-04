import Link from "next/link";
import { listCatalogItems } from "@/lib/repo/catalog";
import NewCatalogItemForm from "@/components/admin/NewCatalogItemForm";
import { createCatalogItemAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  const items = await listCatalogItems();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Каталог</h1>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">Название</th>
              <th className="px-5 py-3">Цена от</th>
              <th className="px-5 py-3">Форматов</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{item.title}</td>
                <td className="px-5 py-3">
                  {new Intl.NumberFormat("ru-RU").format(item.priceFrom)} ₸
                </td>
                <td className="px-5 py-3 text-text-muted">{item.formats.length}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      item.isActive ? "bg-ok-soft text-ok" : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {item.isActive ? "Активна" : "Скрыта"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/catalog/${item.id}`}
                    className="text-xs font-semibold text-accent-ink"
                  >
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <h2 className="font-heading text-base font-semibold">Добавить товар</h2>
        <p className="mt-1 text-xs text-text-muted">
          После создания откроется страница редактирования — там добавляются форматы и обложки.
        </p>
        <div className="mt-4">
          <NewCatalogItemForm action={createCatalogItemAction} />
        </div>
      </div>
    </div>
  );
}
