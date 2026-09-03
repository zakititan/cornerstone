import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Copy, Activity, HardDrive, Wrench } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Callout } from "@/components/Callouts";
import { GlossaryTooltip } from "@/components/GlossaryTooltip";
import { LiveDnsChecker } from "@/components/LiveDnsChecker";
import { DomainHealthAudit } from "@/components/DomainHealthAudit";
import { TechnicianBriefModal } from "@/components/TechnicianBriefModal";
import { DnsImpactPreviewCard } from "@/components/DnsImpactPreviewCard";
import { DnsPreChangeChecklist } from "@/components/DnsPreChangeChecklist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { getDnsImpactPreview } from "@/lib/online-presence";

export const Route = createFileRoute("/connect-domain")({
  head: () => ({
    meta: [
      { title: "Connect your domain to your website — DNS guide" },
      {
        name: "description",
        content:
          "A careful, plain-English walkthrough for pointing your web address at your website without breaking your business email.",
      },
      { property: "og:title", content: "Connect your domain to your website" },
      {
        property: "og:description",
        content:
          "Guided DNS records, safeguards before you change anything, and troubleshooting in plain English.",
      },
    ],
  }),
  component: ConnectDomain,
});

interface RecordRow {
  id: string;
  type: string;
  host: string;
  value: string;
  purpose: string;
  category: "Website routing" | "Verification" | "Email" | "Redirect";
}

const WEBSITE_HOST_PRESETS: { id: string; name: string; records: RecordRow[] }[] = [
  {
    id: "custom",
    name: "Other / Custom Hosting Provider",
    records: [
      {
        id: "a-1",
        type: "A",
        host: "@",
        value: "203.0.113.10 (use the IP address your web host gave you)",
        purpose: "Points your bare root domain (e.g. yourdomain.com) to your web host server.",
        category: "Website routing",
      },
      {
        id: "cname-www",
        type: "CNAME",
        host: "www",
        value: "your-site.example-platform.com",
        purpose: "Sends visitors typing www.yourdomain.com to your website host.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "squarespace",
    name: "Squarespace",
    records: [
      {
        id: "sq-a-1",
        type: "A",
        host: "@",
        value: "198.185.159.144",
        purpose: "Squarespace primary A record 1.",
        category: "Website routing",
      },
      {
        id: "sq-a-2",
        type: "A",
        host: "@",
        value: "198.185.159.145",
        purpose: "Squarespace redundant A record 2.",
        category: "Website routing",
      },
      {
        id: "sq-a-3",
        type: "A",
        host: "@",
        value: "198.49.23.144",
        purpose: "Squarespace redundant A record 3.",
        category: "Website routing",
      },
      {
        id: "sq-a-4",
        type: "A",
        host: "@",
        value: "198.49.23.145",
        purpose: "Squarespace redundant A record 4.",
        category: "Website routing",
      },
      {
        id: "sq-cname-www",
        type: "CNAME",
        host: "www",
        value: "ext-cust.squarespace.com",
        purpose: "Squarespace www routing target.",
        category: "Website routing",
      },
      {
        id: "sq-cname-verify",
        type: "CNAME",
        host: "(Unique 6-character code from Squarespace Settings)",
        value: "verify.squarespace.com",
        purpose: "Squarespace unique domain ownership verification record.",
        category: "Verification",
      },
    ],
  },
  {
    id: "shopify",
    name: "Shopify Store",
    records: [
      {
        id: "shop-a-1",
        type: "A",
        host: "@",
        value: "23.227.38.65",
        purpose: "Shopify official primary IP address for root domain.",
        category: "Website routing",
      },
      {
        id: "shop-cname-www",
        type: "CNAME",
        host: "www",
        value: "shops.myshopify.com",
        purpose: "Directs www traffic through Shopify's global load balancers.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "wix",
    name: "Wix",
    records: [
      {
        id: "wix-a-1",
        type: "A",
        host: "@",
        value: "185.230.63.171 (or IP shown in Wix Domain Manager)",
        purpose: "Points your root domain to Wix servers.",
        category: "Website routing",
      },
      {
        id: "wix-cname-www",
        type: "CNAME",
        host: "www",
        value: "pointing.wixdns.net",
        purpose: "Directs www subdomain traffic to your Wix website.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "siteground_hostinger_wp",
    name: "SiteGround / Hostinger / Managed WordPress",
    records: [
      {
        id: "wp-a-1",
        type: "A",
        host: "@",
        value: "(Copy the Server IP from your SiteGround Site Tools or Hostinger hPanel dashboard)",
        purpose: "Directs all root domain traffic to your dedicated WordPress server instance.",
        category: "Website routing",
      },
      {
        id: "wp-cname-www",
        type: "CNAME",
        host: "www",
        value: "@",
        purpose: "Aliases www traffic directly to your root domain WordPress A record.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "webflow",
    name: "Webflow",
    records: [
      {
        id: "wf-a-1",
        type: "A",
        host: "@",
        value: "75.2.70.75",
        purpose: "Webflow primary AWS/Fastly edge A record.",
        category: "Website routing",
      },
      {
        id: "wf-a-2",
        type: "A",
        host: "@",
        value: "99.83.190.102",
        purpose: "Webflow secondary edge A record.",
        category: "Website routing",
      },
      {
        id: "wf-cname-www",
        type: "CNAME",
        host: "www",
        value: "proxy-ssl.webflow.com",
        purpose: "Webflow custom domain proxy CNAME.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "carrd",
    name: "Carrd Pro",
    records: [
      {
        id: "carrd-a-1",
        type: "A",
        host: "@",
        value: "162.255.119.248 (or IP provided in Carrd Publish modal)",
        purpose: "Directs root traffic to Carrd's ultra-fast one-page hosting network.",
        category: "Website routing",
      },
      {
        id: "carrd-cname-www",
        type: "CNAME",
        host: "www",
        value: "(Your site name).carrd.co",
        purpose: "Routes www to your published Carrd project.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "neo_site",
    name: "Neo AI One-Page Site",
    records: [
      {
        id: "neo-cname-www",
        type: "CNAME",
        host: "www",
        value: "site.neo.space",
        purpose: "Connects your custom domain www to your Neo AI business website.",
        category: "Website routing",
      },
      {
        id: "neo-a-root",
        type: "A",
        host: "@",
        value: "(Provided in Neo Admin > Site Settings)",
        purpose: "Points root domain to Neo's high-speed cloud site host.",
        category: "Website routing",
      },
    ],
  },
  {
    id: "cloudflare_pages",
    name: "Cloudflare Pages / Vercel",
    records: [
      {
        id: "pages-cname-www",
        type: "CNAME",
        host: "www",
        value: "(your-project).pages.dev (or cname.vercel-dns.com)",
        purpose: "Points www subdomain to your static edge deployment.",
        category: "Website routing",
      },
      {
        id: "pages-cname-root",
        type: "CNAME",
        host: "@",
        value: "(your-project).pages.dev",
        purpose: "CNAME Flattening / ALIAS record on root domain.",
        category: "Website routing",
      },
    ],
  },
];

const TROUBLESHOOTING = [
  {
    q: "My website is not loading",
    a: "Updates to these settings can take time to appear — sometimes minutes, sometimes many hours. Confirm the values match exactly what your provider gave you, then wait before changing anything else.",
  },
  {
    q: "I see a parking page",
    a: "That usually means your address is still pointing at your registrar's default page. Check that the record for the main address was saved, not just the www version.",
  },
  {
    q: "My old website still appears",
    a: "Your browser or network may be remembering the old answer. Try a different device or mobile data before assuming the change failed.",
  },
  {
    q: "My business email stopped working",
    a: "Restore the mail-related records you had before, using your screenshot. Mail records (MX, SPF TXT) are separate from website records and should never be deleted when pointing your domain at a web host.",
  },
  {
    q: "HTTPS is not active",
    a: "Most platforms issue the security certificate automatically once the address points at them correctly. It can take a while after the records are right. Check your platform's domain settings page for status.",
  },
  {
    q: "Verification is failing",
    a: "Verification usually uses a TXT or custom CNAME record. Check for extra spaces, a missing quote, or a host field that your provider auto-completed with your domain name twice.",
  },
  {
    q: "I am unsure which record to change",
    a: "Stop and ask your website provider's support for the exact record type, host and value. Do not guess, and do not delete anything to 'clean up'.",
  },
];

function ConnectDomain() {
  const { state, setDnsPlanning, updateDnsPlanningField } = useStore();
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom");
  const [added, setAdded] = useState<string[]>([]);
  const [briefOpen, setBriefOpen] = useState(false);

  const domain = state.business.ownedDomain || state.business.preferredDomain || "yourbusiness.com";
  const planning = state.dnsPlanning;

  // Pre-fill from business fields where planning is still default/unsure
  useEffect(() => {
    if (!planning) return;
    const b = state.business;
    const needs = (b.needsBusinessEmail ?? b.usesBusinessEmail ?? "").toString().toLowerCase();
    const existingPresent = (b.existingWebsitePresent ?? b.existingWebsiteStatus ?? "")
      .toString()
      .toLowerCase();
    const hasExact = (b.hasExactProviderRecords ?? "").toString().toLowerCase();
    const screenshot = (b.dnsScreenshotSaved ?? "").toString().toLowerCase();

    // Map business -> planning if planning still at default and business has info
    if (planning.websiteChangeType === "unsure") {
      if (
        existingPresent === "yes" ||
        existingPresent.includes("improving") ||
        existingPresent.includes("already") ||
        b.websiteChangePlanned === "yes"
      ) {
        updateDnsPlanningField("websiteChangeType", "replacing");
      } else if (
        existingPresent === "no" ||
        b.websiteChangePlanned === "no" ||
        existingPresent.includes("nothing")
      ) {
        updateDnsPlanningField("websiteChangeType", "first");
      }
    }
    if (planning.usesBusinessEmail === "not_sure") {
      if (needs === "yes" || b.businessEmail?.trim())
        updateDnsPlanningField("usesBusinessEmail", "yes");
      else if (needs === "no") updateDnsPlanningField("usesBusinessEmail", "no");
    }
    if (
      !planning.dnsProviderLocation &&
      (b.dnsProvider || b.registrarName || state.ownership.dnsProvider)
    ) {
      updateDnsPlanningField(
        "dnsProviderLocation",
        b.dnsProvider || b.registrarName || state.ownership.dnsProvider,
      );
    }
    if (planning.screenshotSaved === "unsure") {
      if (screenshot === "yes") updateDnsPlanningField("screenshotSaved", "yes");
      else if (screenshot === "no") updateDnsPlanningField("screenshotSaved", "not_yet");
    }
    if (planning.hasExactRecords === "not_yet") {
      if (hasExact === "yes") updateDnsPlanningField("hasExactRecords", "yes");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = useMemo(() => getDnsImpactPreview(state), [state]);

  const records: RecordRow[] = useMemo(() => {
    const preset =
      WEBSITE_HOST_PRESETS.find((p) => p.id === selectedPresetId) || WEBSITE_HOST_PRESETS[0]!;
    const rows: RecordRow[] = [...preset.records];

    if (planning?.websiteChangeType === "replacing") {
      rows.push({
        id: "redirect",
        type: "Redirect / 301",
        host: "old paths",
        value: "Map each old URL to its corresponding new URL in your host dashboard",
        purpose:
          "Preserves your existing Google SEO rankings and prevents 404 errors after the move.",
        category: "Redirect",
      });
    }
    return rows;
  }, [selectedPresetId, planning?.websiteChangeType]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to your clipboard.");
    } catch {
      toast.error("We could not copy that just now. Select the text and copy it manually.");
    }
  };

  const providerKnown = (planning?.dnsProviderLocation ?? "").trim().length > 0;

  return (
    <AppShell
      title="Connect Domain"
      description="Point your domain to your website host while keeping email safe."
    >
      <div className="space-y-6">
        <Callout tone="warning" title="Important Email Safeguard">
          DNS changes affect both your website and your business email. Never delete MX or
          mail-related records unless explicitly instructed by your email provider.
        </Callout>

        {/* 1. Pre-Change Safeguards */}
        <section aria-labelledby="step1" className="space-y-4">
          <h2 id="step1" className="font-display text-xl font-bold">
            1. Pre-Change Safeguards
          </h2>
          <div className="surface-panel space-y-5 p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              Review these 5 checkpoints to assess risks before updating your DNS records.
            </p>

            <fieldset>
              <legend className="text-sm font-medium">
                Are you connecting your domain for the first time, or replacing an existing site?
              </legend>
              <RadioGroup
                value={planning?.websiteChangeType ?? "unsure"}
                onValueChange={(v) => updateDnsPlanningField("websiteChangeType", v as never)}
                className="mt-2.5 gap-2 sm:grid-cols-3"
              >
                {[
                  { v: "first", l: "First-time setup" },
                  { v: "replacing", l: "Replacing existing site" },
                  { v: "unsure", l: "Not sure" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`change-${o.v}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-medium",
                      (planning?.websiteChangeType ?? "unsure") === o.v
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem id={`change-${o.v}`} value={o.v} />
                    {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">
                Does business email already run on this domain?
              </legend>
              <RadioGroup
                value={planning?.usesBusinessEmail ?? "not_sure"}
                onValueChange={(v) => updateDnsPlanningField("usesBusinessEmail", v as never)}
                className="mt-2.5 gap-2 sm:grid-cols-3"
              >
                {[
                  { v: "yes", l: "Yes, email is active" },
                  { v: "no", l: "No email on domain" },
                  { v: "not_sure", l: "Not sure" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`email-risk-${o.v}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-medium",
                      (planning?.usesBusinessEmail ?? "not_sure") === o.v
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem id={`email-risk-${o.v}`} value={o.v} />
                    {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="dns-manager">Where is your DNS managed?</Label>
              <Input
                id="dns-manager"
                value={planning?.dnsProviderLocation ?? ""}
                onChange={(e) => updateDnsPlanningField("dnsProviderLocation", e.target.value)}
                placeholder="e.g. Cloudflare, Porkbun, Namecheap, GoDaddy"
              />
              <p className="text-xs text-muted-foreground">
                Check your registrar account or where your nameservers point.
              </p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium">Have you backed up current settings?</legend>
              <RadioGroup
                value={planning?.screenshotSaved ?? "unsure"}
                onValueChange={(v) => updateDnsPlanningField("screenshotSaved", v as never)}
                className="mt-2.5 gap-2 sm:grid-cols-3"
              >
                {[
                  { v: "yes", l: "Yes, saved backup" },
                  { v: "not_yet", l: "Not yet" },
                  { v: "unsure", l: "Not sure" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`screen-${o.v}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-medium",
                      (planning?.screenshotSaved ?? "unsure") === o.v
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem id={`screen-${o.v}`} value={o.v} />
                    {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium">
                Do you have the exact records provided by your host?
              </legend>
              <RadioGroup
                value={planning?.hasExactRecords ?? "not_yet"}
                onValueChange={(v) => updateDnsPlanningField("hasExactRecords", v as never)}
                className="mt-2.5 gap-2 sm:grid-cols-3"
              >
                {[
                  { v: "yes", l: "Yes, exact host records" },
                  { v: "preset", l: "Using standard preset" },
                  { v: "not_yet", l: "Not yet" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`exact-${o.v}`}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border p-2.5 text-sm font-medium",
                      (planning?.hasExactRecords ?? "not_yet") === o.v
                        ? "border-primary bg-primary-soft"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <RadioGroupItem id={`exact-${o.v}`} value={o.v} />
                    {o.l}
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
          </div>

          <DnsImpactPreviewCard preview={preview} />

          {preview.emailAtRisk ? (
            <Callout tone="warning" title="Email Risk Warning">
              Active email was detected. Do not remove or alter MX, SPF, DKIM, or DMARC records when
              configuring website routing.
            </Callout>
          ) : null}
        </section>

        {/* 2. Back up */}
        <section aria-labelledby="step2" className="surface-panel p-5 sm:p-6 space-y-4">
          <h2 id="step2" className="font-display text-xl font-bold">
            2. Record Backup
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Take a screenshot or export of your existing DNS zone before editing. If anything
            breaks, you can instantly restore previous values.
          </p>
          <DnsPreChangeChecklist />
        </section>

        {/* 3. Confirm provider */}
        <section aria-labelledby="step3" className="surface-panel p-5 sm:p-6 space-y-4">
          <h2 id="step3" className="font-display text-xl font-bold">
            3. Provider &amp; Host Presets
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider-confirm">DNS Manager / Registrar</Label>
              <Input
                id="provider-confirm"
                value={planning?.dnsProviderLocation ?? ""}
                onChange={(e) => updateDnsPlanningField("dnsProviderLocation", e.target.value)}
                placeholder="e.g. Porkbun, Cloudflare, Namecheap, GoDaddy"
              />
              {!providerKnown ? (
                <p className="text-xs text-warning">
                  Enter your DNS provider to customize your walkthrough.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hostp">Target Website Host</Label>
              <select
                id="hostp"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {WEBSITE_HOST_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Presets provide default records. Always verify against your host's documentation.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Review website records */}
        <section aria-labelledby="step4" className="surface-panel p-5 sm:p-6 space-y-3">
          <h2 id="step4" className="font-display text-xl font-bold">
            4. Website Routing Overview
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your website is connected using an{" "}
            <GlossaryTooltip term="A record">A record</GlossaryTooltip> (pointing your apex domain
            to an IP) and a <GlossaryTooltip term="CNAME">CNAME</GlossaryTooltip> (pointing www to
            your host).
          </p>
          {preview.existingWebsiteAtRisk ? (
            <Callout tone="warning" title="Existing website at risk">
              Replacing existing A or CNAME records will redirect your live web traffic. Ensure your
              new site is published and ready.
            </Callout>
          ) : null}
        </section>

        {/* 5. Preserve email */}
        <section aria-labelledby="step5" className="surface-panel p-5 sm:p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="step5" className="font-display text-xl font-bold">
              5. Email Protection
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs">
              <Link to="/business-email">Email Guide →</Link>
            </Button>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Email and website records share the same DNS zone. Retain all MX and TXT (SPF, DKIM,
            DMARC) records to prevent email downtime.
          </p>
          {preview.recordsToPreserve.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {preview.recordsToPreserve.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {/* 6. Add records */}
        <section aria-labelledby="step6" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="step6" className="font-display text-xl font-bold">
                6. DNS Records for {domain}
              </h2>
              <p className="text-xs text-muted-foreground">
                Copy and enter these records into your DNS provider's dashboard.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBriefOpen(true)}
              className="gap-1.5 text-xs font-semibold"
            >
              <Wrench className="size-3.5" />
              <span>Generate Technical Brief</span>
            </Button>
          </div>

          <div className="surface-panel overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Host / Name</TableHead>
                  <TableHead>Value / Target</TableHead>
                  <TableHead className="hidden lg:table-cell">Purpose</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Done</TableHead>
                  <TableHead className="text-right">Copy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id} className={cn(added.includes(r.id) && "bg-success-soft/50")}>
                    <TableCell className="font-medium">{r.type}</TableCell>
                    <TableCell className="font-mono text-sm">{r.host}</TableCell>
                    <TableCell className="max-w-xs font-mono text-sm break-words">
                      {r.value}
                    </TableCell>
                    <TableCell className="hidden max-w-xs text-sm text-muted-foreground lg:table-cell">
                      {r.purpose}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[11px]">
                        {r.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={added.includes(r.id)}
                        onCheckedChange={() =>
                          setAdded((a) =>
                            a.includes(r.id) ? a.filter((x) => x !== r.id) : [...a, r.id],
                          )
                        }
                        aria-label={`Confirm added ${r.type} record`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => copy(r.value)}>
                        <Copy className="size-4" aria-hidden="true" />
                        <span className="sr-only">Copy {r.type} value</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Accordion type="single" collapsible className="surface-panel px-5">
            <AccordionItem value="where">
              <AccordionTrigger className="font-display font-semibold">
                Where do I enter these records?
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Sign in to your domain registrar or DNS manager (
                {planning?.dnsProviderLocation || "e.g. Cloudflare, Porkbun"}). Navigate to "DNS
                Settings" or "Manage Zone", click "Add Record", and paste each row.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="wrong">
              <AccordionTrigger className="font-display font-semibold">
                Common DNS pitfalls
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                Common errors include trailing whitespace when copying IP addresses, entering full
                domains instead of "@" for root records, and accidentally deleting MX records.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* 7. Propagation */}
        <section aria-labelledby="step7" className="surface-panel p-5 sm:p-6 space-y-3">
          <h2 id="step7" className="font-display text-xl font-bold">
            7. Propagation
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            DNS updates typically take between 5 to 60 minutes to propagate worldwide, though in
            rare cases up to 24 hours. Avoid re-editing records while propagation is underway.
          </p>
        </section>

        {/* 8. Verify */}
        <section aria-labelledby="step8" className="space-y-4">
          <div className="space-y-1">
            <h2 id="step8" className="font-display text-xl font-bold">
              8. Live Health Audit &amp; Propagation Test
            </h2>
            <p className="text-sm text-muted-foreground">
              Run automated checks to verify your domain resolves correctly and email authentication
              remains secure.
            </p>
          </div>

          <DomainHealthAudit
            initialDomain={domain}
            expectedHosting={planning?.targetPlatform}
            usesBusinessEmail={planning?.hasExistingEmail === "yes"}
            onOpenTechnicianBrief={() => setBriefOpen(true)}
          />

          <div className="surface-panel p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="size-5 text-primary" />
              <h3 className="text-base font-bold">Direct DNS-over-HTTPS Resolver Check</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Query Cloudflare and Google public resolvers in real-time to check live record
              propagation.
            </p>
            <LiveDnsChecker
              initialDomain={domain}
              className="border-none shadow-none p-0 bg-transparent"
            />
          </div>
        </section>

        <section aria-labelledby="trouble">
          <h2 id="trouble" className="font-display text-xl font-bold">
            Troubleshooting
          </h2>
          <Accordion type="single" collapsible className="surface-panel mt-4 px-5">
            {TROUBLESHOOTING.map((t) => (
              <AccordionItem key={t.q} value={t.q}>
                <AccordionTrigger className="text-left font-display font-semibold">
                  {t.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {t.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </div>

      <TechnicianBriefModal
        open={briefOpen}
        onOpenChange={setBriefOpen}
        domainOverride={domain}
        targetPlatformOverride={planning?.targetPlatform}
      />
    </AppShell>
  );
}
