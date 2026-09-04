import Link from "next/link";
import { logout } from "@/app/admin/login/actions";
import type { AdminRole } from "@/lib/auth/session";

const navItems = [
  { href: "/admin", label: "Дашборд", enabled: true, adminOnly: true },
  { href: "/admin/orders", label: "Заказы", enabled: true, adminOnly: true },
  { href: "/admin/production", label: "Производство", enabled: true, adminOnly: false },
  { href: "/admin/banner", label: "Баннер", enabled: true, adminOnly: true },
  { href: "/admin/articles", label: "Статьи блога", enabled: true, adminOnly: true },
  { href: "/admin/catalog", label: "Каталог", enabled: true, adminOnly: true },
  { href: "/admin/cover-materials", label: "Варианты обложек", enabled: true, adminOnly: true },
  { href: "/admin/legacy-orders", label: "Архив заказов", enabled: true, adminOnly: true },
  { href: "/admin/clients", label: "Клиенты", enabled: false, adminOnly: true },
  { href: "/admin/roles", label: "Роли", enabled: false, adminOnly: true },
  { href: "/admin/settings", label: "Настройки", enabled: false, adminOnly: true },
];

export default function AdminSidebar({ role = "admin" }: { role?: AdminRole }) {
  const visibleItems = navItems.filter((item) => role === "admin" || !item.adminOnly);

  return (
    <div className="flex w-60 flex-shrink-0 flex-col gap-6 border-r border-border p-5">
      <div className="flex items-center gap-2.5 px-2.5">
        <div className="h-8 w-8 rounded-xl bg-accent" />
        <span className="font-heading text-base font-bold">Fototeca</span>
        {role === "production" && (
          <span className="ml-auto rounded-lg bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-ink">
            Производство
          </span>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {visibleItems.map((item) =>
          item.enabled ? (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-text-muted transition-colors hover:bg-accent-soft hover:text-accent-ink"
            >
              {item.label}
            </Link>
          ) : (
            <span
              key={item.href}
              className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-[13.5px] font-medium text-text-muted/40"
              title="Появится на следующем этапе"
            >
              {item.label}
              <span className="text-[10px]">скоро</span>
            </span>
          ),
        )}
      </nav>

      <div className="mt-auto flex flex-col gap-2 px-1">
        <Link href="/" className="text-xs font-semibold text-accent-ink">
          ← Открыть сайт
        </Link>
        <form action={logout}>
          <button type="submit" className="text-xs font-medium text-text-muted">
            Выйти
          </button>
        </form>
      </div>
    </div>
  );
}
