import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { I18nProvider } from "@/shared/i18n";
import { ThemeProvider } from "@/shared/theme/ThemeProvider";
import { ToastProvider } from "@/shared/ui";
import { AuthGate } from "./AuthGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

/* preload route chunks and data on touchstart/hover, before the tap lands */
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthGate>
              <RouterProvider router={router} />
            </AuthGate>
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
