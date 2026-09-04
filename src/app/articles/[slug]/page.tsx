import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getArticleBySlug } from "@/lib/repo/articles";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug, { onlyPublished: true });
  if (!article) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        <article className="mx-auto max-w-3xl px-6 pt-12 lg:px-14">
          <Link href="/articles" className="text-sm font-semibold text-accent-ink">
            ← Все статьи
          </Link>
          <span className="mt-6 inline-flex w-fit items-center rounded-lg bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-ink">
            {article.tag}
          </span>
          <h1 className="mt-4 font-heading text-3xl font-bold">{article.title}</h1>
          <p className="mt-2 text-xs text-text-muted">
            {new Date(article.publishedAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="mt-8 text-base leading-relaxed text-text">{article.content}</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
