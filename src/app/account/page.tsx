import { cookies } from "next/headers";
import { getClientPhoneFromSession, CLIENT_SESSION_COOKIE_NAME } from "@/lib/auth/client-session";
import { getOrdersForClientPhone } from "@/lib/repo/orders";
import { ORDER_STATUS_LABELS } from "@/lib/orders-shared";
import { logoutClient } from "./actions";

// Gated by src/proxy.ts (redirects to /account/login without a valid
// client_session cookie) — this page can assume `phone` below is real.

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default async function AccountPage() {
  const cookieStore = await cookies();
  const phone = getClientPhoneFromSession(cookieStore.get(CLIENT_SESSION_COOKIE_NAME)?.value);
  // proxy.ts already guarantees this, but keep the page safe standalone.
  if (!phone) return null;

  const orders = await getOrdersForClientPhone(phone);
  const clientName = orders[0]?.clientName;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Личный кабинет</h1>
          <p className="mt-1 text-sm text-text-muted">
            {clientName ? `${clientName} · ` : ""}
            {phone}
          </p>
        </div>
        <form action={logoutClient}>
          <button
            type="submit"
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-2"
          >
            Выйти
          </button>
        </form>
      </div>

      {orders.length === 0 && (
        <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
          Заказов пока нет.
        </div>
      )}

      {orders.map((order) => (
        <div key={order.id} className="overflow-hidden rounded-3xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border bg-surface-2 px-6 py-4">
            <div>
              <p className="font-heading text-lg font-bold">№ {order.number}</p>
              <p className="text-xs text-text-muted">Оформлен {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-ink">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="font-heading text-lg font-bold">{formatPrice(order.totalAmount)} ₸</span>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-border">
            {order.items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-6 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-semibold">
                    {item.itemTitle}, {item.formatName}
                  </p>
                  <p className="text-sm text-text-muted">
                    Обложка «{item.coverName}»
                    {item.coverVariantLabel && <> — {item.coverVariantLabel}</>}
                  </p>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Файлы
                  </p>
                  {item.spreadPhotoUrls.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {item.spreadPhotoUrls.map((url, i) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-16 w-16 overflow-hidden rounded-lg border border-border transition hover:border-accent"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Разворот ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ))}
                      {item.coverComboPhotoUrl && (
                        <a
                          href={item.coverComboPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-16 w-16 flex-col items-center justify-center overflow-hidden rounded-lg border border-border text-center transition hover:border-accent"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.coverComboPhotoUrl}
                            alt="Фото для обложки"
                            className="h-full w-full object-cover"
                          />
                        </a>
                      )}
                    </div>
                  ) : item.fileLinkUrl ? (
                    <a
                      href={item.fileLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-accent-soft px-2.5 py-1.5 text-sm font-semibold text-accent-ink"
                    >
                      📎 Ваша ссылка на файлы
                    </a>
                  ) : (
                    <p className="text-sm text-text-muted">Файлы ещё не загружены</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
