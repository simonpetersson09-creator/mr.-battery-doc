/**
 * SETTINGS — presentation + access actions only.
 *
 * Mirrors the Mr. Solar Doc settings layout: language, Premium, the one-off
 * report, restore / subscription / history rows and legal links. Buying and
 * restoring go through the same gateway as the paywall; nothing here touches
 * the wizard state, the engine or any calculation.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronRight,
  Crown,
  FileText,
  History,
  Loader2,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { clearCalculationCache } from "@/lib/access/calculationCache";
import { useWizard } from "@/state/wizard";
import { lazy, Suspense, useEffect, useState } from "react";
import type { ProductKey } from "@/lib/access/products";
import type { StoreProduct } from "@/lib/access/purchaseGateway";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { useAccess } from "@/state/access";
import { LEGAL_LINKS } from "@/lib/access/legalLinks";
import {
  openExternalUrl,
} from "@/lib/platform/runtime";
import { openManageSubscription } from "@/lib/access/manageSubscription";
import { isDevBuild } from "@/lib/access/devTestMode";

/**
 * Development-only purchase test panel. Rendered only when `isDevBuild()`
 * is true (dev server or the Lovable id-preview host); it renders nothing in
 * the published/App Store build.
 */
const PurchaseTestPanel = lazy(() => import("@/components/dev/PurchaseTestPanel"));

export const Route = createFileRoute("/installningar")({
  head: () => ({
    meta: [
      { title: "Inställningar — Mr. Battery Doc" },
      { name: "description", content: "Språk, Premium, köp och historik." },
      { property: "og:title", content: "Inställningar — Mr. Battery Doc" },
      { property: "og:description", content: "Språk, Premium, köp och historik." },
    ],
  }),
  component: SettingsPage,
});

const PREMIUM_POINTS = ["calculations", "pdf", "full"] as const;

function SettingsPage() {
  const t = useT();
  const access = useAccess();
  const { reset } = useWizard();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"premium" | "restore" | null>(null);
  const [notice, setNotice] = useState<
    "restored" | "restoreNothing" | "manageWeb" | "pending" | "unresolved" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Apple's localized prices — the same source the paywall uses. Never a
  // hardcoded amount.
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [priceAttempt, setPriceAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    void access.loadProducts().then((res) => {
      if (!alive) return;
      setProducts(res.status === "ok" ? res.products : []);
    });
    return () => {
      alive = false;
    };
  }, [access, priceAttempt]);
  const priceOf = (key: ProductKey): string | null =>
    products?.find((p) => p.key === key)?.displayPrice ?? null;
  const premiumPrice = priceOf("premiumYear");
  const singlePrice = priceOf("singleReport");
  const priceFallback =
    products === null ? t("paywall.premium.loadingPrice") : t("paywall.priceUnavailable");

  // Same error mapping as the paywall — a tap must always end in visible feedback.
  const errorText = (code: string): string =>
    t(
      code === "network"
        ? "paywall.errors.network"
        : code === "products-unavailable"
          ? "paywall.errors.products"
          : code === "product-unavailable"
            ? "paywall.errors.productUnavailable"
            : code === "verification"
              ? "paywall.errors.verification"
              : code === "not-supported"
                ? "paywall.errors.notSupported"
                : "paywall.errors.unknown",
    );

  async function buyPremium() {
    setNotice(null);
    setError(null);
    setBusy("premium");
    try {
      // Premium is not tied to a calculation — the id is unused for subscriptions.
      // Every outcome gets a visible answer: silence looks like a dead button.
      const res = await access.purchase("premiumYear", "");
      if (res.status === "purchased") return; // Premium-active state takes over.
      if (res.status === "cancelled") return; // Not an error — user stays here.
      if (res.status === "pending") {
        setNotice("pending");
        return;
      }
      if (res.status === "unresolved") {
        setNotice("unresolved");
        return;
      }
      setError(errorText(res.code));
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setNotice(null);
    setError(null);
    setBusy("restore");
    try {
      const res = await access.restore();
      if (res.status === "restored") setNotice("restored");
      else if (res.status === "nothing") setNotice("restoreNothing");
      else setError(t("paywall.errors.unknown"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell surface-sun max-w-md">
      <main className="pt-safe pb-safe flex-1 px-4">
        <div className="flex items-center gap-3 pt-1">
          <Link
            to="/"
            aria-label={t("common.back")}
            className="flex size-10 items-center justify-center rounded-full bg-foreground text-background"
          >
            <ArrowLeft className="size-4" strokeWidth={2.5} />
          </Link>
          <h1 className="ui-page-title">{t("settings.title")}</h1>
        </div>




        {/* Premium */}
        <section className="relative mt-1.5 rounded-[1rem] bg-brand-yellow px-3 py-2 text-accent-foreground">
          <p className="absolute right-3 top-2.5 text-[9px] font-bold uppercase tracking-wide opacity-70">
            {t("settings.premium.badge")}
          </p>
          <p className="flex items-center gap-1.5 font-display text-[13px] font-bold">
            <Crown className="size-3.5" />
            {t("settings.premium.title")}
          </p>
          <p
            className={`mt-0.5 leading-none ${premiumPrice ? "text-[18px] font-extrabold tabular-nums" : "text-[11px] font-semibold opacity-80"}`}
          >
            {premiumPrice ?? priceFallback}
          </p>
          <ul className="mt-1 space-y-0.5">
            {PREMIUM_POINTS.map((key) => (
              <li key={key} className="flex gap-1.5 text-[10px] leading-snug">
                <Check className="mt-[1px] size-3 shrink-0" />
                <span>{t(`settings.premium.points.${key}`)}</span>
              </li>
            ))}
          </ul>
          {access.premiumActive ? (
            <p className="mt-1.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.75rem] bg-foreground text-[14px] font-bold text-background">
              <BadgeCheck className="size-3.5" />
              {t("settings.premium.active")}
            </p>
          ) : (
            <>
              <Button
                variant="ink"
                className="mt-1.5 h-9 w-full rounded-[0.75rem] text-[14px] font-bold"
                // Never disabled for a missing price: a dead-looking button fails
                // App Review. Tapping without prices retries the store lookup and
                // the purchase itself answers with a visible error if it fails.
                disabled={busy !== null || access.purchaseInFlight}
                onClick={() => {
                  if (products !== null && !premiumPrice) {
                    setProducts(null);
                    setPriceAttempt((n) => n + 1);
                  }
                  void buyPremium();
                }}
              >
                {busy === "premium" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                {busy === "premium" ? t("paywall.processing") : t("settings.premium.cta")}
              </Button>
              <p className="mt-1 text-center text-[10px] leading-snug opacity-80">
                {premiumPrice
                  ? t("paywall.premium.renewal", { price: premiumPrice })
                  : t("settings.premium.renewal")}
              </p>
              {products !== null && !premiumPrice ? (
                <div className="text-center">
                  <Button
                    variant="ghost"
                    className="mt-1 h-7 text-[11px] font-semibold"
                    onClick={() => {
                      setProducts(null);
                      setPriceAttempt((n) => n + 1);
                    }}
                  >
                    {t("paywall.retry")}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* One-off report */}
        <section className="mt-1.5 rounded-[1rem] bg-accent px-3 py-2 text-accent-foreground">
          <p className="font-display text-[13px] font-bold">{t("settings.single.title")}</p>
          <p
            className={`mt-0.5 leading-none ${singlePrice ? "text-[16px] font-extrabold tabular-nums" : "text-[11px] font-semibold opacity-80"}`}
          >
            {singlePrice ?? priceFallback}
          </p>
          <p className="mt-1 text-[10px] leading-snug">{t("settings.single.description")}</p>
          <p className="mt-1.5 flex h-9 w-full items-center justify-center rounded-[0.75rem] bg-foreground/15 text-[14px] font-bold">
            {t("settings.single.cta")}
          </p>
          <p className="mt-1 text-center text-[10px] leading-snug opacity-80">
            {t("settings.single.note")}
          </p>
        </section>

        {/* Action rows */}
        <div className="mt-2 space-y-1.5">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
            disabled={busy !== null}
            onClick={() => void restore()}
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-muted">
              {busy === "restore" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
            </span>
            <span className="flex-1 text-[14px] font-semibold">
              {busy === "restore" ? t("paywall.restoring") : t("settings.restore")}
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() =>
              void openManageSubscription().then((mode) => {
                // The button always does something visible — never a dead tap.
                if (mode === "external") setNotice("manageWeb");
              })
            }
            className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-muted">
              <SlidersHorizontal className="size-4" />
            </span>
            <span className="flex-1 text-[14px] font-semibold">{t("settings.subscription")}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>

          <Link
            to="/historik"
            className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-muted">
              <History className="size-4" />
            </span>
            <span className="flex-1 text-[14px] font-semibold">{t("settings.history")}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>

          {confirmReset ? (
            <div className="rounded-[1rem] border border-border bg-card px-3 py-2.5">
              <p className="text-[13px] font-semibold leading-snug">{t("settings.reset.confirm")}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 flex-1 rounded-[0.75rem] text-[14px] font-semibold"
                  onClick={() => setConfirmReset(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="cta"
                  className="h-9 flex-1 rounded-[0.75rem] text-[14px] font-bold"
                  onClick={() => {
                    clearCalculationCache();
                    reset();
                    setConfirmReset(false);
                    void navigate({ to: "/" });
                  }}
                >
                  {t("common.restart")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
              onClick={() => setConfirmReset(true)}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                <Trash2 className="size-4" />
              </span>
              <span className="flex-1 text-[14px] font-semibold">{t("settings.reset.title")}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          )}

          {LEGAL_LINKS.terms ? (
            <button
              type="button"
              onClick={() => openExternalUrl(LEGAL_LINKS.terms!)}
              className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                <FileText className="size-4" />
              </span>
              <span className="flex-1 text-[14px] font-semibold">{t("settings.terms")}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ) : null}

          {LEGAL_LINKS.privacy ? (
            <button
              type="button"
              onClick={() => openExternalUrl(LEGAL_LINKS.privacy!)}
              className="flex w-full items-center gap-3 rounded-[1rem] border border-border bg-card px-3 py-2.5 text-left"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-muted">
                <ShieldCheck className="size-4" />
              </span>
              <span className="flex-1 text-[14px] font-semibold">{t("settings.privacy")}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
          ) : null}
        </div>

        {notice ? (
          <p className="mt-1.5 text-center text-[11px] font-semibold">{t(`paywall.${notice}`)}</p>
        ) : null}

        {error ? (
          <p className="mt-1.5 text-center text-[11px] font-semibold">{error}</p>
        ) : null}

        {isDevBuild() ? (
          <Suspense fallback={null}>
            <PurchaseTestPanel />
          </Suspense>
        ) : null}

        <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t("settings.version")}
        </p>
      </main>
    </div>
  );
}
