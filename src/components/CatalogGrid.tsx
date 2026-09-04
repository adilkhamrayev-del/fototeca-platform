import Link from "next/link";
import type { CatalogItem } from "@/lib/content";

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export default function CatalogGrid({
  items,
  showHeading = true,
}: {
  items: CatalogItem[];
  showHeading?: boolean;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 lg:px-14">
      {showHeading && <h2 className="font-heading text-2xl font-bold">Каталог</h2>}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/catalog/${item.slug}`}
            className="flex flex-col overflow-hidden rounded-3xl border border-border transition-shadow hover:shadow-lg"
          >
            <div
              className="h-40"
              style={{
                background: `linear-gradient(150deg, ${item.gradient[0]}, ${item.gradient[1]})`,
              }}
            />
            <div className="flex flex-1 flex-col gap-2 p-6">
              <h3 className="font-heading text-base font-semibold">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
              <div className="mt-auto flex items-center justify-between pt-4">
                <span className="text-sm font-semibold">
                  от {formatPrice(item.priceFrom)} ₸
                </span>
                <span className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white">
                  Заказать
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
