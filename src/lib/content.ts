// Seed data + shared shape definitions for Banner / Article / CatalogItem.
// The storefront and admin panel now read from PostgreSQL (src/lib/repo/*)
// instead of this file directly — but they import these same types, and
// `scripts/seed.ts` inserts this exact data as the starting content.

// Какой попап выбора вариантов открывается на странице заказа при клике на
// эту обложку: 'tkanevaya'/'ekokozha' — один попап со свотчами того же
// материала (см. CoverMaterialVariant), общими на весь сайт; 'kombi' — два
// попапа (один вариант ткани + один вариант экокожи); 'none' (Хит2 и т.п.)
// — выбор сразу, без попапа.
export type CoverVariantKind = "none" | "tkanevaya" | "ekokozha" | "kombi";

export type CoverOption = {
  id: string;
  name: string; // "Хит2" | "Тканевая" | "Экокожа" | "Комби" — один уровень выбора
  priceModifier: number;
  gradient: [string, string];
  imageUrl?: string | null; // реальное фото обложки — если задано, показывается вместо gradient
  variantKind: CoverVariantKind;
};

export type CatalogFormat = {
  id: string;
  name: string; // "20×20 см"
  // widthPx/heightPx remain the source of truth everywhere a pixel size is
  // actually needed (upload validation, order-page copy) — the admin editor
  // collects widthMm/heightMm/dpi instead and these are derived from them
  // on save (see upsertCatalogFormatAction). Kept alongside so this type
  // still round-trips through the DB without every caller needing mm/dpi.
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  dpi: number;
  pricePerSpread: number;
  minSpreads: number;
  maxSpreads: number;
  coverOptions: CoverOption[];
};

export type CatalogItem = {
  slug: string;
  title: string;
  description: string;
  priceFrom: number;
  gradient: [string, string];
  requiresUpload: boolean;
  formats: CatalogFormat[];
};

const bookCoverOptions: CoverOption[] = [
  {
    id: "hit2",
    name: "Хит2",
    priceModifier: 0,
    gradient: ["oklch(84% 0.05 40)", "oklch(66% 0.08 30)"],
    variantKind: "none",
  },
  {
    id: "tkanevaya",
    name: "Тканевая",
    priceModifier: 3500,
    gradient: ["oklch(74% 0.08 220)", "oklch(56% 0.09 210)"],
    variantKind: "tkanevaya",
  },
  {
    id: "ekokozha",
    name: "Экокожа",
    priceModifier: 2800,
    gradient: ["oklch(88% 0.02 75)", "oklch(66% 0.03 65)"],
    variantKind: "ekokozha",
  },
  {
    id: "kombi",
    name: "Комби",
    priceModifier: 4200,
    gradient: ["oklch(78% 0.05 300)", "oklch(58% 0.08 300)"],
    variantKind: "kombi",
  },
];

export const catalogItems: CatalogItem[] = [
  {
    slug: "fotokniga-mokraya-pechat",
    title: "Фотокнига мокрая печать",
    description:
      "Премиальная печать с ламинацией разворотов, плотные страницы без эффекта волны.",
    priceFrom: 750,
    gradient: ["oklch(84% 0.05 40)", "oklch(64% 0.07 32)"],
    requiresUpload: true,
    formats: [
      {
        id: "20x20",
        name: "20×20 см",
        widthPx: 4060,
        heightPx: 2030,
        widthMm: 406,
        heightMm: 203,
        dpi: 254,
        pricePerSpread: 1150,
        minSpreads: 1,
        maxSpreads: 60,
        coverOptions: bookCoverOptions,
      },
      {
        id: "25x25",
        name: "25×25 см",
        widthPx: 5080,
        heightPx: 2540,
        widthMm: 508,
        heightMm: 254,
        dpi: 254,
        pricePerSpread: 1450,
        minSpreads: 1,
        maxSpreads: 60,
        coverOptions: bookCoverOptions,
      },
      {
        id: "30x30",
        name: "30×30 см",
        widthPx: 6096,
        heightPx: 3048,
        widthMm: 609.6,
        heightMm: 304.8,
        dpi: 254,
        pricePerSpread: 1850,
        minSpreads: 1,
        maxSpreads: 60,
        coverOptions: bookCoverOptions,
      },
    ],
  },
  {
    slug: "fotokniga-tsifrovaya-pechat",
    title: "Фотокнига цифровая печать",
    description: "Быстрая и доступная печать фотокниг для повседневных альбомов.",
    priceFrom: 490,
    gradient: ["oklch(74% 0.08 220)", "oklch(56% 0.09 210)"],
    requiresUpload: true,
    formats: [
      {
        id: "20x20",
        name: "20×20 см",
        widthPx: 4060,
        heightPx: 2030,
        widthMm: 406,
        heightMm: 203,
        dpi: 254,
        pricePerSpread: 750,
        minSpreads: 1,
        maxSpreads: 60,
        coverOptions: bookCoverOptions,
      },
      {
        id: "25x25",
        name: "25×25 см",
        widthPx: 5080,
        heightPx: 2540,
        widthMm: 508,
        heightMm: 254,
        dpi: 254,
        pricePerSpread: 990,
        minSpreads: 1,
        maxSpreads: 60,
        coverOptions: bookCoverOptions,
      },
    ],
  },
  {
    slug: "vypusknye-albomy",
    title: "Выпускные альбомы",
    description: "Групповые и индивидуальные альбомы для детских садов, школ и вузов.",
    priceFrom: 12000,
    gradient: ["oklch(78% 0.05 300)", "oklch(58% 0.08 300)"],
    requiresUpload: true,
    formats: [
      {
        id: "standard",
        name: "Стандарт, 25×32 см",
        widthPx: 5200,
        heightPx: 3200,
        widthMm: 520,
        heightMm: 320,
        dpi: 254,
        pricePerSpread: 0,
        minSpreads: 1,
        maxSpreads: 1,
        coverOptions: bookCoverOptions,
      },
    ],
  },
];

export function getCatalogItem(slug: string) {
  return catalogItems.find((item) => item.slug === slug);
}

export type Article = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
};

export const articles: Article[] = [
  {
    slug: "kak-podgotovit-maket",
    tag: "Гайд",
    title: "Как подготовить макет фотокниги",
    excerpt:
      "Разбираем требования к файлам — формат, цветовой профиль, разрешение — чтобы книга напечаталась без сюрпризов.",
    content:
      "Для печати мы принимаем файлы в формате JPG, в цветовом профиле sRGB, с разрешением 300 dpi. Размеры разворотов зависят от формата книги — например, для 20×20 см это 4060×2030 px. Файлы называйте по порядку: 01, 02, 03… — так мы соберём книгу в правильной последовательности.",
    publishedAt: "2026-08-01",
  },
  {
    slug: "5-oshibok-pri-vybore-oblozhki",
    tag: "Выбор",
    title: "5 ошибок при выборе обложки",
    excerpt:
      "Хит2, тканевая, экокожа или комби — что выбрать под ваш случай и какие ошибки допускают клиенты чаще всего.",
    content:
      "Обложка «Хит2», тканевая и экокожа — это варианты одного уровня: выбирается только один тип. Комби-обложка сочетает материалы в одном развороте. Частая ошибка — путать тип обложки с материалом форзаца, который подбирается отдельно.",
    publishedAt: "2026-07-20",
  },
  {
    slug: "10-idey-albomov",
    tag: "Идеи",
    title: "10 идей альбомов, которые стоит напечатать",
    excerpt:
      "От семейных путешествий до выпускных — подборка форматов, которые чаще всего заказывают наши клиенты.",
    content:
      "Семейный годовой альбом, альбом путешествия, выпускной альбом класса, альбом новорождённого, свадебная книга гостей — печатная фотография остаётся тем, что можно взять в руки и передать по наследству.",
    publishedAt: "2026-06-15",
  },
];

export type Banner = {
  tag: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
};

export const banner: Banner = {
  tag: "Осенняя акция",
  title: "Скидка 15% на фотокниги в сентябре",
  description:
    "Успейте оформить заказ до конца месяца — печать и доставка по Алматы за 3–5 дней.",
  primaryCta: "Выбрать формат",
  secondaryCta: "Как заказать",
};
