import { pool } from "@/lib/db";
import type { Article } from "@/lib/content";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export type ArticleRecord = Article & {
  id: string;
  status: ArticleStatus;
};

type Row = {
  id: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  content: string;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
};

function mapRow(row: Row): ArticleRecord {
  return {
    id: row.id,
    slug: row.slug,
    tag: row.tag,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    status: row.status,
    publishedAt: row.published_at ?? row.created_at,
  };
}

const SELECT = `select id, slug, tag, title, excerpt, content, status, published_at, created_at from articles`;

export async function listPublishedArticles(): Promise<ArticleRecord[]> {
  const { rows } = await pool.query(
    `${SELECT} where status = 'PUBLISHED' order by published_at desc nulls last, created_at desc`,
  );
  return rows.map(mapRow);
}

export async function listAllArticles(): Promise<ArticleRecord[]> {
  const { rows } = await pool.query(`${SELECT} order by created_at desc`);
  return rows.map(mapRow);
}

export async function getArticleBySlug(
  slug: string,
  opts: { onlyPublished?: boolean } = {},
): Promise<ArticleRecord | null> {
  const clause = opts.onlyPublished ? `and status = 'PUBLISHED'` : "";
  const { rows } = await pool.query(`${SELECT} where slug = $1 ${clause}`, [slug]);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getArticleById(id: string): Promise<ArticleRecord | null> {
  const { rows } = await pool.query(`${SELECT} where id = $1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}

function slugify(title: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };
  return title
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function createArticle(input: {
  title: string;
  tag: string;
  excerpt: string;
  content: string;
  status: ArticleStatus;
}): Promise<string> {
  const baseSlug = slugify(input.title) || "article";
  let slug = baseSlug;
  let suffix = 1;
  // avoid slug collisions
  while ((await getArticleBySlug(slug)) !== null) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const { rows } = await pool.query(
    `insert into articles (slug, tag, title, excerpt, content, status, published_at)
     values ($1, $2, $3, $4, $5, $6::article_status, case when $6::text = 'PUBLISHED' then now() else null end)
     returning id`,
    [slug, input.tag, input.title, input.excerpt, input.content, input.status],
  );
  return rows[0].id;
}

export async function updateArticle(
  id: string,
  input: { title: string; tag: string; excerpt: string; content: string; status: ArticleStatus },
): Promise<void> {
  await pool.query(
    `update articles set title = $1, tag = $2, excerpt = $3, content = $4, status = $5::article_status,
       published_at = case
         when $5::text = 'PUBLISHED' and published_at is null then now()
         else published_at
       end,
       updated_at = now()
     where id = $6`,
    [input.title, input.tag, input.excerpt, input.content, input.status, id],
  );
}

export async function deleteArticle(id: string): Promise<void> {
  await pool.query(`delete from articles where id = $1`, [id]);
}
