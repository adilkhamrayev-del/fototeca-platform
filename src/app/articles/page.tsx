import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { listPublishedArticles } from "@/lib/repo/articles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Полезные статьи — Fototeca",
};

export default async function ArticlesPage() {
  const articles = await listPublishedArticles();

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-6xl px-6 pt-12 lg:px-14">
          <h1 className="font-heading text-3xl font-bold">Полезные статьи</h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            Гайды по подготовке файлов, выбору обложки и форматов — из практики нашей студии.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="flex flex-col gap-3 rounded-2xl border border-border p-6 transition-shadow hover:shadow-lg"
              >
                <span className="inline-flex w-fit items-center rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                  {article.tag}
                </span>
                <h2 className="font-heading text-base font-semibold leading-snug">
                  {article.title}
                </h2>
                <p className="text-sm text-text-muted">{article.excerpt}</p>
              </Link>
            ))}
            {articles.length === 0 && (
              <p className="text-sm text-text-muted">Статей пока нет.</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
