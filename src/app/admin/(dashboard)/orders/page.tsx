import Link from "next/link";
import { listOrders, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/repo/orders";

export const dynamic = "force-dynamic";

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_OPTIONS: { value: OrderStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Все" },
  { value: "AWAITING_PAYMENT", label: ORDER_STATUS_LABELS.AWAITING_PAYMENT },
  { value: "AWAITING_FILES", label: ORDER_STATUS_LABELS.AWAITING_FILES },
  { value: "IN_PRODUCTION", label: ORDER_STATUS_LABELS.IN_PRODUCTION },
  { value: "READY", label: ORDER_STATUS_LABELS.READY },
  { value: "COMPLETED", label: ORDER_STATUS_LABELS.COMPLETED },
  { value: "CANCELLED", label: ORDER_STATUS_LABELS.CANCELLED },
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-surface-2 text-text-muted",
  AWAITING_FILES: "bg-surface-2 text-text-muted",
  IN_PRODUCTION: "bg-accent-soft text-accent-ink",
  READY: "bg-ok-soft text-ok",
  COMPLETED: "bg-ok-soft text-ok",
  CANCELLED: "bg-red-50 text-red-600",
};

export default async function AdminOrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? params.status : "ALL";
  const status = statusParam !== "ALL" ? (statusParam as OrderStatus) : undefined;

  const orders = await listOrders({ status });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Журнал заказов</h1>
        <span className="text-xs font-semibold text-text-muted">Всего: {orders.length}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value === "ALL" ? "/admin/orders" : `/admin/orders?status=${opt.value}`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
              statusParam === opt.value
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-border text-text-muted"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">№ заказа</th>
              <th className="px-5 py-3">Клиент</th>
              <th className="px-5 py-3">Телефон</th>
              <th className="px-5 py-3">Позиция</th>
              <th className="px-5 py-3">Сумма</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3">Дата</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-mono font-semibold">{o.number}</td>
                <td className="px-5 py-3 font-medium">{o.clientName}</td>
                <td className="px-5 py-3 text-text-muted">{o.clientPhone}</td>
                <td className="px-5 py-3 text-text-muted">{o.itemTitle}</td>
                <td className="px-5 py-3 font-semibold">{formatPrice(o.totalAmount)} ₸</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[o.status]}`}
                  >
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-5 py-3 text-xs text-text-muted">{formatDate(o.createdAt)}</td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="text-xs font-semibold text-accent-ink"
                  >
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-8 text-center text-text-muted">
                  Заказов пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
