import Header from "@/components/Header";
import Banner from "@/components/Banner";
import CatalogGrid from "@/components/CatalogGrid";
import ArticlesPanel from "@/components/ArticlesPanel";
import Footer from "@/components/Footer";
import { getPublishedBanner } from "@/lib/repo/banner";
import { listCatalogItems } from "@/lib/repo/catalog";
import { listPublishedArticles } from "@/lib/repo/articles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [banner, catalogItems, articles] = await Promise.all([
    getPublishedBanner(),
    listCatalogItems({ onlyActive: true }),
    listPublishedArticles(),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        {banner && <Banner banner={banner} />}
        <CatalogGrid items={catalogItems} />
        {articles.length > 0 && <ArticlesPanel articles={articles.slice(0, 3)} />}
      </main>
      <Footer />
    </>
  );
}
