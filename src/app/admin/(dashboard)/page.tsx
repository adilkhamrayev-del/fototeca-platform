import Link from "next/link";
import { pool } from "@/lib/db";
import { getBannerForAdmin } from "@/lib/repo/banner";
import { listAllArticles } from "@/lib/repo/articles";
import { listCatalogItems } from "@/lib/repo/catalog";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [banner, articles, catalogItems, orderCount] = await Promise.all([
    getBannerForAdmin(),
    listAllArticles(),
    listCatalogItems(),
    pool.query("select count(*)::int as count from orders").then((r) => r.rows[0].count as number),
  ]);

  const publishedArticles = articles.filter((a) => a.status === "PUBLISHED").length;
  const activeCatalogItems = catalogItems.filter((c) => c.isActive).length;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Дашборд</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Заказов в базе" value={orderCount} />
        <StatCard
          label="Баннер"
          value={banner ? (banner.isPublished ? "Опубликован" : "Черновик") : "Не создан"}
        />
        <StatCard label="Статьи опубликованы" value={`${publishedArticles} из ${articles.length}`} />
        <StatCard label="Активные позиции каталога" value={`${activeCatalogItems} из ${catalogItems.length}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-heading text-base font-semibold">Баннер на главной</h2>
          <p className="mt-2 text-sm text-text-muted">
            {banner ? banner.title : "Баннер ещё не настроен."}
          </p>
          <Link
            href="/admin/banner"
            className="mt-4 inline-flex rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white"
          >
            Редактировать баннер
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-6">
          <h2 className="font-heading text-base font-semibold">Статьи блога</h2>
          <div className="mt-3 flex flex-col gap-1.5">
            {articles.slice(0, 4).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{a.title}</span>
                <span
                  className={`ml-3 shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                    a.status === "PUBLISHED"
                      ? "bg-ok-soft text-ok"
                      : "bg-surface-2 text-text-muted"
                  }`}
                >
                  {a.status === "PUBLISHED" ? "Live" : "Draft"}
                </span>
              </div>
            ))}
            {articles.length === 0 && <p className="text-sm text-text-muted">Статей пока нет.</p>}
          </div>
          <Link
            href="/admin/articles"
            className="mt-4 inline-flex rounded-xl border border-border px-5 py-2.5 text-xs font-semibold"
          >
            Управлять статьями
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5">
      <span className="text-xs font-semibold text-text-muted">{label}</span>
      <div className="mt-1.5 font-heading text-xl font-bold">{value}</div>
    </div>
  );
}
