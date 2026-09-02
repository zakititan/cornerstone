import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { ThemeProvider } from "@/lib/theme";
import { StoreProvider } from "@/lib/store";
import { captureException, getErrorMessage } from "@/lib/error-capture";
import { GlobalErrorPage } from "@/lib/error-page";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        title: "Launch Plan Buddy — Get your business online",
      },
      {
        name: "description",
        content:
          "A step-by-step guide for small businesses to launch a domain, website, and professional online presence.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  errorComponent: RootErrorBoundary,
  component: RootDocument,
});

function RootErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    captureException(error, { source: "root-route-boundary" });
  }, [error]);

  return (
    <RootDocument>
      <GlobalErrorPage
        error={error}
        retry={reset}
        homeTo="/"
        dashboardTo="/dashboard"
      />
    </RootDocument>
  );
}

function RootDocument({ children }: { children?: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>{children ?? <Outlet />}</StoreProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
