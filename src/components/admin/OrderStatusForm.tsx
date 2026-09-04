"use client";

import { useActionState } from "react";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orders-shared";

type ActionState = { success?: boolean; error?: string } | undefined;
type ActionFn = (state: ActionState, formData: FormData) => Promise<ActionState>;

const STATUS_ORDER: OrderStatus[] = [
  "AWAITING_PAYMENT",
  "AWAITING_FILES",
  "IN_PRODUCTION",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export default function OrderStatusForm({
  currentStatus,
  action,
}: {
  currentStatus: OrderStatus;
  action: ActionFn;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <select
        name="status"
        defaultValue={currentStatus}
        className="rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Сохраняем…" : "Изменить статус"}
      </button>
      {state?.success && <span className="text-xs font-semibold text-ok">Статус обновлён</span>}
      {state?.error && <span className="text-xs font-semibold text-red-600">{state.error}</span>}
    </form>
  );
}
