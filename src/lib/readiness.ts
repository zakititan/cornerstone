import type {
  BusinessProfile,
  LaunchBlocker,
  LaunchReadiness,
  LaunchTask,
  OwnershipRecord,
} from "./types";

/**
 * Deterministic launch readiness helper shared by Dashboard and Checklist.
 * Never uses guaranteed language — "ready_for_review" means "ready for final review".
 */

function findTaskId(tasks: LaunchTask[], needles: string[]): string | undefined {
  const lower = needles.map((n) => n.toLowerCase());
  const found = tasks.find((t) => lower.some((n) => t.title.toLowerCase().includes(n)));
  return found?.id;
}

function isComplete(tasks: LaunchTask[], needles: string[]): boolean {
  const lower = needles.map((n) => n.toLowerCase());
  const found = tasks.find((t) => lower.some((n) => t.title.toLowerCase().includes(n)));
  if (!found) return false;
  return found.status === "complete";
}

function hasAnyComplete(tasks: LaunchTask[], needles: string[]): boolean {
  const lower = needles.map((n) => n.toLowerCase());
  const candidates = tasks.filter((t) => lower.some((n) => t.title.toLowerCase().includes(n)));
  return candidates.some((t) => t.status === "complete");
}

function isTaskOutstanding(tasks: LaunchTask[], needles: string[]): boolean {
  // blocker outstanding if matching task exists and is not complete, or if no matching task but we treat as outstanding
  const lower = needles.map((n) => n.toLowerCase());
  const found = tasks.find((t) => lower.some((n) => t.title.toLowerCase().includes(n)));
  if (!found) return true;
  return found.status !== "complete";
}

export function getReadiness(
  tasks: LaunchTask[],
  business: BusinessProfile,
  ownership?: OwnershipRecord,
  customerJourneyTest?: boolean,
): LaunchReadiness {
  const total = tasks.length;
  const overallCompletionPercent = total
    ? Math.round((tasks.filter((t) => t.status === "complete").length / total) * 100)
    : 0;

  const requiredTasks = tasks.filter((t) => t.importance === "required");
  const totalRequiredTasks = requiredTasks.length;
  const completedRequiredTasks = requiredTasks.filter((t) => t.status === "complete").length;
  const requiredCompletionPercent = totalRequiredTasks
    ? Math.round((completedRequiredTasks / totalRequiredTasks) * 100)
    : 0;

  // not_started if no onboarding/plan (no tasks)
  if (!total) {
    return {
      status: "not_started",
      overallCompletionPercent,
      requiredCompletionPercent,
      completedRequiredTasks,
      totalRequiredTasks,
      blockers: [],
      nextRecommendedAction: "Create your launch plan to see what to review before launch.",
    };
  }

  const blockers: LaunchBlocker[] = [];

  // 1 - Domain ownership (critical, always relevant)
  {
    const id = "domain-ownership";
    const ownershipMarked =
      ownership &&
      [ownership.domainRegistrar, ownership.renewalDate].some((v) => (v ?? "").trim().length > 0);
    const domainTaskComplete = hasAnyComplete(tasks, [
      "choose and register your web address",
      "sign in to your existing domain",
      "confirm control",
    ]);
    const tfaComplete = isComplete(tasks, ["turn on two-step"]);
    const renewalComplete = isComplete(tasks, ["turn on renewal", "auto-renew"]);
    // outstanding if any core domain ownership signal incomplete
    const outstanding = !(
      domainTaskComplete &&
      tfaComplete &&
      renewalComplete &&
      (ownershipMarked ||
        business.ownedDomain.trim().length > 0 ||
        business.currentStatus !== "I already own a domain")
    );
    // Simplify: if any of domain tasks incomplete => blocker
    const simpleOutstanding =
      isTaskOutstanding(tasks, [
        "choose and register your web address",
        "sign in to your existing domain",
      ]) ||
      isTaskOutstanding(tasks, ["turn on two-step"]) ||
      isTaskOutstanding(tasks, ["turn on renewal"]);
    const isOutstanding = simpleOutstanding || outstanding;
    // Always evaluate; blockers only added when outstanding
    if (isOutstanding) {
      blockers.push({
        id,
        title: "Confirm your domain ownership",
        description:
          "Your web address is business property — review that it is registered in your own account with recovery access saved.",
        severity: "critical",
        relatedTaskId: findTaskId(tasks, [
          "choose and register your web address",
          "sign in to your existing domain",
        ]),
        relatedRoute: "/ownership-record",
        actionLabel: "Review ownership",
      });
    }
  }

  // 2 - Website connection (critical)
  {
    const id = "website-connection";
    const outstanding =
      isTaskOutstanding(tasks, ["point your web address at your website"]) ||
      isTaskOutstanding(tasks, ["take a screenshot of your current domain settings"]);
    if (outstanding) {
      blockers.push({
        id,
        title: "Connect your web address to your website",
        description:
          "Until your address points to your website, visitors will not reach the right place.",
        severity: "critical",
        relatedTaskId: findTaskId(tasks, ["point your web address at your website"]),
        relatedRoute: "/connect-domain",
        actionLabel: "Review connection",
      });
    }
  }

  // 3 - HTTPS (critical)
  {
    const id = "https";
    const outstanding = isTaskOutstanding(tasks, ["turn on https", "check for browser warnings"]);
    if (outstanding) {
      blockers.push({
        id,
        title: "Check HTTPS (padlock) for warnings",
        description:
          "Browsers warn visitors when the padlock is missing — review before you invite customers.",
        severity: "critical",
        relatedTaskId: findTaskId(tasks, ["turn on https"]),
        relatedRoute: "/connect-domain",
        actionLabel: "Review HTTPS",
      });
    }
  }

  // 4 - Test primary action (critical)
  {
    const id = "primary-action-test";
    let outstanding: boolean;
    if (typeof customerJourneyTest === "boolean") {
      outstanding = !customerJourneyTest;
    } else {
      // Prefer contact form test; if ecommerce/booking, also consider related tasks but keep deterministic
      outstanding = isTaskOutstanding(tasks, ["test your contact form"]);
    }
    if (outstanding) {
      blockers.push({
        id,
        title: "Test your primary customer action end to end",
        description:
          "Submit the form, booking or checkout yourself and confirm the message or order reaches the right inbox.",
        severity: "critical",
        relatedTaskId: findTaskId(tasks, ["test your contact form"]),
        relatedRoute: "/checklist",
        actionLabel: "Test your key action",
      });
    }
  }

  // 5 - Business details (important)
  {
    const id = "business-details";
    const outstanding =
      isTaskOutstanding(tasks, ["collect your business details"]) ||
      isTaskOutstanding(tasks, ["check spelling, prices, hours"]);
    if (outstanding) {
      blockers.push({
        id,
        title: "Complete core business details",
        description:
          "Review name, phone, address or service area, hours and prices — errors here reduce trust quickly.",
        severity: "important",
        relatedTaskId:
          findTaskId(tasks, ["collect your business details"]) ??
          findTaskId(tasks, ["check spelling, prices"]),
        relatedRoute: "/content",
        actionLabel: "Review details",
      });
    }
  }

  // 6 - Mobile review (important)
  {
    const id = "mobile-review";
    const outstanding = isTaskOutstanding(tasks, ["check every page on a real phone"]);
    if (outstanding) {
      blockers.push({
        id,
        title: "Review every page on a real phone",
        description:
          "Many customers visit on mobile — review for cut-off text and buttons that are hard to tap.",
        severity: "important",
        relatedTaskId: findTaskId(tasks, ["check every page on a real phone"]),
        relatedRoute: "/checklist",
        actionLabel: "Review on mobile",
      });
    }
  }

  // 7 - Protect email (important) — only when relevant to business model
  {
    const id = "protect-email";
    const needsEmail = business.needsBusinessEmail !== "no";
    if (needsEmail) {
      const outstanding = isTaskOutstanding(tasks, ["send and receive a test email"]);
      if (outstanding) {
        blockers.push({
          id,
          title: "Protect and test your business email",
          description:
            "Email delivery can be affected when domain settings change — send a test and keep mail records separate.",
          severity: "important",
          relatedTaskId: findTaskId(tasks, ["send and receive a test email"]),
          relatedRoute: "/business-email",
          actionLabel: "Review email",
        });
      }
    }
  }

  // 8 - Selling / data policies (important) — only when relevant
  {
    const id = "selling-data-policies";
    const needsSelling =
      business.needs?.includes("Ecommerce shop") ||
      business.needs?.includes("Online booking") ||
      business.needs?.includes("Members-only area") ||
      business.needs?.includes("Email newsletter signup") ||
      business.primaryGoal?.toLowerCase().includes("sell") ||
      business.category?.toLowerCase().includes("retail");
    if (needsSelling) {
      // No dedicated task exists in base seeds; treat as always outstanding until user dismisses via checklist? But we can tie to analytics/page tasks heuristic.
      // Deterministic: if selling, blocker exists until required tasks covering selling are done? For now, show blocker when selling and any required task incomplete or when selling-specific pages not complete.
      const sellingPageComplete = (() => {
        if (business.needs?.includes("Ecommerce shop")) {
          return isComplete(tasks, ["write your products page"]);
        }
        return true;
      })();
      // Show blocker if selling page not complete OR always prompt review for policy
      // We add blocker whenever selling is relevant and not all required selling signals are complete; to keep deterministic, only add if sellingPage not complete.
      // But spec expects blocker to appear for selling models; so always add when selling unless sellingPageComplete and requiredCompletionPercent 100?
      // Simpler: always add blocker when selling to prompt review; user resolves by checking via task? We'll require the task check — if selling page incomplete, definitely blocker; otherwise still show until manual review? To avoid never-clearing, use page check only.
      if (!sellingPageComplete) {
        blockers.push({
          id,
          title: "Review selling and data-use information",
          description:
            "If you take payments or collect personal data, review that terms, returns and privacy details are clear before you invite customers.",
          severity: "important",
          relatedTaskId:
            findTaskId(tasks, ["write your products page"]) ??
            findTaskId(tasks, ["schedule a monthly"]),
          relatedRoute: "/content",
          actionLabel: "Review policies",
        });
      } else if (business.needs?.includes("Ecommerce shop")) {
        // For ecommerce, still surface as important until overall readiness high; but make it so it only appears when blockers would otherwise be empty? No, keep hidden if selling page complete to avoid perpetual blocker.
        // Intentionally leave no blocker when selling page complete to allow ready_for_review.
      }
    }
  }

  // Status determination
  let status: LaunchReadiness["status"];
  if (!total) {
    status = "not_started";
  } else if (blockers.some((b) => b.severity === "critical")) {
    status = "blocked";
  } else if (completedRequiredTasks < totalRequiredTasks) {
    status = "nearly_ready";
  } else {
    status = "ready_for_review";
  }

  // Next recommended action — first critical blocker, else first important, else next incomplete required task
  let nextRecommendedAction: string | undefined;
  const firstCritical = blockers.find((b) => b.severity === "critical");
  const firstImportant = blockers.find((b) => b.severity === "important");
  if (firstCritical) nextRecommendedAction = firstCritical.actionLabel ?? firstCritical.title;
  else if (firstImportant)
    nextRecommendedAction = firstImportant.actionLabel ?? firstImportant.title;
  else {
    const nextRequired = requiredTasks.find((t) => t.status !== "complete");
    if (nextRequired) nextRecommendedAction = nextRequired.title;
    else {
      const nextAny = tasks.find((t) => t.status !== "complete");
      if (nextAny) nextRecommendedAction = nextAny.title;
    }
  }

  return {
    status,
    overallCompletionPercent,
    requiredCompletionPercent,
    completedRequiredTasks,
    totalRequiredTasks,
    blockers,
    nextRecommendedAction,
  };
}
