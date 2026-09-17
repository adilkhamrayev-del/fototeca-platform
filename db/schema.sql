-- Fototeca platform — database schema.
--
-- Applied directly with psql (see package.json "db:migrate") rather than
-- through an ORM migration tool: the self-hosted target server may have
-- limited or no internet access, and Prisma's classic CLI needs to download
-- a native query-engine binary at generate/migrate time — a fragile
-- dependency for an offline local server. Plain SQL + the `pg` driver has no
-- such requirement; `prisma/schema.prisma` is kept as a readable reference
-- of the same model (ERD-style documentation), not as the source of truth.
--
-- Safe to re-run: every statement is idempotent.

create extension if not exists pgcrypto;

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  title text not null,
  description text not null,
  primary_cta text not null,
  secondary_cta text not null,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  is_published boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Earlier installs created this table with an "image_url" column, before
-- video support existed; rename it in place rather than losing the data.
-- The exception guards a fresh install (create table above already named
-- the column media_url, so there's nothing to rename) and a re-run after
-- the rename already happened once.
do $$ begin
  alter table banners rename column image_url to media_url;
exception when undefined_column then null;
end $$;

alter table banners add column if not exists media_type text check (media_type in ('image', 'video'));

do $$ begin
  create type article_status as enum ('DRAFT', 'PUBLISHED');
exception when duplicate_object then null;
end $$;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  tag text not null,
  title text not null,
  excerpt text not null,
  content text not null,
  cover_image_url text,
  status article_status not null default 'DRAFT',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  price_from integer not null,
  cover_image_url text,
  gradient_from text not null default 'oklch(84% 0.05 40)',
  gradient_to text not null default 'oklch(64% 0.07 32)',
  requires_upload boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog_formats (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references catalog_items(id) on delete cascade,
  name text not null,
  width_px integer not null,
  height_px integer not null,
  price_per_spread integer not null,
  min_spreads integer not null default 1,
  max_spreads integer not null default 60,
  sort_order integer not null default 0
);

-- Admin edits a format's physical size (mm) and target resolution (dpi),
-- not raw pixels directly — width_px/height_px above stay the source of
-- truth everywhere else (file-upload validation, the "prepare your file at
-- N×M px" copy on the order page), just derived from mm+dpi on every save
-- instead of typed in by hand. Backfill below assumes the width_px/height_px
-- already in the table were produced at 254 dpi (100 px per cm — how this
-- catalog's seed data was originally sized) so existing formats keep their
-- exact current px after this migration; nothing changes for anyone
-- uploading files against them until an admin explicitly re-saves a format
-- with a new mm/dpi combination.
alter table catalog_formats add column if not exists width_mm numeric(7,1);
alter table catalog_formats add column if not exists height_mm numeric(7,1);
alter table catalog_formats add column if not exists dpi integer not null default 300;

update catalog_formats set width_mm = width_px / 10.0, height_mm = height_px / 10.0, dpi = 254
where width_mm is null;

alter table catalog_formats alter column width_mm set not null;
alter table catalog_formats alter column height_mm set not null;

-- Хит2 / Тканевая / Экокожа / Комби — single-level choice per format.
create table if not exists cover_options (
  id uuid primary key default gen_random_uuid(),
  catalog_format_id uuid not null references catalog_formats(id) on delete cascade,
  name text not null,
  price_modifier integer not null default 0,
  gradient_from text not null default 'oklch(84% 0.05 40)',
  gradient_to text not null default 'oklch(64% 0.07 32)',
  sort_order integer not null default 0
);

-- Real preview photo of the cover material, shown instead of the gradient
-- swatch once an admin uploads one (see /admin/catalog/[id]).
alter table cover_options add column if not exists image_url text;

-- What kind of material-variant picker (if any) this cover option opens on
-- the order page: 'tkanevaya'/'ekokozha' show a single popup of that
-- material's site-wide variant swatches (see cover_material_variants
-- below); 'kombi' shows two pickers (one tkanevaya + one ekokozha variant);
-- 'none' (Хит2 and anything else) selects directly, no popup. Backfilled
-- from each option's existing name — only fills rows where the column was
-- just added, so an admin's later choice here is never overwritten by a
-- re-run of this migration.
alter table cover_options add column if not exists variant_kind text;

update cover_options set variant_kind =
  case
    when lower(name) like '%тканев%' then 'tkanevaya'
    when lower(name) like '%экокож%' then 'ekokozha'
    when lower(name) like '%комби%' then 'kombi'
    else 'none'
  end
where variant_kind is null;

alter table cover_options alter column variant_kind set default 'none';
alter table cover_options alter column variant_kind set not null;

do $$ begin
  alter table cover_options add constraint cover_options_variant_kind_check
    check (variant_kind in ('none', 'tkanevaya', 'ekokozha', 'kombi'));
exception when duplicate_object then null;
end $$;

-- Site-wide swatches for the "Тканевая"/"Экокожа" variant popups — one
-- shared list per material, not per catalog item/format (so e.g. the same
-- "Синяя рогожка" fabric shows up identically for every book). Комби picks
-- one row from each material list; its own preview photo stays on the
-- cover_options row above (one photo for the whole "Комби" type, not per
-- combination — see claude/spisok-zadach.md).
create table if not exists cover_material_variants (
  id uuid primary key default gen_random_uuid(),
  material text not null check (material in ('tkanevaya', 'ekokozha')),
  name text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text,
  created_at timestamptz not null default now()
);

do $$ begin
  create type order_status as enum (
    'AWAITING_PAYMENT', 'AWAITING_FILES', 'IN_PRODUCTION', 'READY', 'COMPLETED', 'CANCELLED'
  );
exception when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  client_id uuid not null references clients(id),
  status order_status not null default 'AWAITING_PAYMENT',
  total_amount integer not null,
  legacy_order_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order numbers mimic the legacy journal's look (year + zero-padded
-- sequence, e.g. "2026000001") rather than a random id, since staff read
-- and search by this number.
create sequence if not exists order_number_seq start 1;

do $$ begin
  create type production_stage as enum ('PRINTING', 'ASSEMBLY', 'COVER', 'DONE');
exception when duplicate_object then null;
end $$;

-- One row per configured item in an order (today: always one, since the
-- configurator handles a single catalog item at a time). Kept separate from
-- `orders` because the legacy system tracks production per item, with its
-- own stage and its own uploaded files — see claude/audit-sistemy-zakazov.md §5.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  catalog_item_id uuid not null references catalog_items(id),
  catalog_format_id uuid not null references catalog_formats(id),
  cover_option_id uuid not null references cover_options(id),
  spreads integer not null,
  endpapers boolean not null default false,
  packaging boolean not null default false,
  express boolean not null default false,
  price integer not null,
  upload_draft_id text,
  production_stage production_stage not null default 'PRINTING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which material swatch the customer picked, for cover options with
-- variant_kind = 'tkanevaya'/'ekokozha' (a plain pick) or 'kombi' (the one
-- fabric-or-eco-leather sub-variant the customer chose for the "material"
-- half of a Комби cover). All null for plain options like Хит2.
-- `on delete set null` (rather than restrict) so an admin can still retire
-- an old swatch without that blocking deletion — the order keeps its other
-- cover details either way.
alter table order_items add column if not exists cover_variant_id uuid references cover_material_variants(id) on delete set null;

-- Earlier version of this feature had the customer pick one fabric AND one
-- eco-leather variant for Комби; superseded by cover_variant_id (one
-- material, either fabric or eco-leather) + cover_combo_photo_url below —
-- no real order ever used these, so they're dropped rather than kept dead.
alter table order_items drop column if exists cover_variant_kombi_tkanevaya_id;
alter table order_items drop column if exists cover_variant_kombi_ekokozha_id;

-- Комби = one material sub-variant (cover_variant_id above) for part of the
-- cover, plus a photo the customer uploads at order time for the other part
-- — this is per-order customer content, not an admin-managed swatch, so it
-- lives here rather than in cover_material_variants/cover_options.
alter table order_items add column if not exists cover_combo_photo_url text;

-- Alternative to uploading spread photos through /api/upload: the customer
-- pastes a link (Google Drive/Yandex Disk/WeTransfer/etc.) where the admin
-- can download the files from instead. Costs FILE_LINK_SURCHARGE (see
-- OrderConfigurator.tsx) extra, already folded into order_items.price —
-- this column is just the link text for the admin to open, not a separate
-- charge record.
alter table order_items add column if not exists file_link_url text;

-- Durable, web-servable URLs for each spread photo the customer uploaded
-- through /api/upload, in page order — see uploadSpreadPhoto in
-- media-storage.ts. Empty when the customer used file_link_url instead.
-- These are what let admin (and the customer's own /account order
-- history, see src/app/account) actually see/download the files: the
-- on-disk copy finalizeOrderFiles moves around (order-storage.ts) lives
-- under STORAGE_ROOT, which is /tmp on Vercel and never durable there.
alter table order_items add column if not exists spread_photo_urls jsonb not null default '[]'::jsonb;

-- "Виньетка" (выпускные альбомы, slug vypusknye-albomy) uploads its files in
-- three separate blocks instead of just one — обложки / общие файлы /
-- индивидуальные развороты. spread_photo_urls above already covers the
-- individual-spreads block (376×270мм @ 300dpi, same dimension check as any
-- other catalog item's spreads); these two columns are the other two
-- blocks. Empty jsonb arrays for every other catalog item, which has no use
-- for them. See OrderConfigurator.tsx's isVignette branch.
alter table order_items add column if not exists cover_photo_urls jsonb not null default '[]'::jsonb;
alter table order_items add column if not exists common_file_urls jsonb not null default '[]'::jsonb;

-- Site-wide swatches for the box-lining picker shown when a customer checks
-- "Подарочная упаковка" (packaging on order_items below) — bархат/велюр are
-- an internal lining material for the gift box itself, unrelated to
-- cover_material_variants above (which is the book's own cover). Same
-- shape/pattern as cover_material_variants deliberately, for UI reuse —
-- see /admin/box-materials.
create table if not exists box_material_variants (
  id uuid primary key default gen_random_uuid(),
  material text not null check (material in ('barkhat', 'velur')),
  name text not null,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Which box-lining swatch the customer picked when packaging = true. Null
-- when packaging is false, or when packaging is true but no swatches were
-- configured yet (picker only shows/requires a choice once at least one
-- swatch exists — same "don't block on empty admin data" rule as
-- cover_variant_id). `on delete set null` so retiring a swatch never blocks
-- deleting it.
alter table order_items add column if not exists box_material_id uuid references box_material_variants(id) on delete set null;

-- Archive of orders imported from the old XAF system (zakaz.fototeca.kz).
-- Deliberately NOT forced into orders/order_items: the legacy journal is
-- free-form (one text field for delivery info, product names as plain
-- text, no catalog_item/format/cover_option references), and re-deriving
-- structured foreign keys for ~15 years of historical records would be
-- guesswork. This table preserves the legacy record as-is, linked to the
-- new `clients` table by phone, so old orders stay searchable and visible
-- against a client's history without pretending they fit the new model.
create table if not exists legacy_orders (
  id uuid primary key default gen_random_uuid(),
  legacy_number text not null unique,
  legacy_date timestamptz,
  client_id uuid references clients(id),
  department text,
  contractor_name text,
  cell_number text,
  order_amount numeric,
  amount_to_pay numeric,
  amount_paid numeric,
  email text,
  executor text,
  due_date date,
  delivery_info text,
  kaspi_number text,
  hold_reason text,
  raw_status text,
  line_items jsonb,
  imported_at timestamptz not null default now()
);

create index if not exists legacy_orders_client_id_idx on legacy_orders(client_id);

-- "Широкоформатная печать" — a fundamentally different catalog item shape:
-- the customer types their own width/height (cm) rather than picking from a
-- fixed list of formats, and price is computed from area and/or perimeter
-- instead of a per-spread rate. product_kind discriminates which admin
-- editor and which order-page configurator a catalog item renders — see
-- CatalogFormatsEditor vs WideFormatOptionsEditor, OrderConfigurator vs
-- WideFormatConfigurator.
alter table catalog_items add column if not exists product_kind text not null default 'standard';

do $$ begin
  alter table catalog_items add constraint catalog_items_product_kind_check
    check (product_kind in ('standard', 'wide_format'));
exception when duplicate_object then null;
end $$;

-- One row per selectable type under a 'wide_format' catalog item (e.g.
-- "Печать холстов" priced by area, "Изготовление картин" priced by
-- perimeter + area) — admin-configurable rates, no fixed sizes.
create table if not exists wide_format_options (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references catalog_items(id) on delete cascade,
  name text not null,
  pricing_mode text not null check (pricing_mode in ('area', 'perimeter_area')),
  price_per_sqm integer not null default 0,
  price_per_meter integer not null default 0,
  min_width_cm integer not null default 10,
  max_width_cm integer not null default 300,
  min_height_cm integer not null default 10,
  max_height_cm integer not null default 300,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Real preview photo for this type (e.g. a sample canvas print), same idea
-- as cover_options.image_url — shown on the order page's type picker once
-- an admin uploads one.
alter table wide_format_options add column if not exists image_url text;

-- A wide-format order_items row has no catalog_format_id/cover_option_id
-- (there's no fixed format/cover to pick) — made nullable so both "kinds"
-- of order_items row can share the same table. The check constraint below
-- enforces exactly one kind per row.
alter table order_items alter column catalog_format_id drop not null;
alter table order_items alter column cover_option_id drop not null;

alter table order_items add column if not exists wide_format_option_id uuid references wide_format_options(id);
alter table order_items add column if not exists width_cm integer;
alter table order_items add column if not exists height_cm integer;
-- Customer's single uploaded print file for a wide-format order — see
-- uploadWideFormatFile in media-storage.ts. Surfaced through the same
-- spread_photo_urls array everywhere the order is displayed (admin order
-- page, print blank, production board, /account) rather than adding new
-- display code for a third file field.
alter table order_items add column if not exists print_file_url text;

do $$ begin
  alter table order_items add constraint order_items_kind_check
    check (
      (catalog_format_id is not null and cover_option_id is not null and wide_format_option_id is null)
      or
      (catalog_format_id is null and wide_format_option_id is not null)
    );
exception when duplicate_object then null;
end $$;
