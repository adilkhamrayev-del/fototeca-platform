import { getBannerForAdmin } from "@/lib/repo/banner";
import BannerForm from "./BannerForm";

export const dynamic = "force-dynamic";

export default async function AdminBannerPage() {
  const banner = await getBannerForAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Баннер на главной</h1>
        <p className="mt-1 text-sm text-text-muted">
          Изменения сразу видны на сайте после сохранения.
        </p>
      </div>
      <BannerForm banner={banner} />
    </div>
  );
}
