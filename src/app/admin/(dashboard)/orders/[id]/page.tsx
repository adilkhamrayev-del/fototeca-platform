import { notFound } from "next/navigation";
import Link from "next/link";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
import { getOrderById, ORDER_STATUS_LABELS, PRODUCTION_STAGE_LABELS } from "@/lib/repo/orders";
import { updateOrderStatusAction } from "../actions";

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

export default async function AdminOrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const boundUpdate = updateOrderStatusAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/orders" className="text-xs font-semibold text-accent-ink">
            ← Журнал заказов
          </Link>
          <h1 className="mt-1 font-heading text-2xl font-bold">Заказ №{order.number}</h1>
          <span className="text-xs text-text-muted">Создан {formatDate(order.createdAt)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink">
            {ORDER_STATUS_LABELS[order.status]}
          </span>
          <Link
            href={`/admin/orders/${order.id}/print`}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold"
          >
            Печать бланка
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-heading text-base font-semibold">Клиент</h2>
          <dl className="mt-3 flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Имя</dt>
              <dd className="font-medium">{order.clientName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Телефон</dt>
              <dd className="font-medium">{order.clientPhone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">E-mail</dt>
              <dd className="font-medium">{order.clientEmail ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-heading text-base font-semibold">Статус заказа</h2>
          <p className="mt-1 text-xs text-text-muted">
            Изменение статуса не влияет на этап производства позиций — им управляет канбан.
          </p>
          <div className="mt-4">
            <OrderStatusForm currentStatus={order.status} action={boundUpdate} />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">Позиция</th>
              <th className="px-5 py-3">Формат</th>
              <th className="px-5 py-3">Обложка</th>
              <th className="px-5 py-3">Разворотов</th>
              <th className="px-5 py-3">Опции</th>
              <th className="px-5 py-3">Этап производства</th>
              <th className="px-5 py-3">Цена</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{item.itemTitle}</td>
                <td className="px-5 py-3 text-text-muted">{item.formatName}</td>
                <td className="px-5 py-3 text-text-muted">
                  {item.coverName}
                  {item.coverVariantLabel && (
                    <span className="block text-xs">{item.coverVariantLabel}</span>
                  )}
                  {item.coverComboPhotoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverComboPhotoUrl}
                      alt="Фото клиента для комби"
                      className="mt-1 h-10 w-10 rounded-lg border border-border object-cover"
                    />
                  )}
                </td>
                <td className="px-5 py-3">{item.spreads}</td>
                <td className="px-5 py-3 text-xs text-text-muted">
                  {[
                    item.endpapers && "форзацы",
                    item.packaging && "упаковка",
                    item.express && "экспресс",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                    {PRODUCTION_STAGE_LABELS[item.productionStage]}
                  </span>
                </td>
                <td className="px-5 py-3 font-semibold">{formatPrice(item.price)} ₸</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-muted">Итого по заказу</span>
          <span className="font-heading text-xl font-bold">{formatPrice(order.totalAmount)} ₸</span>
        </div>
      </div>
    </div>
  );
}
