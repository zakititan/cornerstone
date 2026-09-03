import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  BusinessProfile,
  ContentDraft,
  CustomerJourneyTest,
  DnsPlanningState,
  DomainShortlistStatus,
  LaunchTask,
  MaintenanceTask,
  OwnershipRecord,
  SavedDomainIdea,
  TaskStatus,
} from "./types";
import { defaultDnsPlanning, demoState, emptyState, generateTasks } from "./plan";

function normaliseDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

const STORAGE_KEY = "lmbo.state.v1";

interface StoreValue {
  state: AppState;
  hydrated: boolean;
  hasPlan: boolean;
  lastSavedAt: Date | null;
  saveStatus: "saved" | "saving";
  setBusiness: (patch: Partial<BusinessProfile>) => void;
  updateBusinessProfileField: <K extends keyof BusinessProfile>(
    field: K,
    value: BusinessProfile[K],
  ) => void;
  setOnboardingStep: (step: number) => void;
  generatePlan: () => void;
  loadDemo: () => void;
  resetAll: () => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, patch: Partial<LaunchTask>) => void;
  addTask: (task: Omit<LaunchTask, "id">) => void;
  updateMaintenance: (id: string, patch: Partial<MaintenanceTask>) => void;
  saveDraft: (pageType: string, fields: Record<string, string>) => void;
  setDraftStatus: (pageType: string, status: import("./types").ContentDraftStatus) => void;
  setOwnership: (patch: Partial<OwnershipRecord>) => void;
  toggleArticle: (slug: string) => void;
  signIn: (fullName: string, email: string) => void;
  signOut: () => void;
  setCustomerJourneyTest: (test: CustomerJourneyTest | undefined) => void;
  updateCustomerJourneyStep: (
    id: string,
    patch: Partial<import("./types").CustomerJourneyStepResult>,
  ) => void;
  upsertSavedDomain: (
    domain: string,
    opts?: {
      score?: SavedDomainIdea["score"];
      availability?: SavedDomainIdea["availability"];
      note?: string;
      status?: DomainShortlistStatus;
    },
  ) => void;
  updateSavedDomain: (
    id: string,
    patch: Partial<Omit<SavedDomainIdea, "id" | "createdAt">>,
  ) => void;
  removeSavedDomain: (id: string) => void;
  setSavedDomainStatus: (id: string, status: DomainShortlistStatus) => void;
  restoreBackup: (backup: unknown) => boolean;
  setLocalInsightsConsent: (allowed: boolean) => void;
  setDnsPlanning: (patch: Partial<DnsPlanningState>) => void;
  updateDnsPlanningField: <K extends keyof DnsPlanningState>(
    field: K,
    value: DnsPlanningState[K],
  ) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => emptyState());
  const [hydrated, setHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState> & {
          domainShortlist?: SavedDomainIdea[];
        };
        const base = emptyState();
        const merged: AppState = {
          ...base,
          ...parsed,
          business: { ...base.business, ...(parsed.business ?? {}) },
          ownership: { ...base.ownership, ...(parsed.ownership ?? {}) },
          // support legacy key domainShortlist and ensure default
          savedDomainIdeas:
            parsed.savedDomainIdeas ?? parsed.domainShortlist ?? base.savedDomainIdeas ?? [],
          dnsPlanning: {
            ...defaultDnsPlanning,
            ...(parsed.dnsPlanning ?? {}),
          },
        } as AppState;
        // ensure array
        if (!Array.isArray(merged.savedDomainIdeas)) merged.savedDomainIdeas = [];
        // ensure business defaults for new fields
        merged.business = { ...base.business, ...(merged.business ?? {}) } as BusinessProfile;
        if (!merged.dnsPlanning) merged.dnsPlanning = { ...defaultDnsPlanning };
        setState(merged);
        setLastSavedAt(new Date());
      }
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      setSaveStatus("saving");
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setLastSavedAt(new Date());
      setSaveStatus("saved");
      window.dispatchEvent(new CustomEvent("cornerstone:saved", { detail: { time: new Date() } }));
    } catch {
      /* storage may be unavailable */
    }
  }, [state, hydrated]);

  const patch = useCallback((fn: (prev: AppState) => AppState) => setState(fn), []);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      hydrated,
      hasPlan: state.onboardingComplete && state.tasks.length > 0,
      lastSavedAt,
      saveStatus,
      setBusiness: (p) => patch((s) => ({ ...s, business: { ...s.business, ...p } })),
      updateBusinessProfileField: (field, value) =>
        patch((s) => ({ ...s, business: { ...s.business, [field]: value } })),
      setOnboardingStep: (step) => patch((s) => ({ ...s, onboardingStep: step })),
      generatePlan: () =>
        patch((s) => ({
          ...s,
          onboardingComplete: true,
          tasks: generateTasks(s.business),
        })),
      loadDemo: () => setState(demoState()),
      resetAll: () => setState(emptyState()),
      setTaskStatus: (id, status) =>
        patch((s) => ({
          ...s,
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  completedAt: status === "complete" ? new Date().toISOString() : null,
                }
              : t,
          ),
        })),
      updateTask: (id, p) =>
        patch((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      addTask: (task) =>
        patch((s) => ({
          ...s,
          tasks: [...s.tasks, { ...task, id: `custom-${Date.now()}`, custom: true }],
        })),
      updateMaintenance: (id, p) =>
        patch((s) => ({
          ...s,
          maintenance: s.maintenance.map((m) => (m.id === id ? { ...m, ...p } : m)),
        })),
      saveDraft: (pageType, fields) =>
        patch((s) => {
          const existing = s.drafts[pageType];
          const draft: ContentDraft = {
            pageType,
            fields,
            updatedAt: new Date().toISOString(),
            status:
              existing?.status ??
              (Object.values(fields).some((v) => v.trim().length > 0) ? "draft" : "not_started"),
          };
          return { ...s, drafts: { ...s.drafts, [pageType]: draft } };
        }),
      setDraftStatus: (pageType: string, status: import("./types").ContentDraftStatus) =>
        patch((s) => {
          const existing = s.drafts[pageType];
          const draft: ContentDraft = {
            pageType,
            fields: existing?.fields ?? {},
            updatedAt: new Date().toISOString(),
            status,
          };
          return { ...s, drafts: { ...s.drafts, [pageType]: draft } };
        }),
      setOwnership: (p) => patch((s) => ({ ...s, ownership: { ...s.ownership, ...p } })),
      toggleArticle: (slug) =>
        patch((s) => ({
          ...s,
          completedArticles: s.completedArticles.includes(slug)
            ? s.completedArticles.filter((a) => a !== slug)
            : [...s.completedArticles, slug],
        })),
      signIn: (fullName, email) =>
        patch((s) => ({ ...s, account: { signedIn: true, fullName, email } })),
      signOut: () =>
        patch((s) => ({ ...s, account: { signedIn: false, fullName: "", email: "" } })),
      setCustomerJourneyTest: (test) => patch((s) => ({ ...s, customerJourneyTest: test })),
      updateCustomerJourneyStep: (id, p) =>
        patch((s) => {
          if (!s.customerJourneyTest) return s;
          return {
            ...s,
            customerJourneyTest: {
              ...s.customerJourneyTest,
              steps: s.customerJourneyTest.steps.map((st) => (st.id === id ? { ...st, ...p } : st)),
              lastUpdatedAt: new Date().toISOString(),
            },
          };
        }),
      upsertSavedDomain: (domain, opts) =>
        patch((s) => {
          const normalised = normaliseDomain(domain);
          const now = new Date().toISOString();
          const existingIndex = s.savedDomainIdeas.findIndex(
            (d) => normaliseDomain(d.domain) === normalised,
          );
          if (existingIndex >= 0) {
            const existing = s.savedDomainIdeas[existingIndex];
            if (!existing) return s;
            const updated: SavedDomainIdea = {
              ...existing,
              domain: normalised,
              score: opts?.score ?? existing.score,
              availability: opts?.availability ?? existing.availability,
              note: opts?.note ?? existing.note,
              status: opts?.status ?? existing.status,
              updatedAt: now,
            };
            const next = [...s.savedDomainIdeas];
            next[existingIndex] = updated;
            // if status is preferred, demote others
            if (updated.status === "preferred") {
              for (let i = 0; i < next.length; i++) {
                const item = next[i];
                if (item && item.id !== updated.id && item.status === "preferred") {
                  next[i] = { ...item, status: "considering", updatedAt: now };
                }
              }
            }
            return { ...s, savedDomainIdeas: next };
          }
          const newIdea: SavedDomainIdea = {
            id: `domain-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            domain: normalised,
            status: opts?.status ?? "considering",
            note: opts?.note,
            score: opts?.score,
            availability: opts?.availability,
            createdAt: now,
            updatedAt: now,
          };
          let next = [...s.savedDomainIdeas, newIdea];
          if (newIdea.status === "preferred") {
            next = next.map((item) =>
              item.id !== newIdea.id && item.status === "preferred"
                ? { ...item, status: "considering" as const, updatedAt: now }
                : item,
            );
          }
          return { ...s, savedDomainIdeas: next };
        }),
      updateSavedDomain: (id, p) =>
        patch((s) => ({
          ...s,
          savedDomainIdeas: s.savedDomainIdeas.map((d) =>
            d.id === id ? { ...d, ...p, updatedAt: new Date().toISOString() } : d,
          ),
        })),
      removeSavedDomain: (id) =>
        patch((s) => ({
          ...s,
          savedDomainIdeas: s.savedDomainIdeas.filter((d) => d.id !== id),
        })),
      setSavedDomainStatus: (id, status) =>
        patch((s) => {
          const now = new Date().toISOString();
          if (status === "preferred") {
            return {
              ...s,
              savedDomainIdeas: s.savedDomainIdeas.map((d) =>
                d.id === id
                  ? { ...d, status, updatedAt: now }
                  : d.status === "preferred"
                    ? { ...d, status: "considering" as const, updatedAt: now }
                    : d,
              ),
            };
          }
          return {
            ...s,
            savedDomainIdeas: s.savedDomainIdeas.map((d) =>
              d.id === id ? { ...d, status, updatedAt: now } : d,
            ),
          };
        }),
      restoreBackup: (backup) => {
        if (!backup || typeof backup !== "object") return false;
        type CompactTaskCandidate = {
          id?: string;
          i?: string;
          status?: TaskStatus;
          s?: TaskStatus;
          notes?: string;
          n?: string;
          completedAt?: string | null;
          c?: string | null;
          title?: string;
        };

        type BackupCandidate = {
          business?: Partial<BusinessProfile>;
          b?: Partial<BusinessProfile>;
          tasks?: (LaunchTask | CompactTaskCandidate)[];
          t?: CompactTaskCandidate[];
          ownership?: Partial<OwnershipRecord>;
          o?: Partial<OwnershipRecord>;
          maintenance?: MaintenanceTask[];
          drafts?: Record<string, ContentDraft>;
          d?: Record<string, ContentDraft>;
          savedDomainIdeas?: SavedDomainIdea[];
          sdi?: SavedDomainIdea[];
          dnsPlanning?: Partial<DnsPlanningState>;
          dp?: Partial<DnsPlanningState>;
          onboardingComplete?: boolean;
        };

        const candidate = backup as BackupCandidate;
        const base = emptyState();

        const candidateBusiness = candidate.business || candidate.b;
        if (!candidateBusiness || typeof candidateBusiness !== "object") return false;

        const mergedBusiness = { ...base.business, ...candidateBusiness };
        const defaultTasks = generateTasks(mergedBusiness);

        let restoredTasks = defaultTasks;
        if (Array.isArray(candidate.tasks) && candidate.tasks.length > 0) {
          if (typeof candidate.tasks[0]?.title === "string") {
            // Full tasks array
            restoredTasks = candidate.tasks as LaunchTask[];
          } else {
            // Compact tasks array [{ id, status, notes, completedAt }]
            const updateMap = new Map<string, CompactTaskCandidate>();
            candidate.tasks.forEach((t) => {
              if (t && (t.id || t.i)) updateMap.set(t.id || t.i || "", t);
            });
            restoredTasks = defaultTasks.map((task) => {
              const u = updateMap.get(task.id);
              if (!u) return task;
              return {
                ...task,
                status: u.status ?? u.s ?? task.status,
                notes: u.notes ?? u.n ?? task.notes,
                completedAt: u.completedAt ?? u.c ?? task.completedAt,
              };
            });
          }
        } else if (Array.isArray(candidate.t) && candidate.t.length > 0) {
          const updateMap = new Map<string, CompactTaskCandidate>();
          candidate.t.forEach((t) => {
            if (t && (t.id || t.i)) updateMap.set(t.id || t.i || "", t);
          });
          restoredTasks = defaultTasks.map((task) => {
            const u = updateMap.get(task.id);
            if (!u) return task;
            return {
              ...task,
              status: u.status ?? u.s ?? task.status,
              notes: u.notes ?? u.n ?? task.notes,
              completedAt: u.completedAt ?? u.c ?? task.completedAt,
            };
          });
        }

        const mergedOwnership = {
          ...base.ownership,
          ...(candidate.ownership || candidate.o || {}),
        };
        const mergedMaintenance = Array.isArray(candidate.maintenance)
          ? candidate.maintenance
          : base.maintenance;
        const mergedDrafts = candidate.drafts || candidate.d || {};
        const mergedSavedDomainIdeas = Array.isArray(candidate.savedDomainIdeas)
          ? candidate.savedDomainIdeas
          : Array.isArray(candidate.sdi)
            ? candidate.sdi
            : [];
        const mergedDnsPlanning = {
          ...defaultDnsPlanning,
          ...(candidate.dnsPlanning || candidate.dp || {}),
        };

        setState({
          ...base,
          business: mergedBusiness,
          ownership: mergedOwnership,
          tasks: restoredTasks,
          maintenance: mergedMaintenance,
          drafts: mergedDrafts,
          savedDomainIdeas: mergedSavedDomainIdeas,
          dnsPlanning: mergedDnsPlanning,
          onboardingComplete:
            candidate.onboardingComplete !== undefined
              ? Boolean(candidate.onboardingComplete)
              : true,
        });
        return true;
      },
      setLocalInsightsConsent: (allowed) => patch((s) => ({ ...s, localInsightsConsent: allowed })),
      setDnsPlanning: (p) =>
        patch((s) => ({
          ...s,
          dnsPlanning: { ...(s.dnsPlanning ?? defaultDnsPlanning), ...p },
        })),
      updateDnsPlanningField: (field, val) =>
        patch((s) => ({
          ...s,
          dnsPlanning: { ...(s.dnsPlanning ?? defaultDnsPlanning), [field]: val },
        })),
    }),
    [state, hydrated, patch, lastSavedAt, saveStatus],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
