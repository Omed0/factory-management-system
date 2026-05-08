export function qtyDisplay(qty: number, gpc: number | null | undefined): string {
  if (!gpc || gpc <= 0) return qty.toLocaleString();
  const cartons = Math.floor(qty / gpc);
  const grains = qty % gpc;
  if (grains === 0) return `${cartons} کارتۆن`;
  if (cartons === 0) return `${grains} دانە`;
  return `${cartons} کارتۆن + ${grains} دانە`;
}
