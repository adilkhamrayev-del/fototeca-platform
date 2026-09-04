import Link from "next/link";
import type { Article } from "@/lib/content";

export default function ArticlesPanel({ articles }: { articles: Article[] }) {
  return (
    <section className="mt-16 bg-surface-2 py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-14">
        <div className="flex items-end justify-between">
          <h2 className="font-heading text-2xl font-bold">Полезные статьи</h2>
          <Link href="/articles" className="text-sm font-semibold text-accent-ink">
            Все статьи →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/articles/${article.slug}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6 transition-shadow hover:shadow-lg"
            >
              <span className="inline-flex w-fit items-center rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
                {article.tag}
              </span>
              <h3 className="font-heading text-sm font-semibold leading-snug">
                {article.title}
              </h3>
              <p className="text-xs text-text-muted">{article.excerpt}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
