import Link from "next/link";
import { listLegacyOrders } from "@/lib/repo/legacyOrders";

export const dynamic = "force-dynamic";

function formatPrice(value: number | null) {
  if (value == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(value) + " ₸";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const PAGE_SIZE = 50;

export default async function AdminLegacyOrdersPage({
  searchParams,
}: PageProps<"/admin/legacy-orders">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const { rows, total } = await listLegacyOrders({ search, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Архив заказов (старая система)</h1>
        <p className="mt-1 text-sm text-text-muted">
          Заказы, перенесённые из zakaz.fototeca.kz — только для просмотра и поиска. Новые
          заказы создаются через «Заказы» в текущей платформе.
        </p>
      </div>

      <form className="flex gap-2" action="/admin/legacy-orders">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по номеру, имени, телефону или e-mail…"
          className="w-full max-w-md rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white"
        >
          Найти
        </button>
      </form>

      <span className="text-xs font-semibold text-text-muted">
        Найдено: {total}
        {search && (
          <>
            {" "}
            по запросу «{search}» —{" "}
            <Link href="/admin/legacy-orders" className="text-accent-ink">
              сбросить
            </Link>
          </>
        )}
      </span>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">№ заказа</th>
              <th className="px-5 py-3">Дата</th>
              <th className="px-5 py-3">Контрагент</th>
              <th className="px-5 py-3">Телефон/ячейка</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Сумма</th>
              <th className="px-5 py-3">Оплачено</th>
              <th className="px-5 py-3">Клиент</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 align-top">
                <td className="px-5 py-3 font-mono font-semibold">{r.legacyNumber}</td>
                <td className="px-5 py-3 text-xs text-text-muted">{formatDate(r.legacyDate)}</td>
                <td className="px-5 py-3 font-medium">{r.contractorName ?? "—"}</td>
                <td className="px-5 py-3 text-text-muted">{r.cellNumber ?? "—"}</td>
                <td className="px-5 py-3 text-xs text-text-muted">{r.email ?? "—"}</td>
                <td className="px-5 py-3 font-semibold">{formatPrice(r.orderAmount)}</td>
                <td className="px-5 py-3 text-text-muted">{formatPrice(r.amountPaid)}</td>
                <td className="px-5 py-3">
                  {r.hasClient ? (
                    <span className="rounded-lg bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok">
                      Есть
                    </span>
                  ) : (
                    <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-muted">
                      Не найден
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                  Ничего не найдено.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link
              href={`/admin/legacy-orders?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page - 1) })}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
            >
              ← Назад
            </Link>
          )}
          <span className="text-xs font-semibold text-text-muted">
            Страница {page} из {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/legacy-orders?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page + 1) })}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
            >
              Вперёд →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
