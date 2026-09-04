"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createArticle,
  deleteArticle,
  updateArticle,
  type ArticleStatus,
} from "@/lib/repo/articles";

function readArticleInput(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    tag: String(formData.get("tag") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    content: String(formData.get("content") ?? ""),
    status: (formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT") as ArticleStatus,
  };
}

function revalidateArticlePaths() {
  revalidatePath("/");
  revalidatePath("/articles");
  revalidatePath("/admin");
  revalidatePath("/admin/articles");
}

export async function createArticleAction(
  _prevState: { error?: string } | undefined,
  formData: FormData,
) {
  const input = readArticleInput(formData);
  if (!input.title.trim()) return { error: "Укажите заголовок" };

  await createArticle(input);
  revalidateArticlePaths();
  redirect("/admin/articles");
}

export async function updateArticleAction(
  id: string,
  _prevState: { success?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const input = readArticleInput(formData);
  if (!input.title.trim()) return { error: "Укажите заголовок" };

  await updateArticle(id, input);
  revalidateArticlePaths();
  return { success: true };
}

export async function deleteArticleAction(id: string) {
  await deleteArticle(id);
  revalidateArticlePaths();
  redirect("/admin/articles");
}
