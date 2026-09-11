import Link from "next/link";
import { listClients } from "@/lib/repo/clients";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// +7 701 234 56 78 style formatting for a bare "7XXXXXXXXXX" digit string —
// matches how phone numbers are shown elsewhere in the admin (order pages).
function formatPhone(digits: string) {
  const m = digits.match(/^7(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (!m) return digits;
  return `+7 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

const PAGE_SIZE = 50;

export default async function AdminClientsPage({
  searchParams,
}: PageProps<"/admin/clients">) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const page = typeof params.page === "string" ? Math.max(1, parseInt(params.page, 10) || 1) : 1;

  const { rows, total } = await listClients({ search, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Клиенты</h1>
        <p className="mt-1 text-sm text-text-muted">
          База клиентов: карточки из истории (Excel-выгрузки старой системы) и все, кто оформил
          заказ на новой платформе. «Заказы» — количество заказов на текущей платформе, старые
          заказы из архива сюда не считаются.
        </p>
      </div>

      <form className="flex gap-2" action="/admin/clients">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Поиск по имени, телефону или e-mail…"
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
            <Link href="/admin/clients" className="text-accent-ink">
              сбросить
            </Link>
          </>
        )}
      </span>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">Имя</th>
              <th className="px-5 py-3">Телефон</th>
              <th className="px-5 py-3">E-mail</th>
              <th className="px-5 py-3">Заказов</th>
              <th className="px-5 py-3">В базе с</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 align-top">
                <td className="px-5 py-3 font-medium">{c.fullName}</td>
                <td className="px-5 py-3 font-mono text-xs">{formatPhone(c.phone)}</td>
                <td className="px-5 py-3 text-xs text-text-muted">{c.email ?? "—"}</td>
                <td className="px-5 py-3">
                  {c.ordersCount > 0 ? (
                    <span className="rounded-lg bg-ok-soft px-2.5 py-1 text-[11px] font-semibold text-ok">
                      {c.ordersCount}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">0</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs text-text-muted">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-text-muted">
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
              href={`/admin/clients?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page - 1) })}`}
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
              href={`/admin/clients?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(page + 1) })}`}
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
