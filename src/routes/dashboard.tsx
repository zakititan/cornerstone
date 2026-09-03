import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  Clock,
  HelpCircle,
  Building2,
  Rocket,
  ListChecks,
  Activity,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { EmptyState } from "@/components/EmptyState";
import { OwnershipWarningCard } from "@/components/Callouts";
import { LaunchTaskCard } from "@/components/TaskCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/lib/store";
import { PHASES, currentStage, progressPercent } from "@/lib/plan";
import { getReadiness } from "@/lib/readiness";
import { getOnlinePresenceStatus, getTopPresenceAction } from "@/lib/online-presence";
import { NextBestActionCard } from "@/components/NextBestActionCard";
import { OnlinePresenceStatusGrid } from "@/components/OnlinePresenceStatusGrid";
import { LaunchReadinessSummary } from "@/components/LaunchReadinessSummary";
import { SetupMapPreview } from "@/components/SetupMapPreview";
import { QuickTools } from "@/components/QuickTools";
import { MilestoneSequence } from "@/components/MilestoneSequence";
import { getRecentTools } from "@/lib/recent-tools";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your launch dashboard — Cornerstone" },
      {
        name: "description",
        content:
          "See your progress, your next best action and your seven-area online presence overview from planning to launch.",
      },
      { property: "og:title", content: "Your personalized launch dashboard" },
      {
        property: "og:description",
        content: "Progress, next steps and a seven-area overview for getting your business online.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { state, hydrated, hasPlan, setTaskStatus, updateTask, loadDemo } = useStore();
  const [openPhase, setOpenPhase] = useState<string | null>(null);

  const tasks = state.tasks;
  const percent = progressPercent(tasks);
  const stage = currentStage(tasks);
  const readiness = useMemo(
    () => getReadiness(tasks, state.business, state.ownership, state.customerJourneyTest),
    [tasks, state.business, state.ownership, state.customerJourneyTest],
  );
  const areas = useMemo(() => getOnlinePresenceStatus(state), [state]);
  const topAction = useMemo(() => getTopPresenceAction(areas, readiness), [areas, readiness]);
  const recentTools = useMemo(() => getRecentTools(), []);

  const recent = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt)
        .sort((a, b) => (a.completedAt! < b.completedAt! ? 1 : -1))
        .slice(0, 4),
    [tasks],
  );

  if (!hydrated) {
    return (
      <AppShell title="Loading your plan…">
        <div className="grid gap-4 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </AppShell>
    );
  }

  if (!hasPlan) {
    return (
      <AppShell
        title="Your dashboard"
        description="Build a plan to unlock your personalized roadmap."
      >
        <div className="space-y-8">
          <section aria-labelledby="welcome-title" className="surface-panel p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                Welcome to Cornerstone
              </p>
              <h2 id="welcome-title" className="mt-2 font-display text-2xl font-bold">
                Answer a few quick questions to generate your launch roadmap.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                We will build a step-by-step launch plan covering domains, website hosting, email,
                DNS connections, and customer actions.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/onboarding">
                    Build my plan <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" onClick={loadDemo}>
                  Load bakery demo
                </Button>
              </div>
            </div>
          </section>

          <OnlinePresenceStatusGrid areas={areas} />

          <EmptyState
            icon={Rocket}
            title="No launch plan yet"
            description="Explore with a demo bakery or answer quick questions to create your custom roadmap."
            actionLabel="Create my free plan"
            actionTo="/onboarding"
          />
        </div>
      </AppShell>
    );
  }

  const stageLabel = PHASES.find((p) => p.key === stage)?.title ?? "Plan";
  const completed = tasks.filter((t) => t.status === "complete").length;
  const hasBusinessName = state.business.businessName.trim().length > 0;

  return (
    <AppShell
      title={hasBusinessName ? state.business.businessName : "Launch Dashboard"}
      description={`${percent}% of launch roadmap complete · ${completed} of ${tasks.length} tasks done`}
      actions={
        <Button variant="outline" size="sm" asChild className="hidden sm:inline-flex">
          <Link to="/learn">
            <HelpCircle className="size-4" aria-hidden="true" />
            Guides & Help
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        {/* A. Welcome & Summary Banner */}
        <section aria-labelledby="welcome-context" className="surface-panel p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/25 bg-primary-soft"
                >
                  Stage: {stageLabel}
                </Badge>
                {hasBusinessName && state.business.category && (
                  <span className="text-xs text-muted-foreground">{state.business.category}</span>
                )}
                {state.business.primaryCustomerAction && (
                  <Badge variant="secondary" className="text-[11px]">
                    Goal: {state.business.primaryCustomerAction.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <h2
                id="welcome-context"
                className="mt-1 font-display text-xl font-bold sm:text-2xl text-foreground"
              >
                {hasBusinessName
                  ? `Welcome back, ${state.business.businessName}`
                  : "Launch Dashboard"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                {completed} of {tasks.length} tasks complete ({percent}%) · Focus on your next best
                action below.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <ProgressRing value={percent} size={64} label="complete" />
              <div className="flex flex-col gap-1.5">
                <Button asChild size="sm" className="text-xs h-8">
                  <Link to="/checklist">View Checklist</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground"
                >
                  <Link to="/business-profile">Edit Profile</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Recently used quick jump bar */}
        {recentTools.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/50 p-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground pl-1 text-[11px]">
              <Clock className="size-3.5" />
              <span>Recently used:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {recentTools.map((tool) => (
                <Button
                  key={tool.path}
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs px-2.5"
                >
                  <Link to={tool.path as never}>{tool.label}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* B. Next best action card — Prominent single focus */}
        <NextBestActionCard action={topAction} />

        {/* C. Clean Tabbed Layout */}
        <Tabs defaultValue="roadmap" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg p-1">
            <TabsTrigger value="roadmap" className="text-xs font-bold gap-1.5">
              <ListChecks className="size-3.5 text-primary" /> Roadmap & Tasks
            </TabsTrigger>
            <TabsTrigger value="presence" className="text-xs font-bold gap-1.5">
              <Activity className="size-3.5 text-emerald-500" /> Health & Areas
            </TabsTrigger>
            <TabsTrigger value="snapshot" className="text-xs font-bold gap-1.5">
              <Building2 className="size-3.5 text-indigo-500" /> Profile & History
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: ROADMAP & TASKS */}
          <TabsContent value="roadmap" className="space-y-6">
            {/* 5-Step Clear Milestone Sequence */}
            <MilestoneSequence />

            {/* Quick tools consolidated based on stage */}
            <QuickTools action={topAction} />

            {/* Phased Roadmap Accordion */}
            <section aria-labelledby="roadmap" className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="roadmap" className="font-display text-lg font-bold">
                    Action Plan by Stage
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select a stage to view and complete individual tasks.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs h-8">
                  <Link to="/checklist">Full Checklist View</Link>
                </Button>
              </div>

              <ol className="space-y-3">
                {PHASES.map((phase) => {
                  const phaseTasks = tasks.filter((t) => t.phase === phase.key);
                  const done = phaseTasks.filter((t) => t.status === "complete").length;
                  const minutes = phaseTasks.reduce((s, t) => s + t.estimatedMinutes, 0);
                  const isDone = phaseTasks.length > 0 && done === phaseTasks.length;
                  const open = openPhase === phase.key;
                  return (
                    <li key={phase.key} className="surface-panel overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenPhase(open ? null : phase.key)}
                        aria-expanded={open}
                        className="flex w-full items-start gap-4 p-4 sm:p-5 text-left transition-colors hover:bg-muted/40"
                      >
                        <span
                          className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-xl font-display font-bold text-sm",
                            isDone
                              ? "bg-success text-success"
                              : phase.key === stage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          {phase.number}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display text-base font-semibold">{phase.title}</h4>
                            {isDone ? (
                              <Badge className="bg-success-soft text-success text-[10px] px-1.5 py-0">
                                Complete
                              </Badge>
                            ) : phase.key === stage ? (
                              <Badge className="bg-primary-soft text-primary text-[10px] px-1.5 py-0">
                                In progress
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{phase.why}</p>
                          <p className="mt-1.5 text-[11px] text-muted-foreground">
                            {done}/{phaseTasks.length} tasks · ~{Math.round(minutes / 60) || 1} hr
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "mt-1 size-4 shrink-0 transition-transform text-muted-foreground",
                            open && "rotate-180",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      {open ? (
                        <div className="space-y-3 border-t border-border bg-muted/20 p-4">
                          {phaseTasks.length ? (
                            phaseTasks.map((t) => (
                              <LaunchTaskCard
                                key={t.id}
                                task={t}
                                onStatus={(s) => setTaskStatus(t.id, s)}
                                onUpdate={(p) => updateTask(t.id, p)}
                              />
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No tasks in this phase for your current answers.
                            </p>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          </TabsContent>

          {/* TAB 2: PRESENCE & HEALTH */}
          <TabsContent value="presence" className="space-y-6">
            <OnlinePresenceStatusGrid areas={areas} />
            <LaunchReadinessSummary readiness={readiness} />
            <SetupMapPreview areas={areas} />
          </TabsContent>

          {/* TAB 3: PROFILE & RECENT ACTIVITY */}
          <TabsContent value="snapshot" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Snapshot */}
              <section aria-labelledby="snapshot" className="surface-panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 id="snapshot" className="font-display text-base font-bold">
                    Business Profile Snapshot
                  </h3>
                  <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                    <Link to="/business-profile">Edit Profile →</Link>
                  </Button>
                </div>
                <dl className="mt-3 space-y-2.5 text-xs">
                  {[
                    ["Business", state.business.businessName],
                    ["Category", state.business.category],
                    ["Location", state.business.location || state.business.address],
                    ["Main goal", state.business.primaryGoal],
                    [
                      "Customer action",
                      state.business.primaryCustomerAction
                        ? state.business.primaryCustomerAction.replace(/_/g, " ")
                        : "—",
                    ],
                    ["Website needs", state.business.needs.join(", ")],
                    [
                      "Contact",
                      state.business.phone ||
                        state.business.businessEmail ||
                        state.business.contactFormUrl ||
                        "—",
                    ],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex flex-wrap justify-between gap-2 border-b border-border/60 pb-1.5"
                    >
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="max-w-[65%] text-right font-medium text-foreground truncate">
                        {v || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Recent activity */}
              <section aria-labelledby="activity" className="surface-panel p-5">
                <h3 id="activity" className="font-display text-base font-bold">
                  Recent Activity
                </h3>
                {recent.length ? (
                  <ul className="mt-3 space-y-2.5">
                    {recent.map((t) => (
                      <li key={t.id} className="flex items-start gap-2.5 text-xs">
                        <Clock
                          className="mt-0.5 size-3.5 shrink-0 text-success"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-medium text-foreground">{t.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Completed {new Date(t.completedAt!).toLocaleDateString()}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No completed tasks yet. Mark tasks as done in your roadmap to track progress.
                  </p>
                )}
              </section>
            </div>

            <OwnershipWarningCard />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
