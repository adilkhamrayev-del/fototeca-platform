import { notFound } from "next/navigation";
import { getOrderById, ORDER_STATUS_LABELS, PRODUCTION_STAGE_LABELS } from "@/lib/repo/orders";
import { PRODUCTION_STAGE_ORDER } from "@/lib/orders-shared";
import PrintButton from "@/components/admin/PrintButton";

// Deliberately outside the (dashboard) route group — no admin sidebar/nav,
// so what renders here is exactly what should go to paper. Reachable by
// both roles (see isPathAllowedForRole in src/lib/auth/session.ts):
// production staff print from the kanban card, admin prints from the order
// page. This prints every item in the order (one item per printed page);
// production only ever links to a specific order anyway.

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default async function OrderPrintPage({
  params,
}: PageProps<"/admin/orders/[id]/print">) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const printedAt = formatDate(new Date().toISOString());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p className="text-sm text-text-muted">
          Бланк для производства — по одной странице на позицию заказа.
        </p>
        <PrintButton />
      </div>

      {order.items.map((item, index) => (
        <section
          key={item.id}
          className="break-after-page rounded-2xl border border-border p-8 print:break-after-page print:rounded-none print:border-0 print:p-0"
        >
          <header className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted print:text-black">
                Fototeca · Производственный бланк
              </p>
              <p className="mt-1 font-mono text-4xl font-bold">№ {order.number}</p>
              {order.items.length > 1 && (
                <p className="mt-1 text-xs text-text-muted print:text-black">
                  Позиция {index + 1} из {order.items.length}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-text-muted print:text-black">
              <p>Статус заказа: {ORDER_STATUS_LABELS[order.status]}</p>
              <p>Оформлен: {formatDate(order.createdAt)}</p>
              <p>Бланк распечатан: {printedAt}</p>
            </div>
          </header>

          <div className="mt-5 grid grid-cols-2 gap-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-text-muted print:text-black">
                Клиент
              </h2>
              <p className="mt-1 text-lg font-semibold">{order.clientName}</p>
              <p className="text-sm">{order.clientPhone}</p>
              {order.clientEmail && <p className="text-sm text-text-muted print:text-black">{order.clientEmail}</p>}
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wide text-text-muted print:text-black">
                Изделие
              </h2>
              <p className="mt-1 text-lg font-semibold">{item.itemTitle}</p>
              <p className="text-sm">
                Формат: <span className="font-semibold">{item.formatName}</span>
              </p>
              <p className="text-sm">
                Обложка: <span className="font-semibold">{item.coverName}</span>
                {item.coverVariantLabel && (
                  <span className="font-semibold"> — {item.coverVariantLabel}</span>
                )}
              </p>
              {item.coverComboPhotoUrl && (
                <div className="mt-2">
                  <p className="text-xs text-text-muted print:text-black">Фото клиента для комби:</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.coverComboPhotoUrl}
                    alt="Фото для комби-обложки"
                    className="mt-1 h-24 w-24 rounded-lg border border-border object-cover print:border-black"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl border border-border p-4 text-sm print:rounded-none print:border-black">
            <div>
              <p className="text-xs text-text-muted print:text-black">Разворотов</p>
              <p className="text-2xl font-bold">{item.spreads}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted print:text-black">Доп. опции</p>
              <p className="font-semibold">
                {[
                  item.endpapers && "форзацы",
                  item.packaging && "упаковка",
                  item.express && "срочно",
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted print:text-black">Цена позиции</p>
              <p className="text-2xl font-bold">{formatPrice(item.price)} ₸</p>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-muted print:text-black">
              Этап производства (отметить вручную)
            </h2>
            <div className="mt-2 flex gap-6">
              {PRODUCTION_STAGE_ORDER.map((stage) => (
                <label key={stage} className="flex items-center gap-2 text-sm">
                  <span className="inline-block h-5 w-5 border-2 border-black" />
                  {PRODUCTION_STAGE_LABELS[stage]}
                  {item.productionStage === stage && (
                    <span className="text-xs text-text-muted print:text-black">(текущий)</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wide text-text-muted print:text-black">
              Примечания
            </h2>
            <div className="mt-2 h-24 rounded-xl border border-border print:rounded-none print:border-black" />
          </div>
        </section>
      ))}
    </div>
  );
}
