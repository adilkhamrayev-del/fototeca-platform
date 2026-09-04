import { cookies } from "next/headers";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getSessionRole, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const cookieStore = await cookies();
  const role = getSessionRole(cookieStore.get(SESSION_COOKIE_NAME)?.value) ?? "admin";

  return (
    <div className="flex flex-1">
      <AdminSidebar role={role} />
      <div className="min-w-0 flex-1 overflow-x-auto p-8">{children}</div>
    </div>
  );
}
