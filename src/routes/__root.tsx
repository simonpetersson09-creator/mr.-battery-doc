import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { WizardProvider } from "../state/wizard";
import { LanguageProvider } from "../i18n/LanguageProvider";
import { AccessProvider } from "../state/access";
import { isNativePlatform, platformName } from "../lib/platform/runtime";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Mr. Battery Doc" },
      {
        name: "description",
        content: "Hitta rätt batteristorlek och effekt till din fastighet.",
      },
      { name: "theme-color", content: "#FDFBF4" },
      { name: "color-scheme", content: "light" },
      { property: "og:site_name", content: "Mr. Battery Doc" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Outfit:wght@500;600;700;800&display=swap",
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Flags the native WebView so safe-area CSS can drop the web-only minimum inset.
  useEffect(() => {
    const root = document.documentElement;
    if (isNativePlatform()) {
      root.dataset["native"] = "true";
      root.dataset["platform"] = platformName();
      /* Native only: focusing a field must never zoom the WebView, because the
         user has no way to pinch back out inside the app shell. The web build
         keeps its accessible, zoomable viewport. */
      const viewport = document.querySelector('meta[name="viewport"]');
      viewport?.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover",
      );
    } else {
      delete root.dataset["native"];
    }
  }, []);

  // Native iOS only: register the StoreKit adapter before the access layer runs
  // its recovery pass. A no-op in the browser, where purchases do not exist.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let cancelled = false;
    void (async () => {
      const { initNativeStoreKit } = await import("@/lib/access/storekit/cdvPurchase");
      if (cancelled) return;
      // The plugin's global appears once the Cordova bridge has loaded.
      let attempts = 0;
      const tryInit = () => {
        if (cancelled || initNativeStoreKit()) return;
        if (attempts++ < 20) setTimeout(tryInit, 250);
      };
      tryInit();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <WizardProvider>
          <AccessProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </AccessProvider>
        </WizardProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

