import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CatalogGrid from "@/components/CatalogGrid";
import { listCatalogItems } from "@/lib/repo/catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Каталог — Fototeca",
};

export default async function CatalogPage() {
  const catalogItems = await listCatalogItems({ onlyActive: true });

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-6xl px-6 pt-12 lg:px-14">
          <h1 className="font-heading text-3xl font-bold">Каталог</h1>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            Фотокниги, выпускные альбомы и печать — выберите формат и переходите к оформлению.
          </p>
        </div>
        <CatalogGrid items={catalogItems} showHeading={false} />
      </main>
      <Footer />
    </>
  );
}
