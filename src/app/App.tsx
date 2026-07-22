import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { useState } from "react";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { routeTree } from "@/routeTree.gen";
import { I18nProvider } from "@/shared/i18n";
import { hasSeenOnboarding } from "@/shared/lib/seenOnboarding";
import { useEdgeSwipeBack } from "@/shared/lib/useEdgeSwipeBack";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ToastProvider } from "@/shared/ui";
import { AuthGate } from "./AuthGate";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/* Route depth ranks used to pick the paging direction: navigating to a deeper
   rank pages forward (in from the right), to a shallower one pages back. Tabs
   share the base level, ordered rooms -> profile. */
const RANKS: Array<[RegExp, number]> = [
  [/^\/$/, 10],
  [/^\/profile\/?$/, 11],
  [/^\/rooms\/new\/?$/, 20],
  [/^\/join\/?$/, 20],
  [/^\/rooms\/[^/]+\/members\/?$/, 40],
  [/^\/rooms\/[^/]+\/board\/?$/, 40],
  [/^\/rooms\/[^/]+\/edit\/?$/, 40],
  [/^\/rooms\/[^/]+\/?$/, 30],
  [/^\/users\/[^/]+\/?$/, 50],
];

export function rankOf(pathname: string): number {
  for (const [re, rank] of RANKS) {
    if (re.test(pathname)) {
      return rank;
    }
  }
  return 15;
}

/* Paging direction per navigation (see global.css). */
const viewTransition = {
  types: ({
    fromLocation,
    toLocation,
  }: {
    fromLocation?: { pathname: string };
    toLocation: { pathname: string };
  }) => {
    if (!fromLocation || fromLocation.pathname === toLocation.pathname) {
      return [];
    }
    const from = rankOf(fromLocation.pathname);
    const to = rankOf(toLocation.pathname);
    const sameLevel = from < 20 && to < 20;
    if (sameLevel) {
      return [to >= from ? "tab-fwd" : "tab-back"];
    }
    return [to >= from ? "forward" : "back"];
  },
};

/* preload route chunks and data on touchstart/hover, before the tap lands */
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

/* Off until the splash is gone, else the first navigation lifts the named nav
   into the transition layer above it. */
function enableViewTransitions() {
  router.update({ ...router.options, defaultViewTransition: viewTransition });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function Shell() {
  useEdgeSwipeBack(router);
  return <RouterProvider router={router} />;
}

export function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [tourOpen, setTourOpen] = useState(() => !hasSeenOnboarding());
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthGate
              onReady={() => {
                enableViewTransitions();
                setSplashDone(true);
              }}
            >
              <Shell />
            </AuthGate>
            <Onboarding open={splashDone && tourOpen} onClose={() => setTourOpen(false)} />
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
