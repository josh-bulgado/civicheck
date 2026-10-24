/** An amount in pesos with its centavos, e.g. "₱1,100.00". Fixed locale so the server and browser agree. */
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
