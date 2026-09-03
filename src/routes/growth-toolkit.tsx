import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Gauge, Link2, MonitorCheck, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Callout } from "@/components/Callouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/growth-toolkit")({
  head: () => ({
    meta: [
      { title: "Growth toolkit — Cornerstone" },
      {
        name: "description",
        content: "Simple, local-first tools to check, share and grow your website.",
      },
    ],
  }),
  component: GrowthToolkit,
});

const PROVIDERS = [
  ["Cloudflare", "DNS, HTTPS and email-safe record management", "https://dash.cloudflare.com"],
  [
    "Google Business Profile",
    "Local listing, hours, photos and reviews",
    "https://business.google.com",
  ],
  [
    "Google Search Console",
    "Indexing, sitemap and search queries",
    "https://search.google.com/search-console",
  ],
  ["Your website platform", "Run a mobile, form and checkout smoke test", ""],
] as const;

function GrowthToolkit() {
  const { state } = useStore();
  const domain = state.business.preferredDomain || state.business.ownedDomain || "yourbusiness.com";
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("spring-launch");
  const [checks, setChecks] = useState<Record<string, string>>({});

  const campaignUrl = useMemo(() => {
    const base = state.business.websiteUrl?.trim() || `https://${domain}`;
    const params = new URLSearchParams({
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
    });
    return `${base.replace(/\/$/, "")}?${params.toString()}`;
  }, [campaign, domain, medium, source, state.business.websiteUrl]);

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Copy is unavailable in this browser. Select the text and copy it instead.");
    }
  };

  const recordCheck = (id: string) => {
    setChecks((prev) => ({ ...prev, [id]: new Date().toISOString() }));
    toast.success("Check recorded on this device.");
  };

  return (
    <AppShell
      title="Growth toolkit"
      description="Small, practical tools for after launch — all local-first."
    >
      <div className="space-y-6">
        <Callout tone="info" title="No passwords or secrets belong here">
          These tools help you prepare and record checks. They do not log into providers or change
          DNS automatically.
        </Callout>

        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">UTM campaign link builder</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Measure which posts and messages bring visitors. Use lowercase words with hyphens.
              </p>
            </div>
            <Link2 className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="utm-source">Source</Label>
              <Input id="utm-source" value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="utm-medium">Medium</Label>
              <Input id="utm-medium" value={medium} onChange={(e) => setMedium(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="utm-campaign">Campaign</Label>
              <Input
                id="utm-campaign"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="min-w-0 flex-1 break-all rounded-md bg-muted p-3 text-xs">
              {campaignUrl}
            </code>
            <Button
              variant="outline"
              onClick={() => void copy(campaignUrl, "Campaign link copied.")}
            >
              <Copy className="size-4" /> Copy link
            </Button>
          </div>
        </section>

        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Launch health checks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Record a repeatable monthly review. The timestamp stays in this browser.
              </p>
            </div>
            <MonitorCheck className="size-5 text-primary" aria-hidden="true" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["site", "Open the site on a phone and desktop"],
              ["forms", "Submit every contact, booking or order form"],
              ["email", "Send a test email and check it reaches the inbox"],
              ["renewal", "Confirm domain renewal and payment details"],
            ].map(([id, label]) => (
              <div
                key={id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <span className="text-sm">{label}</span>
                {checks[id] ? (
                  <Badge variant="secondary">
                    <CheckCircle2 className="mr-1 size-3" /> Checked
                  </Badge>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => recordCheck(id)}>
                    Mark checked
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gauge className="size-4" /> For automated uptime and HTTPS expiry alerts, connect a
            monitoring provider when you are ready.
          </div>
        </section>

        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold">Growth and SEO handrails</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Use these checks before spending money on ads or SEO services.
              </p>
            </div>
            <Search className="size-5 text-primary" aria-hidden="true" />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              "Every important page has one clear title and a useful description.",
              "Business name, phone, address/service area and hours match everywhere.",
              "The primary action works on a small screen without zooming.",
              "Analytics records one meaningful action, not just page views.",
            ].map((item) => (
              <li key={item} className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/get-found">Open local visibility guide</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/content">Review content drafts</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/launch-dossier">Create shareable handoff</Link>
            </Button>
          </div>
        </section>

        <section className="surface-panel space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-xl font-bold">Provider launch shortcuts</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Open the provider, then follow the relevant guide inside Cornerstone. Never share your
              password here.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PROVIDERS.map(([name, description, url]) => (
              <div
                key={name}
                className="flex items-start justify-between gap-3 rounded-lg border p-4"
              >
                <div>
                  <h3 className="font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                </div>
                {url ? (
                  <Button asChild size="sm" variant="ghost" aria-label={`Open ${name}`}>
                    <a href={url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
