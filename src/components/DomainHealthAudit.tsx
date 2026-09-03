import { useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Globe,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DomainConflictIssue,
  type DomainHealthAuditReport,
  runCompleteDomainAudit,
} from "@/lib/dns-lookup";
import { cn } from "@/lib/utils";

interface DomainHealthAuditProps {
  initialDomain?: string;
  expectedHosting?: string;
  expectedEmail?: string;
  usesBusinessEmail?: boolean;
  className?: string;
  onOpenTechnicianBrief?: () => void;
}

export function DomainHealthAudit({
  initialDomain = "",
  expectedHosting,
  expectedEmail,
  usesBusinessEmail = true,
  className,
  onOpenTechnicianBrief,
}: DomainHealthAuditProps) {
  const [domain, setDomain] = useState(initialDomain);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DomainHealthAuditReport | null>(null);
  const [filter, setFilter] = useState<"all" | "issues" | "passed">("all");
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const handleRunAudit = async (targetDomain?: string) => {
    const domainToTest = (targetDomain ?? domain).trim();
    if (!domainToTest) {
      toast.error("Please provide a domain name to audit.");
      return;
    }

    setLoading(true);
    try {
      const result = await runCompleteDomainAudit(domainToTest, {
        expectedHosting,
        expectedEmail,
        usesBusinessEmail,
      });
      setReport(result);
      if (result.metrics.blockers > 0) {
        toast.error(`Audit finished: ${result.metrics.blockers} launch blocker(s) detected!`);
      } else if (result.metrics.warnings > 0) {
        toast.warning(
          `Audit finished: ${result.metrics.warnings} warning(s) need attention before launch.`,
        );
      } else {
        toast.success("Domain health audit passed with 100% readiness!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run domain health check.");
    } finally {
      setLoading(false);
    }
  };

  const copyRecord = async (record: { type: string; host: string; value: string }) => {
    const text = `Type: ${record.type} | Host: ${record.host} | Value: ${record.value}`;
    try {
      await navigator.clipboard.writeText(record.value);
      toast.success(`Copied ${record.type} value to clipboard!`);
    } catch {
      toast.error("Could not copy record value.");
    }
  };

  const copyFullReport = async () => {
    if (!report) return;
    const lines = [
      `======================================================`,
      `DOMAIN HEALTH & CONFLICT AUDIT REPORT`,
      `Domain: ${report.domain}`,
      `Grade: ${report.overallGrade} (${report.overallScore}/100)`,
      `Status: ${report.status.toUpperCase()}`,
      `Checked: ${new Date(report.checkedAt).toLocaleString()}`,
      `Blockers: ${report.metrics.blockers} | Warnings: ${report.metrics.warnings} | Passed: ${report.metrics.passed}`,
      `======================================================\n`,
    ];

    report.issues.forEach((issue, index) => {
      lines.push(
        `[${issue.severity.toUpperCase()}] ${issue.title}`,
        `Category: ${issue.category.toUpperCase()}`,
        `Description: ${issue.description}`,
        `Impact: ${issue.impact}`,
        `Remediation: ${issue.remediation}`,
      );
      if (issue.suggestedRecord) {
        lines.push(
          `Suggested Record: ${issue.suggestedRecord.type} (Host: "${issue.suggestedRecord.host}") => "${issue.suggestedRecord.value}"`,
        );
      }
      lines.push("------------------------------------------------------");
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Audit report copied to clipboard!");
    } catch {
      toast.error("Could not copy report.");
    }
  };

  const filteredIssues = report
    ? report.issues.filter((i) => {
        if (filter === "issues") return i.severity === "blocker" || i.severity === "warning";
        if (filter === "passed") return i.severity === "pass";
        return true;
      })
    : [];

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="border-border/80 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <ShieldCheck className="size-3.5 mr-1" /> RFC & Deliverability Audit
                </Badge>
                <span className="text-xs text-muted-foreground">Conflict Detection Engine</span>
              </div>
              <CardTitle className="font-display text-xl font-bold tracking-tight">
                One-Click Domain Health & Conflict Audit
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Automated scan verifying RFC 7208 SPF collision rules, DMARC alignment, root CNAME
                conflicts, and web-to-mail record isolation.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleRunAudit()}
                disabled={loading || !domain.trim()}
                className="gap-2 shadow-sm font-semibold text-xs sm:text-sm"
              >
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                {loading ? "Auditing Domain..." : "Run Complete Health Audit"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {report && (
          <CardContent className="space-y-6 pt-0">
            {/* Scorecard Header */}
            <div className="surface-panel p-5 sm:p-6 border-l-4 border-l-primary space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex size-14 items-center justify-center rounded-2xl font-display text-2xl font-black shadow-inner shrink-0",
                      report.overallGrade === "A+" || report.overallGrade === "A"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : report.overallGrade === "B"
                          ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30",
                    )}
                  >
                    {report.overallGrade}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-lg font-bold text-foreground">
                        {report.domain}
                      </h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold capitalize",
                          report.status === "ready"
                            ? "border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30"
                            : report.status === "needs_attention"
                              ? "border-amber-500/40 text-amber-600 bg-amber-50/50 dark:bg-amber-950/30"
                              : "border-rose-500/40 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30",
                        )}
                      >
                        {report.status.replace("_", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Score: <strong>{report.overallScore}</strong>/100
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Checked on {new Date(report.checkedAt).toLocaleTimeString()} via worldwide DoH
                      resolvers.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyFullReport}
                    className="text-xs gap-1.5"
                  >
                    <Copy className="size-3.5" /> Copy Audit Report
                  </Button>
                  {onOpenTechnicianBrief && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onOpenTechnicianBrief}
                      className="text-xs gap-1.5"
                    >
                      <Wrench className="size-3.5" /> Handover to Tech
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setFilter("issues")}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors",
                    report.metrics.blockers > 0
                      ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20"
                      : "bg-muted/40 border-border/60 hover:bg-muted/60",
                    filter === "issues" && "ring-2 ring-primary",
                  )}
                >
                  <XCircle className="size-4 text-rose-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {report.metrics.blockers} Blocker{report.metrics.blockers !== 1 ? "s" : ""}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Require immediate fix</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("issues")}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors",
                    report.metrics.warnings > 0
                      ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20"
                      : "bg-muted/40 border-border/60 hover:bg-muted/60",
                    filter === "issues" && "ring-2 ring-primary",
                  )}
                >
                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {report.metrics.warnings} Warning{report.metrics.warnings !== 1 ? "s" : ""}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Deliverability risks</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFilter("passed")}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-colors",
                    report.metrics.passed > 0
                      ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20"
                      : "bg-muted/40 border-border/60 hover:bg-muted/60",
                    filter === "passed" && "ring-2 ring-primary",
                  )}
                >
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-foreground">
                      {report.metrics.passed} Passed
                    </div>
                    <span className="text-[10px] text-muted-foreground">RFC compliant</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Filter view:</span>
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                className="h-7 text-xs"
              >
                All Checks ({report.issues.length})
              </Button>
              <Button
                variant={filter === "issues" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("issues")}
                className="h-7 text-xs"
              >
                Issues Only ({report.metrics.blockers + report.metrics.warnings})
              </Button>
              <Button
                variant={filter === "passed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("passed")}
                className="h-7 text-xs"
              >
                Passed ({report.metrics.passed})
              </Button>
            </div>

            {/* Issues and Findings List */}
            <div className="space-y-3">
              {filteredIssues.map((issue) => {
                const isExpanded = expandedIssue === issue.id;
                const isBlocker = issue.severity === "blocker";
                const isWarning = issue.severity === "warning";
                const isPass = issue.severity === "pass";

                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "rounded-xl border p-4 transition-all",
                      isBlocker
                        ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/15"
                        : isWarning
                          ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/15"
                          : "border-border/70 bg-card/60",
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {isBlocker ? (
                            <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-display text-sm font-bold text-foreground">
                              {issue.title}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] uppercase font-semibold",
                                isBlocker
                                  ? "border-rose-500 text-rose-600 bg-rose-500/10"
                                  : isWarning
                                    ? "border-amber-500 text-amber-600 bg-amber-500/10"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-500/10",
                              )}
                            >
                              {issue.severity}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {issue.category}
                            </Badge>
                          </div>

                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {issue.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                        className="text-xs shrink-0 self-end sm:self-start"
                      >
                        {isExpanded ? "Hide Details" : "Inspect Fix"}
                      </Button>
                    </div>

                    {/* Detailed Accordion Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-border/60 space-y-3 text-xs">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 rounded-lg bg-background/80 p-3 border border-border/50">
                            <span className="font-semibold text-foreground block">
                              Real-World Impact
                            </span>
                            <p className="text-muted-foreground leading-relaxed">{issue.impact}</p>
                          </div>

                          <div className="space-y-1 rounded-lg bg-background/80 p-3 border border-border/50">
                            <span className="font-semibold text-foreground block">
                              How to Remediate
                            </span>
                            <p className="text-muted-foreground leading-relaxed">
                              {issue.remediation}
                            </p>
                          </div>
                        </div>

                        {issue.suggestedRecord && (
                          <div className="rounded-lg bg-card border border-primary/30 p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-primary text-xs flex items-center gap-1.5">
                                <Wrench className="size-3.5" /> Recommended DNS Record:
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyRecord(issue.suggestedRecord!)}
                                className="h-7 text-[11px] gap-1"
                              >
                                <Copy className="size-3" /> Copy Record Value
                              </Button>
                            </div>
                            <div className="font-mono text-[11px] bg-muted/60 p-2 rounded border border-border/60 overflow-x-auto">
                              <span className="text-muted-foreground">Type:</span>{" "}
                              <strong className="text-foreground">
                                {issue.suggestedRecord.type}
                              </strong>{" "}
                              | <span className="text-muted-foreground">Host:</span>{" "}
                              <strong className="text-foreground">
                                {issue.suggestedRecord.host}
                              </strong>{" "}
                              | <span className="text-muted-foreground">Value:</span>{" "}
                              <code className="text-primary font-semibold">
                                {issue.suggestedRecord.value}
                              </code>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
