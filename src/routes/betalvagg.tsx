/**
 * PAYWALL — access layer only.
 *
 * The calculation is already finished when the user gets here (it ran when they
 * left step 5) and is kept in the calculation cache. Nothing on this page runs,
 * changes or re-runs the engine, and no control on it opens the locked result
 * without a verified purchase.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { getCalculation } from "@/lib/access/calculationCache";
import { LEGAL_LINKS } from "@/lib/access/legalLinks";
import type { ProductKey } from "@/lib/access/products";
import type { PurchaseErrorCode, StoreProduct } from "@/lib/access/purchaseGateway";
import { useAccess } from "@/state/access";
import { useWizard } from "@/state/wizard";
import logo from "@/assets/mr-battery-doc-logo.png.asset.json";

export const Route = createFileRoute("/betalvagg")({
  head: () => ({
    meta: [
      { title: "Lås upp din batteriberäkning — Mr. Battery Doc" },
      {
        name: "description",
        content:
          "Din batteriberäkning är klar. Lås upp resultatet och din personliga batterirapport.",
      },
      { property: "og:title", content: "Lås upp din batteriberäkning — Mr. Battery Doc" },
      {
        property: "og:description",
        content: "Välj Premium i ett år eller lås upp den här beräkningen och rapporten.",
      },
    ],
  }),
  component: Paywall,
});

const INCLUDES = [
  "size",
  "benefit",
  "selfSufficiency",
  "peak",
  "ancillary",
  "investment",
  "pdf",
] as const;

function Paywall() {
  const t = useT();
  const navigate = useNavigate();
  const { state, hydrated } = useWizard();
  const access = useAccess();

  // Reads the already finished calculation. Same inputs => cache hit => no re-run.
  const calc = useMemo(() => getCalculation(state), [state]);

  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [busy, setBusy] = useState<ProductKey | "restore" | null>(null);
  const [error, setError] = useState<PurchaseErrorCode | null>(null);
  const [notice, setNotice] = useState<
    "pending" | "restored" | "restoreNothing" | "unresolved" | "manageWeb" | null
  >(null);

  // Premium users never linger here; a finished purchase moves straight on.
  useEffect(() => {
    if (!hydrated || !access.hydrated) return;
    if (access.canOpenResult(calc.id)) void navigate({ to: "/resultat" });
  }, [hydrated, access, calc.id, navigate]);

  useEffect(() => {
    let alive = true;
    void access.loadProducts().then((res) => {
      if (!alive) return;
      if (res.status === "ok") setProducts(res.products);
      else setProducts([]);
    });
    return () => {
      alive = false;
    };
  }, [access]);

  const priceOf = (key: ProductKey): string | null =>
    products?.find((p) => p.key === key)?.displayPrice ?? null;

  async function buy(key: ProductKey) {
    setError(null);
    setNotice(null);
    setBusy(key);
    try {
      const res = await access.purchase(key, calc.id);
      if (res.status === "purchased") {
        void navigate({ to: "/resultat" });
        return;
      }
      // Cancelling is not an error — the user simply stays on the paywall.
      if (res.status === "cancelled") return;
      if (res.status === "pending") {
        setNotice("pending");
        return;
      }
      // Paid but not verified by our server yet: never unlocked here, recovery
      // completes it as soon as verification succeeds.
      if (res.status === "unresolved") {
        setNotice("unresolved");
        return;
      }
      setError(res.code);
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    setError(null);
    setNotice(null);
    setBusy("restore");
    try {
      const res = await access.restore();
      if (res.status === "restored") {
        setNotice("restored");
        void navigate({ to: "/resultat" });
      } else if (res.status === "nothing") setNotice("restoreNothing");
      else setError(res.code);
    } finally {
      setBusy(null);
    }
  }

  const errorText = error
    ? t(
        error === "network"
          ? "paywall.errors.network"
          : error === "products-unavailable"
            ? "paywall.errors.products"
            : error === "product-unavailable"
              ? "paywall.errors.productUnavailable"
              : error === "verification"
                ? "paywall.errors.verification"
                : error === "not-supported"
                  ? "paywall.errors.notSupported"
                  : "paywall.errors.unknown",
      )
    : null;

  // Apple's localized price is the ONLY price shown. Until StoreKit answers the
  // paywall shows a neutral loading label — never a hardcoded SEK amount, since
  // the app also sells in FI, DE and DK.
  const premiumPrice = priceOf("premiumYear");
  const singlePrice = priceOf("singleReport");

  return (
    <div className="app-shell surface-sun">
      <main className="pt-safe flex-1 px-4 pb-4">
        <div className="flex items-center justify-between pt-1">
          <h1 className="ui-page-title">{t("paywall.title")}</h1>
          <img
            src={logo.url}
            alt="Mr. Battery Doc"
            className="h-14 w-auto"
            width={1536}
            height={1024}
          />
        </div>

        <p className="ui-help mt-1">{t("paywall.subtitle")}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <CheckCircle2 className="size-4 text-accent" />
          {t("paywall.ready")}
        </p>

        <section className="mt-3 rounded-[1rem] border border-border bg-card px-3 py-3">
          <p className="text-[12px] font-semibold">{t("paywall.includesTitle")}</p>
          <ul className="mt-1.5 space-y-1">
            {INCLUDES.map((key) => (
              <li key={key} className="flex gap-2 text-[11px] leading-relaxed">
                <Check className="mt-[2px] size-3.5 shrink-0" />
                <span>{t(`paywall.includes.${key}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Premium — visually recommended */}
        <section
          className="mt-3 rounded-[1rem] border-2 border-accent px-3 py-3"
          style={{ background: "var(--surface-level-secondary)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[14px] font-bold">{t("paywall.premium.label")}</p>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
              {t("paywall.premium.badge")}
            </span>
          </div>
          <p
            className={`mt-1 leading-none ${premiumPrice ? "text-[20px] font-extrabold tabular-nums" : "text-[13px] font-semibold text-muted-foreground"}`}
          >
            {premiumPrice ?? t("paywall.premium.loadingPrice")}
          </p>
          <p className="ui-help mt-1">{t("paywall.premium.description")}</p>
          <Button
            variant="cta"
            className="mt-2 h-10 w-full rounded-[0.75rem] text-[15px] font-bold shadow-cta"
            disabled={busy !== null || access.purchaseInFlight}
            onClick={() => void buy("premiumYear")}
          >
            {busy === "premiumYear" ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("paywall.premium.cta")}
          </Button>
          <p className="ui-help mt-1.5">{t("paywall.premium.value")}</p>
          {premiumPrice ? (
            <p className="ui-help mt-1">{t("paywall.premium.renewal", { price: premiumPrice })}</p>
          ) : null}
        </section>

        {/* One-off report — this calculation only */}
        <section className="mt-2 rounded-[1rem] border border-border bg-card px-3 py-3">
          <p className="font-display text-[14px] font-semibold">{t("paywall.single.label")}</p>
          <p
            className={`mt-1 leading-none ${singlePrice ? "text-[18px] font-extrabold tabular-nums" : "text-[13px] font-semibold text-muted-foreground"}`}
          >
            {singlePrice ?? t("paywall.single.loadingPrice")}
          </p>
          <p className="ui-help mt-1">{t("paywall.single.description")}</p>
          <Button
            variant="outline"
            className="mt-2 h-10 w-full rounded-[0.75rem] text-[15px] font-semibold"
            disabled={busy !== null || access.purchaseInFlight}
            onClick={() => void buy("singleReport")}
          >
            {busy === "singleReport" ? <Loader2 className="size-4 animate-spin" /> : null}
            {singlePrice
              ? t("paywall.single.cta", { price: singlePrice })
              : t("paywall.single.ctaPending")}
          </Button>
        </section>

        {products !== null && products.length === 0 ? (
          <p className="ui-help mt-2 text-center">{t("paywall.priceUnavailable")}</p>
        ) : null}

        {notice ? (
          <p className="mt-2 text-center text-[11px] font-semibold">
            {t(`paywall.${notice}`)}
          </p>
        ) : null}

        {errorText ? (
          <div className="mt-2 rounded-[0.75rem] border border-border bg-card px-3 py-2 text-center">
            <p className="text-[11px] font-semibold">{errorText}</p>
          </div>
        ) : null}

        <div className="pb-safe mt-4 space-y-2">
          <Button
            variant="ghost"
            className="h-9 w-full text-[13px] font-semibold"
            disabled={busy !== null || access.purchaseInFlight}
            onClick={() => void restore()}
          >
            {busy === "restore" ? t("paywall.restoring") : t("paywall.restore")}
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full rounded-[0.75rem] text-[15px] font-semibold"
            onClick={() => void navigate({ to: "/ekonomi" })}
          >
            {t("paywall.back")}
          </Button>
          {LEGAL_LINKS.terms || LEGAL_LINKS.privacy ? (
            <p className="flex justify-center gap-3 text-[11px] text-muted-foreground">
              {LEGAL_LINKS.terms ? (
                <a href={LEGAL_LINKS.terms} target="_blank" rel="noreferrer">
                  {t("paywall.legal.terms")}
                </a>
              ) : null}
              {LEGAL_LINKS.privacy ? (
                <a href={LEGAL_LINKS.privacy} target="_blank" rel="noreferrer">
                  {t("paywall.legal.privacy")}
                </a>
              ) : null}
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
