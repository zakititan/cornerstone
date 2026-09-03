import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentPageLayout } from "@/components/ContentPage";
import { Button } from "@/components/ui/button";
import { CHANGELOG, type ChangelogEntryData } from "@/lib/support-data";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "What's new — Cornerstone" },
      {
        name: "description",
        content:
          "Recent improvements to the launch roadmap, AI Launch Assistant, tools, setup maps, appearance settings and mobile experience.",
      },
      { property: "og:title", content: "What's new" },
      {
        property: "og:description",
        content: "A running list of improvements to your launch guidance.",
      },
    ],
  }),
  component: ChangelogPage,
});

const VALID_INTERNAL_ROUTES = new Set([
  "/dashboard",
  "/checklist",
  "/business-profile",
  "/onboarding",
  "/online-setup",
  "/domains",
  "/platform-matcher",
  "/content",
  "/business-email",
  "/connect-domain",
  "/launch-wizard",
  "/customer-journey",
  "/preflight",
  "/ownership-record",
  "/security-drill",
  "/launch-dossier",
  "/get-found",
  "/growth-toolkit",
  "/review-kit",
  "/email-signature",
  "/cost-calculator",
  "/maintenance",
  "/learn",
  "/glossary",
  "/troubleshooting",
  "/hire-help",
  "/help",
  "/account",
  "/settings",
  "/how-it-works",
  "/changelog",
  "/status",
  "/contact",
  "/privacy",
  "/terms",
  "/accessibility",
]);

function renderChangelogItem(text: string) {
  const parts = text.split(/(\/[a-z0-9-]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (VALID_INTERNAL_ROUTES.has(part)) {
          return (
            <Link
              key={index}
              to={part}
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              {part}
            </Link>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function ChangelogPage() {
  const [selectedArea, setSelectedArea] = useState<string>("All");

  const availableAreas = useMemo(() => {
    const areas = new Set<string>();
    CHANGELOG.forEach((entry) => areas.add(entry.area));
    return ["All", ...Array.from(areas)];
  }, []);

  const filteredEntries = useMemo(() => {
    if (selectedArea === "All") return CHANGELOG;
    return CHANGELOG.filter((entry) => entry.area === selectedArea);
  }, [selectedArea]);

  return (
    <ContentPageLayout
      eyebrow="Product"
      title="What's new"
      description="Improvements we have shipped recently, newest first."
    >
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        <span className="text-xs text-muted-foreground mr-1">Filter by area:</span>
        {availableAreas.map((area) => {
          const isActive = selectedArea === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setSelectedArea(area)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {area}
            </button>
          );
        })}
      </div>

      <ol className="space-y-4">
        {filteredEntries.map((entry, index) => {
          const isLatest = selectedArea === "All" && index === 0;
          return (
            <li key={entry.version} className="surface-panel space-y-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                  v{entry.version}
                </span>
                {isLatest && (
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold">
                    Latest release
                  </span>
                )}
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {entry.area}
                </span>
                <span className="text-xs text-muted-foreground">{entry.date}</span>
              </div>
              <h2 className="font-display text-lg font-bold">{entry.title}</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {entry.items.map((i) => (
                  <li key={i}>{renderChangelogItem(i)}</li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      <section className="surface-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="font-display text-lg font-bold">Have an idea?</h2>
          <p className="text-sm text-muted-foreground">
            Tell us what would make getting online easier — we read every message.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/contact">Share feedback</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/status">Service status</Link>
          </Button>
        </div>
      </section>
    </ContentPageLayout>
  );
}
