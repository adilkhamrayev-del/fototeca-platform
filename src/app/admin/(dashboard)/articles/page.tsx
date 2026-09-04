import Link from "next/link";
import { listAllArticles } from "@/lib/repo/articles";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await listAllArticles();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Статьи блога</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white"
        >
          + Новая статья
        </Link>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-semibold text-text-muted">
              <th className="px-5 py-3">Заголовок</th>
              <th className="px-5 py-3">Тег</th>
              <th className="px-5 py-3">Статус</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-b border-border last:border-0">
                <td className="px-5 py-3 font-medium">{a.title}</td>
                <td className="px-5 py-3 text-text-muted">{a.tag}</td>
                <td className="px-5 py-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      a.status === "PUBLISHED"
                        ? "bg-ok-soft text-ok"
                        : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {a.status === "PUBLISHED" ? "Опубликована" : "Черновик"}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <Link
                    href={`/admin/articles/${a.id}`}
                    className="text-xs font-semibold text-accent-ink"
                  >
                    Редактировать
                  </Link>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-text-muted">
                  Статей пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
