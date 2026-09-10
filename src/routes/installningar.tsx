/**
 * SETTINGS — presentation + access actions only.
 *
 * Mirrors the Mr. Solar Doc settings layout: language, Premium, the one-off
 * report, restore / subscription / history rows and legal links. Buying and
 * restoring go through the same gateway as the paywall; nothing here touches
 * the wizard state, the engine or any calculation.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageSelect } from "@/components/LanguageSelect";
import { useT } from "@/i18n";
import { useAccess } from "@/state/access";
import { LEGAL_LINKS } from "@/lib/access/legalLinks";
import {
  openExternalUrl,
} from "@/lib/platform/runtime";
import { openManageSubscription } from "@/lib/access/manageSubscription";

/**
 * Development-only purchase test panel. The dynamic import sits behind
 * `import.meta.env.DEV`, so the component is tree-shaken out of the production
 * bundle and never rendered in the App Store build.
 */
const PurchaseTestPanel = import.meta.env.DEV
  ? lazy(() => import("@/components/dev/PurchaseTestPanel"))
  : null;

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
  const [busy, setBusy] = useState<"premium" | "restore" | null>(null);
  const [notice, setNotice] = useState<
    "restored" | "restoreNothing" | "manageWeb" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  

  async function buyPremium() {
    setNotice(null);
    setBusy("premium");
    try {
      // Premium is not tied to a calculation — the id is unused for subscriptions.
      await access.purchase("premiumYear", "");
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

        {/* Language */}
        <section className="mt-2 rounded-[1rem] bg-accent px-3 py-2.5 text-accent-foreground">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-[14px] font-bold">{t("settings.languageTitle")}</p>
            <LanguageSelect pill />
          </div>
          <p className="mt-1 text-[11px] leading-relaxed opacity-80">
            {t("settings.languageHint")}
          </p>
        </section>

        {/* Premium */}
        <section className="relative mt-1.5 rounded-[1rem] bg-accent px-3 py-2.5 text-accent-foreground">
          <p className="absolute right-3 top-3 text-[10px] font-bold uppercase tracking-wide opacity-70">
            {t("settings.premium.badge")}
          </p>
          <p className="flex items-center gap-1.5 font-display text-[14px] font-bold">
            <Crown className="size-4" />
            {t("settings.premium.title")}
          </p>
          <ul className="mt-1 space-y-0.5">
            {PREMIUM_POINTS.map((key) => (
              <li key={key} className="flex gap-2 text-[11px] leading-relaxed">
                <Check className="mt-[2px] size-3.5 shrink-0" />
                <span>{t(`settings.premium.points.${key}`)}</span>
              </li>
            ))}
          </ul>
          {access.premiumActive ? (
            <p className="mt-1.5 flex h-10 w-full items-center justify-center gap-1.5 rounded-[0.75rem] bg-foreground text-[15px] font-bold text-background">
              <BadgeCheck className="size-4" />
              {t("settings.premium.active")}
            </p>
          ) : (
            <>
              <Button
                variant="ink"
                className="mt-2 h-10 w-full rounded-[0.75rem] text-[15px] font-bold"
                disabled={busy !== null}
                onClick={() => void buyPremium()}
              >
                {busy === "premium" ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("settings.premium.cta")}
              </Button>
              <p className="mt-1 text-center text-[11px] leading-relaxed opacity-80">
                {t("settings.premium.renewal")}
              </p>
            </>
          )}
        </section>

        {/* One-off report */}
        <section className="mt-1.5 rounded-[1rem] bg-accent px-3 py-2.5 text-accent-foreground">
          <p className="font-display text-[14px] font-bold">{t("settings.single.title")}</p>
          <p className="mt-1 text-[11px] leading-relaxed">{t("settings.single.description")}</p>
          <p className="mt-1.5 flex h-10 w-full items-center justify-center rounded-[0.75rem] bg-foreground/15 text-[15px] font-bold">
            {t("settings.single.cta")}
          </p>
          <p className="mt-1 text-center text-[11px] leading-relaxed opacity-80">
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

        {PurchaseTestPanel ? (
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
