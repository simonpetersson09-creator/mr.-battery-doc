/**
 * Where the user goes after step 5.
 *
 * Pure decision function so the routing rule is testable and lives in exactly
 * one place: the calculation is already done, Premium skips the paywall, every
 * other case sees it.
 */
import type { Entitlements } from "./entitlements";
import { hasResultAccess } from "./entitlements";

export type NextDestination = "/resultat" | "/betalvagg";

export function destinationAfterStep5(args: {
  /** Status of the already executed calculation. */
  calculationStatus: "ok" | "incomplete" | "error";
  entitlements: Entitlements;
  calculationId: string;
  now?: Date;
}): NextDestination {
  // An incomplete or failed calculation has nothing to sell — the result page
  // explains what is missing.
  if (args.calculationStatus !== "ok") return "/resultat";
  return hasResultAccess(args.entitlements, args.calculationId, args.now)
    ? "/resultat"
    : "/betalvagg";
}
