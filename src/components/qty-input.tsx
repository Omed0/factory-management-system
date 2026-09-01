import * as React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Unit = "METER" | "PIECE" | null;

type Props = {
  /** Items per carton. When set (>0), the input renders two fields. */
  grainsPerCarton: number | null | undefined;
  /** Used for the single-field label when there's no carton concept. */
  unitType?: Unit;
  /** Total items (grains) — single source of truth, what the DB stores. */
  value: number;
  /** Called whenever the user changes either field. Receives total grains. */
  onChange: (grains: number) => void;
  disabled?: boolean;
  className?: string;
  /** When true, allows negative values for warehouse adjustments. */
  allowNegative?: boolean;
  /** When true, hides per-field labels (use inside dense grids). */
  compact?: boolean;
};

/**
 * Quantity input that hides carton/grain math from forms.
 *
 * - When `grainsPerCarton > 0`, renders two fields: cartons + loose grains.
 *   Stores `cartons * gpc + loose` as the single integer in `value`.
 * - When gpc is null/0, renders a single field labeled by `unitType` (m / pcs)
 *   or just "Quantity" if unset.
 *
 * Single source of truth is the `value` (total grains). Both internal fields
 * are derived from it on every render — never store them in local state, or
 * the displayed cartons/grains will drift from the DB-bound number on edits.
 */
export function QtyInput({
  grainsPerCarton,
  unitType,
  value,
  onChange,
  disabled,
  className,
  allowNegative = false,
  compact = false,
}: Props) {
  const { t } = useTranslation();
  const gpc = grainsPerCarton && grainsPerCarton > 0 ? grainsPerCarton : 0;

  if (gpc > 0) {
    const sign = value < 0 ? -1 : 1;
    const abs = Math.abs(value);
    const cartons = Math.floor(abs / gpc);
    const grains = abs % gpc;

    const update = (nextCartons: number, nextGrains: number) => {
      const total = sign * (Math.max(0, nextCartons) * gpc + Math.max(0, nextGrains));
      onChange(total);
    };

    return (
      <div className={cn("flex items-end gap-2", className)}>
        <div className={cn("grid gap-1 flex-1", compact && "gap-0")}>
          {!compact && (
            <label className="text-xs text-muted-foreground">
              {t("inventory.cartonsLabel")} ({t("inventory.perCarton", { count: gpc })})
            </label>
          )}
          <Input
            type="number"
            min={0}
            disabled={disabled}
            value={cartons === 0 && abs === 0 ? "" : cartons}
            onChange={(e) =>
              update(e.target.value === "" ? 0 : Number(e.target.value), grains)
            }
            placeholder={compact ? `${t("inventory.cartonsLabel")}` : "0"}
            title={t("inventory.cartonsLabel")}
          />
        </div>
        <div className={cn("grid gap-1 flex-1", compact && "gap-0")}>
          {!compact && (
            <label className="text-xs text-muted-foreground">
              {t("inventory.grainsLabel")}
            </label>
          )}
          <Input
            type="number"
            min={0}
            max={gpc - 1}
            disabled={disabled}
            value={grains === 0 && abs === 0 ? "" : grains}
            onChange={(e) =>
              update(cartons, e.target.value === "" ? 0 : Number(e.target.value))
            }
            placeholder={compact ? `${t("inventory.grainsLabel")}` : "0"}
            title={t("inventory.grainsLabel")}
          />
        </div>
        {allowNegative && (
          <div className="grid gap-1">
            <label className="text-xs text-muted-foreground">
              {t("inventory.direction")}
            </label>
            <select
              disabled={disabled}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={value < 0 ? "-" : "+"}
              onChange={(e) => {
                const newSign = e.target.value === "-" ? -1 : 1;
                onChange(newSign * abs);
              }}
            >
              <option value="+">+ {t("inventory.add")}</option>
              <option value="-">− {t("inventory.remove")}</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  // Single-field mode (no gpc set)
  const singleLabel =
    unitType === "METER"
      ? t("inventory.metersLabel")
      : unitType === "PIECE"
        ? t("inventory.piecesLabel")
        : t("inventory.quantityLabel");

  if (allowNegative) {
    const sign = value < 0 ? -1 : 1;
    const abs = Math.abs(value);
    return (
      <div className={cn("flex items-end gap-2", className)}>
        <div className="grid gap-1 flex-1">
          <label className="text-xs text-muted-foreground">{singleLabel}</label>
          <Input
            type="number"
            min={0}
            disabled={disabled}
            value={abs === 0 ? "" : abs}
            onChange={(e) =>
              onChange(sign * (e.target.value === "" ? 0 : Number(e.target.value)))
            }
          />
        </div>
        <div className="grid gap-1">
          <label className="text-xs text-muted-foreground">
            {t("inventory.direction")}
          </label>
          <select
            disabled={disabled}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={value < 0 ? "-" : "+"}
            onChange={(e) => {
              const newSign = e.target.value === "-" ? -1 : 1;
              onChange(newSign * abs);
            }}
          >
            <option value="+">+ {t("inventory.add")}</option>
            <option value="-">− {t("inventory.remove")}</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("grid gap-1", className)}>
      {!compact && (
        <label className="text-xs text-muted-foreground">{singleLabel}</label>
      )}
      <Input
        type="number"
        min={0}
        disabled={disabled}
        value={value === 0 ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? 0 : Number(e.target.value))
        }
        placeholder={compact ? singleLabel : undefined}
        title={singleLabel}
      />
    </div>
  );
}
