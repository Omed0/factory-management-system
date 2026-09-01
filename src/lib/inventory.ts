type UnitType = "METER" | "PIECE" | null | undefined;
type T = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Format a quantity (stored as a single integer of "grains") for display.
 *
 * - When `gpc > 0`, splits into cartons + loose grains.
 * - When gpc is null/0, falls back to the unit_type label (m / pcs).
 * - The `t` translator is optional so this helper can be used inside print
 *   HTML where there's no React context. If omitted, returns a compact
 *   ASCII fallback (`5c+3g` or just the number).
 */
export function qtyDisplay(
  qty: number,
  gpc: number | null | undefined,
  unitType?: UnitType,
  t?: T,
): string {
  if (gpc && gpc > 0) {
    const cartons = Math.floor(qty / gpc);
    const grains = qty % gpc;
    if (t) {
      if (grains === 0) return t("inventory.cartons", { count: cartons });
      if (cartons === 0) return t("inventory.grains", { count: grains });
      return t("inventory.cartonsAndGrains", { cartons, grains });
    }
    if (grains === 0) return `${cartons}c`;
    if (cartons === 0) return `${grains}g`;
    return `${cartons}c+${grains}g`;
  }
  if (t && unitType === "METER") return t("inventory.meters", { count: qty });
  if (t && unitType === "PIECE") return t("inventory.pieces", { count: qty });
  return qty.toLocaleString();
}
