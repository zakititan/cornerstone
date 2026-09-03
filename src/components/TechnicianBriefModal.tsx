import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Lock,
  Mail,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";

interface TechnicianBriefModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainOverride?: string;
}

export function TechnicianBriefModal({
  open,
  onOpenChange,
  domainOverride,
}: TechnicianBriefModalProps) {
  const { state } = useStore();
  const domain = domainOverride || state.business.ownedDomain || "yourdomain.com";
  const businessName = state.business.name || "My Business";
  const registrar = state.ownership.domainRegistrar || "Domain Registrar";

  const [contractorName, setContractorName] = useState("Technical Support / Web Developer");
  const [platform, setPlatform] = useState("Shopify");
  const [emailHost, setEmailHost] = useState("Google Workspace");
  const [customNotes, setCustomNotes] = useState("");

  const dnsRecords = useMemo(() => {
    const records: { type: string; host: string; value: string; purpose: string }[] = [];

    // Web Host Records
    if (platform === "Shopify") {
      records.push(
        { type: "A", host: "@", value: "23.227.38.65", purpose: "Shopify Primary Web Server" },
        {
          type: "CNAME",
          host: "www",
          value: "shops.myshopify.com",
          purpose: "Shopify www Subdomain",
        },
      );
    } else if (platform === "Squarespace") {
      records.push(
        {
          type: "A",
          host: "@",
          value: "198.185.159.144",
          purpose: "Squarespace Server 1 (add 198.185.159.145, 198.49.23.144, 198.49.23.145)",
        },
        {
          type: "CNAME",
          host: "www",
          value: "ext-cust.squarespace.com",
          purpose: "Squarespace www Subdomain",
        },
      );
    } else if (platform === "Wix") {
      records.push(
        { type: "A", host: "@", value: "185.230.63.107", purpose: "Wix Primary Web Server" },
        {
          type: "CNAME",
          host: "www",
          value: "pointing.wixdns.net",
          purpose: "Wix www Subdomain",
        },
      );
    } else {
      records.push(
        {
          type: "A",
          host: "@",
          value: "[Host Server IP]",
          purpose: "Primary Website Server",
        },
        {
          type: "CNAME",
          host: "www",
          value: domain,
          purpose: "www Subdomain Alias",
        },
      );
    }

    // Email Host Records
    if (emailHost === "Google Workspace") {
      records.push(
        {
          type: "MX",
          host: "@",
          value: "1 SMTP.GOOGLE.COM",
          purpose: "Google Workspace Mail Exchanger",
        },
        {
          type: "TXT",
          host: "@",
          value: "v=spf1 include:_spf.google.com ~all",
          purpose: "Google SPF Anti-Spoofing",
        },
      );
    } else if (emailHost === "Microsoft 365") {
      records.push(
        {
          type: "MX",
          host: "@",
          value: `0 ${domain.replace(/\./g, "-")}.mail.protection.outlook.com`,
          purpose: "Microsoft 365 Mail Exchanger",
        },
        {
          type: "TXT",
          host: "@",
          value: "v=spf1 include:spf.protection.outlook.com ~all",
          purpose: "Microsoft SPF Anti-Spoofing",
        },
      );
    } else {
      records.push(
        {
          type: "MX",
          host: "@",
          value: "10 mx1.titan.email (and 20 mx2.titan.email)",
          purpose: "Titan Business Mail Exchangers",
        },
        {
          type: "TXT",
          host: "@",
          value: "v=spf1 include:spf.titan.email ~all",
          purpose: "Titan SPF Anti-Spoofing",
        },
      );
    }

    // Standard DMARC
    records.push({
      type: "TXT",
      host: "_dmarc",
      value: `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc@${domain}`,
      purpose: "DMARC Security Enforcement",
    });

    return records;
  }, [platform, emailHost, domain]);

  const supportTicketText = useMemo(() => {
    return `SUBJECT: Technical DNS Update & Safe Delegation Task for ${domain} (${businessName})

ATTENTION: ${contractorName}
ORGANIZATION: ${businessName}
DOMAIN: ${domain}
REGISTRAR: ${registrar}
DATE: ${new Date().toLocaleDateString()}

Dear ${contractorName},

Please perform the following DNS configuration for ${domain} to connect our website (${platform}) and maintain our active business email (${emailHost}).

======================================================
STRICT SECURITY & BUSINESS CONTINUITY MANDATES:
======================================================
1. CRITICAL: DO NOT delete, replace, or modify any existing MX records without explicit written authorization. Active business operations depend on our email inboxes.
2. CRITICAL: DO NOT create a secondary SPF record. If an existing TXT starting with "v=spf1" exists, you MUST merge the include directives into a single record (RFC 7208).
3. CRITICAL: DO NOT change nameservers unless specifically instructed. All changes must be made within our existing DNS management zone at ${registrar}.
4. CREDENTIAL SAFETY: Master account credentials (passwords, 2FA codes, or recovery emails) are NOT provided. Access must be completed via delegated guest access or a supervised screen share.
5. TTL SETTING: Set TTL to 300 seconds (5 minutes) for all new records to allow rapid rollback if unexpected issues occur.

======================================================
REQUESTED DNS ENTRIES:
======================================================
${dnsRecords
  .map(
    (r, i) =>
      `Record #${i + 1}:
Type:     ${r.type}
Host:     ${r.host}
Value:    ${r.value}
Purpose:  ${r.purpose}
------------------------------------------------------`,
  )
  .join("\n")}

${
  customNotes
    ? `ADDITIONAL INSTRUCTIONS:
${customNotes}
`
    : ""
}
======================================================
COMPLETION VERIFICATION:
======================================================
Upon completion, please verify:
[ ] Both https://${domain} and https://www.domain load over valid SSL/TLS certificate.
[ ] Sending a test email to and from our domain completes with 0 bounce errors.
[ ] Reply with a screenshot of the updated DNS zone table for our permanent records.

Thank you,
${businessName} Asset Management`;
  }, [
    contractorName,
    businessName,
    domain,
    registrar,
    platform,
    emailHost,
    dnsRecords,
    customNotes,
  ]);

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(supportTicketText);
      toast.success("Support ticket & handover brief copied to clipboard!");
    } catch {
      toast.error("Could not copy brief text.");
    }
  };

  const downloadTicket = () => {
    const blob = new Blob([supportTicketText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dns-delegation-brief-${domain.replace(/[^a-z0-9]/gi, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Handover brief downloaded as .txt file!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <ShieldAlert className="size-3 mr-1" /> Safe Delegation Framework
            </Badge>
            <span className="text-xs text-muted-foreground">Contractor & IT Support Generator</span>
          </div>
          <DialogTitle className="font-display text-xl font-bold">
            Generate Delegation Handover Brief
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Generate a formal, safe technical brief for your web developer, freelancer (Fiverr /
            Upwork), or registrar support team. Enforces strict safety rules so contractors don't
            break your business email or lock you out of your domain.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Form Controls */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contractor / Technician Name</Label>
              <Input
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                placeholder="e.g. Alex (Upwork Developer)"
                className="text-xs h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Target Website Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shopify">Shopify</SelectItem>
                  <SelectItem value="Squarespace">Squarespace</SelectItem>
                  <SelectItem value="Wix">Wix</SelectItem>
                  <SelectItem value="WordPress">WordPress / Custom Host</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Business Email Provider</Label>
              <Select value={emailHost} onValueChange={setEmailHost}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Google Workspace">Google Workspace</SelectItem>
                  <SelectItem value="Microsoft 365">Microsoft 365</SelectItem>
                  <SelectItem value="Titan Email">Titan / Professional Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">
              Additional Context or Deadlines (Optional)
            </Label>
            <Input
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Please execute changes after 6:00 PM EST to minimize customer interruption."
              className="text-xs h-8"
            />
          </div>

          {/* Safety Guardrails Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs">
              <Lock className="size-4 shrink-0" />
              <span>Safety Guardrails Automatically Included in Brief:</span>
            </div>
            <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-1 leading-relaxed">
              <li>
                <strong>Email Protection:</strong> Explicit ban against deleting or overriding
                existing MX and SPF records.
              </li>
              <li>
                <strong>Zero Password Sharing:</strong> Instructions to use registrar delegate /
                guest access rather than root credentials.
              </li>
              <li>
                <strong>Rollback Protocol:</strong> Mandatory 300-second TTL to guarantee fast undo
                if needed.
              </li>
            </ul>
          </div>

          {/* Brief Preview & Copy */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Generated Delegation Ticket:
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyTicket}
                  className="h-7 text-xs gap-1"
                >
                  <Copy className="size-3" /> Copy Ticket
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTicket}
                  className="h-7 text-xs gap-1"
                >
                  <Download className="size-3" /> Download .txt
                </Button>
              </div>
            </div>

            <pre className="rounded-xl border border-border/80 bg-muted/50 p-4 font-mono text-[11px] text-foreground leading-relaxed overflow-x-auto max-h-64 whitespace-pre-wrap">
              {supportTicketText}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
