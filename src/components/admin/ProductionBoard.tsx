"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProductionCard, ProductionStage } from "@/lib/orders-shared";
import { PRODUCTION_STAGE_LABELS, PRODUCTION_STAGE_ORDER } from "@/lib/orders-shared";
import { advanceProductionStage } from "@/app/admin/(dashboard)/production/actions";

function nextStage(stage: ProductionStage): ProductionStage | null {
  const idx = PRODUCTION_STAGE_ORDER.indexOf(stage);
  return idx >= 0 && idx < PRODUCTION_STAGE_ORDER.length - 1
    ? PRODUCTION_STAGE_ORDER[idx + 1]
    : null;
}

export default function ProductionBoard({ items }: { items: ProductionCard[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function advance(itemId: string, stage: ProductionStage) {
    setPendingId(itemId);
    startTransition(async () => {
      await advanceProductionStage(itemId, stage);
      setPendingId(null);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PRODUCTION_STAGE_ORDER.map((stage) => {
        const stageItems = items.filter((i) => i.productionStage === stage);
        return (
          <div key={stage} className="flex flex-col gap-3 rounded-3xl border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold">{PRODUCTION_STAGE_LABELS[stage]}</h3>
              <span className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                {stageItems.length}
              </span>
            </div>

            <div className="flex flex-col gap-2.5">
              {stageItems.map((item) => {
                const next = nextStage(item.productionStage);
                return (
                  <div
                    key={item.itemId}
                    className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent-ink">
                        №{item.orderNumber}
                      </span>
                      <Link
                        href={`/admin/orders/${item.orderId}/print`}
                        className="text-[11px] font-semibold text-text-muted underline"
                      >
                        Печать
                      </Link>
                    </div>
                    <p className="text-sm font-medium leading-snug">{item.itemTitle}</p>
                    <p className="text-xs text-text-muted">
                      {item.formatName} · {item.coverName}
                      {item.coverVariantLabel ? ` (${item.coverVariantLabel})` : ""} ·{" "}
                      {item.spreads} разв.
                    </p>
                    <p className="text-xs text-text-muted">{item.clientName}</p>
                    {next && (
                      <button
                        type="button"
                        disabled={isPending && pendingId === item.itemId}
                        onClick={() => advance(item.itemId, next)}
                        className="mt-1 rounded-lg bg-accent px-3 py-2 text-[11.5px] font-semibold text-white disabled:opacity-50"
                      >
                        {isPending && pendingId === item.itemId
                          ? "Сохраняем…"
                          : `→ ${PRODUCTION_STAGE_LABELS[next]}`}
                      </button>
                    )}
                  </div>
                );
              })}
              {stageItems.length === 0 && (
                <p className="px-1 text-xs text-text-muted">Пусто</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
