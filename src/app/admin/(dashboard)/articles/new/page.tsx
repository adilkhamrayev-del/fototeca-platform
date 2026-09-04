import ArticleForm from "@/components/admin/ArticleForm";
import { createArticleAction } from "../actions";

export default function NewArticlePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Новая статья</h1>
      <ArticleForm action={createArticleAction} submitLabel="Создать" />
    </div>
  );
}
