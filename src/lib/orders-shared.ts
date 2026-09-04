// Pure types and constants shared between the server-only order repo
// (src/lib/repo/orders.ts, which imports `pg` via src/lib/db.ts) and client
// components (OrderStatusForm, ProductionBoard) that only need the shapes
// and labels — never the database. Keeping this file free of any server-only
// import is what keeps `pg` out of the client bundle.

export type OrderStatus =
  | "AWAITING_PAYMENT"
  | "AWAITING_FILES"
  | "IN_PRODUCTION"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type ProductionStage = "PRINTING" | "ASSEMBLY" | "COVER" | "DONE";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Ждёт оплаты",
  AWAITING_FILES: "Ждём файлы",
  IN_PRODUCTION: "В производстве",
  READY: "Готов",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
};

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  PRINTING: "Печать",
  ASSEMBLY: "Сборка",
  COVER: "Обложка",
  DONE: "Готово",
};

export const PRODUCTION_STAGE_ORDER: ProductionStage[] = [
  "PRINTING",
  "ASSEMBLY",
  "COVER",
  "DONE",
];

export type ProductionCard = {
  itemId: string;
  orderNumber: string;
  orderId: string;
  itemTitle: string;
  formatName: string;
  coverName: string;
  // e.g. "Синяя рогожка" for a plain Тканевая/Экокожа pick, or "ткань:
  // Синяя рогожка" for Комби (prefixed with which material, since "Комби"
  // alone doesn't say) — null when the cover has no variant popup (Хит2)
  // or no variant was recorded.
  coverVariantLabel: string | null;
  // The customer's own uploaded photo for the other half of a Комби cover
  // — null for every other cover type.
  coverComboPhotoUrl: string | null;
  spreads: number;
  clientName: string;
  productionStage: ProductionStage;
};
