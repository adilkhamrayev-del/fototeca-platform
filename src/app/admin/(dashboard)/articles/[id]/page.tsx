import { notFound } from "next/navigation";
import ArticleForm from "@/components/admin/ArticleForm";
import { getArticleById } from "@/lib/repo/articles";
import { deleteArticleAction, updateArticleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
}: PageProps<"/admin/articles/[id]">) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) notFound();

  const boundUpdate = updateArticleAction.bind(null, id);
  const boundDelete = deleteArticleAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Редактировать статью</h1>
        <form action={boundDelete}>
          <button type="submit" className="text-xs font-semibold text-red-600">
            Удалить статью
          </button>
        </form>
      </div>
      <ArticleForm article={article} action={boundUpdate} submitLabel="Сохранить" />
    </div>
  );
}
