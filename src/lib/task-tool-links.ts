import type { LaunchTask, PhaseKey } from "./types";

export interface TaskToolLink {
  to: string;
  label: string;
  description: string;
}

export function getTaskToolLink(task: LaunchTask): TaskToolLink {
  const title = (task.title || "").toLowerCase();
  const desc = (task.description || "").toLowerCase();
  const text = `${title} ${desc}`;

  // 1. Specific Keyword Matching
  if (text.includes("signature")) {
    return {
      to: "/email-signature",
      label: "Open Signature Generator",
      description: "Generate a branded HTML email signature with your logo and phone.",
    };
  }

  if (text.includes("email") || text.includes("inbox") || text.includes("mailbox")) {
    return {
      to: "/business-email",
      label: "Open Email Guide",
      description: "Compare business email hosts and configure MX & SPF records.",
    };
  }

  if (
    text.includes("dns") ||
    text.includes("nameserver") ||
    text.includes("cname") ||
    text.includes("a record") ||
    text.includes("connect your address")
  ) {
    return {
      to: "/connect-domain",
      label: "Open DNS & Health Audit",
      description: "Follow the step-by-step DNS connector and run live propagation checks.",
    };
  }

  if (text.includes("registrar") || text.includes("ownership") || text.includes("custody")) {
    return {
      to: "/ownership-record",
      label: "Log Ownership Record",
      description: "Record your registrar account, renewal date, and 2FA credentials.",
    };
  }

  if (text.includes("domain") || text.includes("web address") || text.includes("tld")) {
    return {
      to: "/domains",
      label: "Explore Domains",
      description: "Evaluate domain names, registrar pricing, and avoid hidden renewal markups.",
    };
  }

  if (
    text.includes("cost") ||
    text.includes("budget") ||
    text.includes("expense") ||
    text.includes("tco")
  ) {
    return {
      to: "/cost-calculator",
      label: "Calculate 3-Yr Costs",
      description: "Forecast domain, hosting, email, and plugin costs over 3 years.",
    };
  }

  if (
    text.includes("builder") ||
    text.includes("hosting") ||
    text.includes("platform") ||
    text.includes("shopify") ||
    text.includes("squarespace") ||
    text.includes("wordpress")
  ) {
    return {
      to: "/platform-matcher",
      label: "Compare Platforms",
      description: "Match your technical comfort and business model to the ideal website tool.",
    };
  }

  if (text.includes("review") || text.includes("testimonial") || text.includes("rating")) {
    return {
      to: "/review-kit",
      label: "Generate Review Kit",
      description: "Generate a direct Google review link and printable QR code cards.",
    };
  }

  if (
    text.includes("google") ||
    text.includes("map") ||
    text.includes("local seo") ||
    text.includes("search")
  ) {
    return {
      to: "/get-found",
      label: "Setup Local Search",
      description: "Verify your Google Business Profile and local directory citations.",
    };
  }

  if (
    text.includes("maintenance") ||
    text.includes("routine") ||
    text.includes("update") ||
    text.includes("backup")
  ) {
    return {
      to: "/maintenance",
      label: "View Care Routine",
      description: "Follow monthly 15-minute maintenance and security review steps.",
    };
  }

  if (
    text.includes("journey") ||
    text.includes("simulator") ||
    text.includes("mobile check") ||
    text.includes("real phone")
  ) {
    return {
      to: "/customer-journey",
      label: "Run Journey Test",
      description: "Stress test the 5 critical customer conversion touchpoints on mobile.",
    };
  }

  if (text.includes("preflight") || text.includes("launch readiness") || text.includes("blocker")) {
    return {
      to: "/preflight",
      label: "Run Preflight Check",
      description: "Verify critical launch blockers and live website response.",
    };
  }

  if (
    text.includes("dossier") ||
    text.includes("handover") ||
    text.includes("agency") ||
    text.includes("contractor")
  ) {
    return {
      to: "/launch-dossier",
      label: "Open Launch Dossier",
      description: "Generate an official digital asset deed and technician handover.",
    };
  }

  if (
    text.includes("content") ||
    text.includes("draft") ||
    text.includes("copy") ||
    text.includes("page") ||
    text.includes("about") ||
    text.includes("privacy")
  ) {
    return {
      to: "/content",
      label: "Draft Core Pages",
      description: "Write homepage, services, about, contact, and privacy policy copy.",
    };
  }

  // 2. Fallback to Phase-Based Navigation
  const phaseMap: Record<PhaseKey, TaskToolLink> = {
    plan: {
      to: "/business-profile",
      label: "Update Profile",
      description: "Refine your business goals, target audience, and primary offerings.",
    },
    domain: {
      to: "/domains",
      label: "Domain Advisor",
      description: "Search and validate domain name choices with registration safety checks.",
    },
    setup: {
      to: "/platform-matcher",
      label: "Platform Matcher",
      description:
        "Choose the website builder that best fits your technical comfort and business goals.",
    },
    build: {
      to: "/content",
      label: "Draft Core Pages",
      description: "Generate structured, conversion-ready copy for your essential website pages.",
    },
    connect: {
      to: "/connect-domain",
      label: "Open DNS Connector",
      description: "Step-by-step checklist to connect your domain without breaking email.",
    },
    launch: {
      to: "/preflight",
      label: "Pre-Flight Checklist",
      description: "Audit mobile responsiveness, form delivery, and domain resolution.",
    },
    grow: {
      to: "/get-found",
      label: "Local Growth Guide",
      description: "Establish your local search presence and gather high-trust customer reviews.",
    },
  };

  return (
    phaseMap[task.phase] || {
      to: "/dashboard",
      label: "Open Dashboard",
      description: "Review progress and next best actions for your digital launch.",
    }
  );
}
