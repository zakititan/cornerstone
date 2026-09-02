import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Globe,
  Blocks,
  Network,
  ListChecks,
  FileText,
  Mail,
  Search,
  Wrench,
  BookOpen,
  Settings,
  UserRound,
  Menu,
  Rocket,
  ShieldCheck,
  LifeBuoy,
  Building2,
  ClipboardCheck,
  Calculator,
  Star,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeMenu, ThemeToggle } from "@/components/ThemeToggle";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "My plan",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/checklist", label: "My launch checklist", icon: ListChecks },
      { to: "/business-profile", label: "Business profile", icon: Building2 },
      { to: "/account", label: "My plan details", icon: UserRound },
    ],
  },
  {
    label: "Build my website",
    items: [
      { to: "/domains", label: "Choose a domain", icon: Globe },
      { to: "/platform-matcher", label: "Choose website & hosting", icon: Blocks },
      { to: "/content", label: "Write website content", icon: FileText },
      { to: "/business-email", label: "Set up business email", icon: Mail },
      { to: "/connect-domain", label: "Connect my domain", icon: Network },
    ],
  },
  {
    label: "Launch safely",
    items: [
      { to: "/launch-wizard", label: "Guided launch steps", icon: Rocket },
      { to: "/customer-journey", label: "Test customer journey", icon: ClipboardCheck },
      { to: "/preflight", label: "Check before launch", icon: ShieldCheck },
      { to: "/ownership-record", label: "Ownership record", icon: ShieldAlert },
    ],
  },
  {
    label: "Grow my business",
    items: [
      { to: "/get-found", label: "Get found locally", icon: Search },
      { to: "/review-kit", label: "Ask for reviews", icon: Star },
      { to: "/email-signature", label: "Create email signature", icon: Mail },
      { to: "/cost-calculator", label: "Plan my budget", icon: Calculator },
      { to: "/maintenance", label: "Keep it running", icon: Wrench },
    ],
  },
  {
    label: "Learn & settings",
    items: [
      { to: "/learn", label: "Learning library", icon: BookOpen },
      { to: "/help", label: "Help centre", icon: LifeBuoy },
      { to: "/launch-dossier", label: "Share my launch plan", icon: FileText },
      { to: "/security-drill", label: "Recover from a problem", icon: ShieldAlert },
      { to: "/settings", label: "Settings & privacy", icon: Settings },
    ],
  },
] as const;

const ALL_LINKS = NAV_GROUPS.flatMap((group) => group.items);

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/checklist", label: "My plan", icon: ListChecks },
  { to: "/content", label: "Build", icon: Blocks },
  { to: "/get-found", label: "Grow", icon: Search },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_GROUPS.filter((group) => group.items.some((item) => item.to === pathname)).map(
      (group) => group.label,
    ),
  );
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV_GROUPS.map((group) => {
        const active = group.items.some((item) => item.to === pathname);
        const expanded = openGroups.includes(group.label) || active;
        return (
          <div key={group.label} className="rounded-lg">
            <button
              type="button"
              onClick={() =>
                setOpenGroups((groups) =>
                  expanded
                    ? groups.filter((value) => value !== group.label)
                    : [...groups, group.label],
                )
              }
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
            >
              {group.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {expanded ? (
              <div className="space-y-1">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={onNavigate}
                    aria-current={pathname === to ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === to
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                    )}
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function ToolSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () =>
      ALL_LINKS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(
        0,
        8,
      ),
    [query],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Find a tool or next step</DialogTitle>
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try ‘domain’, ‘content’, or ‘launch’"
        />
        <div className="space-y-1">
          {matches.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium hover:bg-muted"
            >
              <Icon className="size-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useStore();
  const nextTask =
    state.tasks.find((task) => task.status === "in_progress") ??
    state.tasks.find((task) => task.status !== "complete");
  const currentLink = ALL_LINKS.find((item) => item.to === pathname);
  const currentGroup = NAV_GROUPS.find((group) => group.items.some((item) => item.to === pathname));
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const saved = window.sessionStorage.getItem("lmbo.recent-pages");
    if (saved) setRecent(JSON.parse(saved) as string[]);
  }, []);
  useEffect(() => {
    if (!currentLink) return;
    setRecent((pages) => {
      const next = [pathname, ...pages.filter((page) => page !== pathname)].slice(0, 4);
      window.sessionStorage.setItem("lmbo.recent-pages", JSON.stringify(next));
      return next;
    });
  }, [pathname, currentLink]);
  const recentLinks = recent
    .map((path) => ALL_LINKS.find((item) => item.to === path))
    .filter((item): item is (typeof ALL_LINKS)[number] => Boolean(item));

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-6 lg:flex">
          <Link to="/" className="flex items-center gap-2 px-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Rocket className="size-4.5" aria-hidden="true" />
            </span>
            <span className="font-display text-sm leading-tight font-bold">
              Launch My
              <br />
              Business Online
            </span>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-4" /> Find a tool or answer
          </Button>
          <NavLinks />
          {recentLinks.length ? (
            <div className="space-y-1 border-t border-sidebar-border pt-3">
              <p className="px-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Recently used
              </p>
              {recentLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="block rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground hover:bg-sidebar-accent/60"
                >
                  {label}
                </Link>
              ))}
            </div>
          ) : null}
          <div
            aria-label="Quick actions"
            className="rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-2"
          >
            <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Continue your plan
            </p>
            <Link
              to="/checklist"
              className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-2 py-2 text-sm font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent/80"
            >
              <Rocket className="size-4" aria-hidden="true" />
              <span className="min-w-0 truncate">
                {nextTask ? nextTask.title : "Review your plan"}
              </span>
            </Link>
            <Link
              to="/business-profile"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60"
            >
              <Building2 className="size-4" aria-hidden="true" />
              Business profile
            </Link>
            <Link
              to="/customer-journey"
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60"
            >
              <ClipboardCheck className="size-4" aria-hidden="true" />
              Journey tester
            </Link>
            <p className="px-2 pt-1 text-[11px] leading-relaxed text-muted-foreground">
              Your current work is always saved on this device.
            </p>
          </div>
          <ThemeMenu className="mt-auto" />
          <p className=" px-2 text-xs text-muted-foreground">
            Educational guidance only. Pricing, eligibility and provider features vary.
          </p>
        </aside>

        <div className="min-w-0 flex-1 pb-24 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open navigation menu"
                  >
                    <Menu className="size-5" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 overflow-y-auto bg-sidebar p-4">
                  <SheetTitle className="px-3 pb-4 font-display">
                    Launch My Business Online
                  </SheetTitle>
                  <NavLinks onNavigate={() => setOpen(false)} />
                  <div className="mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-2">
                    <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      Continue your plan
                    </p>
                    <Link
                      to="/checklist"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg bg-sidebar-accent px-2 py-2 text-sm font-semibold text-sidebar-accent-foreground"
                    >
                      <Rocket className="size-4" aria-hidden="true" />
                      <span className="min-w-0 truncate">
                        {nextTask ? nextTask.title : "Review your plan"}
                      </span>
                    </Link>
                    <Link
                      to="/business-profile"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium"
                    >
                      <Building2 className="size-4" aria-hidden="true" />
                      Business profile
                    </Link>
                    <Link
                      to="/customer-journey"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium"
                    >
                      <ClipboardCheck className="size-4" aria-hidden="true" />
                      Journey tester
                    </Link>
                  </div>
                  <ThemeMenu className="mt-6" />
                </SheetContent>
              </Sheet>
              <div className="min-w-0 flex-1">
                {currentGroup && currentLink ? (
                  <p className="mb-0.5 text-xs text-muted-foreground">
                    {currentGroup.label} <span aria-hidden="true">/</span> {currentLink.label}
                  </p>
                ) : null}
                <h1 className="truncate font-display text-xl font-bold sm:text-2xl">{title}</h1>
                {description ? (
                  <p className="truncate text-sm text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                aria-label="Find a tool or answer"
              >
                <Search className="size-5" aria-hidden="true" />
              </Button>
              {actions}
            </div>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        </div>
      </div>

      <ToolSearch open={searchOpen} onOpenChange={setSearchOpen} />
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      >
        {MOBILE_NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <Link
          to="/checklist"
          className="flex flex-col items-center gap-1 py-2.5 text-xs font-medium text-primary"
        >
          <Rocket className="size-5" aria-hidden="true" />
          <span className="max-w-16 truncate">{nextTask ? "Continue" : "Done"}</span>
        </Link>
      </nav>
    </div>
  );
}
