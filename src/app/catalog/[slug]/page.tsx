import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getCatalogItemBySlug } from "@/lib/repo/catalog";

export const dynamic = "force-dynamic";

export default async function CatalogItemPage({ params }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const item = await getCatalogItemBySlug(slug);
  if (!item || !item.isActive) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-6xl px-6 pt-12 lg:px-14">
          <Link href="/catalog" className="text-sm font-semibold text-accent-ink">
            ← Каталог
          </Link>
          <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div
              className="h-72 rounded-3xl"
              style={{
                background: `linear-gradient(150deg, ${item.gradient[0]}, ${item.gradient[1]})`,
              }}
            />
            <div className="flex flex-col gap-5">
              <h1 className="font-heading text-3xl font-bold">{item.title}</h1>
              <p className="text-sm text-text-muted">{item.description}</p>
              <span className="text-xl font-semibold">
                от {new Intl.NumberFormat("ru-RU").format(item.priceFrom)} ₸
              </span>
              <Link
                href={`/order/${item.slug}`}
                className="w-fit rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-white"
              >
                Оформить заказ
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
