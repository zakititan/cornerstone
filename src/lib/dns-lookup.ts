/**
 * DNS-over-HTTPS (DoH) Client & Domain Propagation Checker
 * Uses public DoH providers (Cloudflare & Google DNS) to query real-time DNS records.
 */

export interface DnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

export interface DnsResponse {
  Status: number; // 0 = NOERROR, 3 = NXDOMAIN, 2 = SERVFAIL
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question?: { name: string; type: number }[];
  Answer?: DnsAnswer[];
  Authority?: DnsAnswer[];
  Comment?: string;
}

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SOA" | "SRV";

const RECORD_TYPES: Record<DnsRecordType, number> = {
  A: 1,
  NS: 2,
  CNAME: 5,
  SOA: 6,
  MX: 15,
  TXT: 16,
  AAAA: 28,
  SRV: 33,
};

/**
 * Normalise user domain input
 */
export function normaliseDomain(input: string): string {
  let clean = input.trim().toLowerCase();
  clean = clean.replace(/^https?:\/\//, "");
  clean = clean.replace(/^www\./, "");
  clean = clean.replace(/\/.*$/, "");
  clean = clean.replace(/\.$/, "");
  return clean;
}

/**
 * Query DNS-over-HTTPS via Cloudflare or Google fallback
 */
export async function queryDoh(
  name: string,
  type: DnsRecordType,
  timeoutMs = 6000,
): Promise<{ success: boolean; data?: DnsResponse; error?: string; providerUsed?: string }> {
  const cleanName = name.trim().replace(/\.$/, "");

  // Provider 1: Cloudflare DoH (Fastest, standard JSON)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleanName)}&type=${type}`;
    const res = await fetch(cfUrl, {
      headers: { Accept: "application/dns-json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = (await res.json()) as DnsResponse;
      return { success: true, data: json, providerUsed: "Cloudflare 1.1.1.1" };
    }
  } catch {
    // Fallback to Google DNS DoH
  }

  // Provider 2: Google Public DNS DoH
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const googleUrl = `https://dns.google/resolve?name=${encodeURIComponent(cleanName)}&type=${type}`;
    const res = await fetch(googleUrl, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = (await res.json()) as DnsResponse;
      return { success: true, data: json, providerUsed: "Google 8.8.8.8" };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to query DNS-over-HTTPS servers.",
    };
  }

  return { success: false, error: "No DNS response returned from public resolvers." };
}

export interface ParsedMxRecord {
  priority: number;
  host: string;
  raw: string;
}

export interface SpfAnalysis {
  raw?: string;
  isValid: boolean;
  status: "secure" | "warning" | "missing" | "misconfigured";
  includes: string[];
  allMechanism?: "~all" | "-all" | "?all" | "+all";
  detectedServices: string[];
  recommendation: string;
}

export interface DmarcAnalysis {
  raw?: string;
  isValid: boolean;
  status: "enforced" | "monitoring" | "missing" | "misconfigured";
  policy?: "none" | "quarantine" | "reject";
  rua?: string;
  ruf?: string;
  pct?: number;
  recommendation: string;
}

export interface DkimAnalysis {
  selectorChecked: string;
  found: boolean;
  type?: "TXT" | "CNAME";
  value?: string;
  status: "active" | "missing";
}

export interface DnsDiagnosticReport {
  domain: string;
  checkedAt: string;
  overallGrade: "A+" | "A" | "B" | "C" | "F";
  overallScore: number; // 0 - 100
  summary: string;
  // A / CNAME (Website)
  website: {
    resolves: boolean;
    records: { type: "A" | "AAAA" | "CNAME"; value: string; ttl: number }[];
    detectedHost?: string;
    status: "live" | "warning" | "offline";
    message: string;
  };
  // MX (Mail)
  mail: {
    hasMx: boolean;
    records: ParsedMxRecord[];
    detectedProvider?: string;
    status: "active" | "warning" | "missing";
    message: string;
  };
  // SPF
  spf: SpfAnalysis;
  // DMARC
  dmarc: DmarcAnalysis;
  // DKIM
  dkim: DkimAnalysis[];
  // Nameservers
  nameservers: {
    servers: string[];
    detectedProvider?: string;
  };
  rawResponses: Record<string, DnsResponse | undefined>;
}

/**
 * Detects known hosting platforms from IP or CNAME
 */
function detectHostingPlatform(records: { type: string; value: string }[]): string | undefined {
  for (const r of records) {
    const val = r.value.toLowerCase();
    if (val.includes("myshopify.com") || val === "23.227.38.65") return "Shopify";
    if (
      val.includes("squarespace") ||
      val.startsWith("198.185.159.") ||
      val.startsWith("198.49.23.")
    )
      return "Squarespace";
    if (val.includes("wixdns.net") || val.includes("wix") || val.startsWith("185.230.63."))
      return "Wix";
    if (val.includes("vercel-dns") || val === "76.76.21.21") return "Vercel";
    if (val.includes("netlify") || val === "75.2.60.5") return "Netlify";
    if (val.includes("wordpress") || val.includes("automattic")) return "WordPress.com";
    if (val.includes("cloudflare") || val.startsWith("104.21.") || val.startsWith("172.67."))
      return "Cloudflare Proxy";
    if (val.includes("github.io") || val.startsWith("185.199.")) return "GitHub Pages";
    if (val.includes("ghost.io")) return "Ghost";
    if (val.includes("webflow") || val === "75.2.70.75" || val === "99.83.190.102")
      return "Webflow";
  }
  return undefined;
}

/**
 * Detects email provider from MX records
 */
function detectEmailProvider(mxRecords: ParsedMxRecord[]): string | undefined {
  const hosts = mxRecords.map((m) => m.host.toLowerCase()).join(" ");
  if (hosts.includes("titan.email")) return "Titan Mail";
  if (
    hosts.includes("google.com") ||
    hosts.includes("googlemail.com") ||
    hosts.includes("aspmx.l.google.com")
  )
    return "Google Workspace (Gmail)";
  if (
    hosts.includes("outlook.com") ||
    hosts.includes("microsoft.com") ||
    hosts.includes("protection.outlook")
  )
    return "Microsoft 365 (Exchange)";
  if (hosts.includes("zoho.com") || hosts.includes("zoho.eu")) return "Zoho Mail";
  if (hosts.includes("fastmail.com") || hosts.includes("fmhosted.com")) return "Fastmail";
  if (
    hosts.includes("icloud.com") ||
    hosts.includes("mail.me.com") ||
    hosts.includes("icloudmailadmin")
  )
    return "Apple iCloud+ Mail";
  if (hosts.includes("secureserver.net")) return "GoDaddy Email";
  if (hosts.includes("privateemail.com")) return "Namecheap Private Email";
  if (hosts.includes("mailgun.org")) return "Mailgun";
  if (hosts.includes("sendgrid.net")) return "SendGrid";
  if (hosts.includes("protonmail.ch") || hosts.includes("proton.me")) return "Proton Mail";
  return undefined;
}

/**
 * Detects DNS provider from NS records
 */
function detectDnsProvider(nsServers: string[]): string | undefined {
  const text = nsServers.map((s) => s.toLowerCase()).join(" ");
  if (text.includes("cloudflare.com")) return "Cloudflare DNS";
  if (text.includes("domaincontrol.com")) return "GoDaddy DNS";
  if (text.includes("registrar-servers.com")) return "Namecheap DNS";
  if (text.includes("googledomains.com") || text.includes("cloud-dns")) return "Google Cloud DNS";
  if (text.includes("awsdns")) return "Amazon Route 53";
  if (text.includes("porkbun.com")) return "Porkbun DNS";
  if (text.includes("hover.com")) return "Hover DNS";
  if (text.includes("digitalocean.com")) return "DigitalOcean DNS";
  if (text.includes("dns-parking.com") || text.includes("hostinger.com")) return "Hostinger DNS";
  if (text.includes("bluehost.com")) return "Bluehost DNS";
  if (text.includes("siteground.net")) return "SiteGround DNS";
  return undefined;
}

/**
 * Parses raw MX data strings like "10 mx1.titan.email."
 */
function parseMxRecords(answers?: DnsAnswer[]): ParsedMxRecord[] {
  if (!answers || answers.length === 0) return [];
  const parsed: ParsedMxRecord[] = [];

  for (const a of answers) {
    if (a.type !== 15 && a.type !== RECORD_TYPES.MX) continue;
    const cleanData = a.data.trim().replace(/^"|"$/g, "");
    const parts = cleanData.split(/\s+/);
    if (parts.length >= 2) {
      const priority = parseInt(parts[0] || "0", 10);
      const host = parts.slice(1).join(" ").replace(/\.$/, "");
      parsed.push({ priority: isNaN(priority) ? 0 : priority, host, raw: a.data });
    } else {
      parsed.push({ priority: 10, host: cleanData.replace(/\.$/, ""), raw: a.data });
    }
  }

  return parsed.sort((a, b) => a.priority - b.priority);
}

/**
 * Analyses SPF record
 */
function analyzeSpf(txtAnswers?: DnsAnswer[]): SpfAnalysis {
  if (!txtAnswers || txtAnswers.length === 0) {
    return {
      isValid: false,
      status: "missing",
      includes: [],
      detectedServices: [],
      recommendation:
        "No SPF record detected. Create a TXT record with 'v=spf1 include:... ~all' to prevent spoofing.",
    };
  }

  const spfRecords: string[] = [];
  for (const a of txtAnswers) {
    const val = a.data.replace(/^"|"$/g, "").replace(/""/g, "");
    if (val.startsWith("v=spf1")) {
      spfRecords.push(val);
    }
  }

  if (spfRecords.length === 0) {
    return {
      isValid: false,
      status: "missing",
      includes: [],
      detectedServices: [],
      recommendation:
        "No SPF record found in TXT entries. Add an SPF TXT record for your business email provider.",
    };
  }

  if (spfRecords.length > 1) {
    return {
      raw: spfRecords.join(" | "),
      isValid: false,
      status: "misconfigured",
      includes: [],
      detectedServices: [],
      recommendation:
        "CRITICAL ERROR: Multiple SPF records found. RFC 7208 forbids having more than one SPF TXT record. Merge them into a single record.",
    };
  }

  const spf = spfRecords[0];
  if (!spf) {
    return {
      isValid: false,
      status: "missing",
      includes: [],
      detectedServices: [],
      recommendation: "No SPF record found.",
    };
  }
  const includes: string[] = [];
  const detectedServices: string[] = [];
  let allMechanism: "~all" | "-all" | "?all" | "+all" | undefined;

  const parts = spf.split(/\s+/);
  for (const part of parts) {
    if (part.startsWith("include:")) {
      const inc = part.replace("include:", "");
      includes.push(inc);
      if (inc.includes("titan.email")) detectedServices.push("Titan Mail");
      if (inc.includes("google.com")) detectedServices.push("Google Workspace");
      if (inc.includes("outlook.com")) detectedServices.push("Microsoft 365");
      if (inc.includes("zoho.com")) detectedServices.push("Zoho Mail");
      if (inc.includes("mailgun")) detectedServices.push("Mailgun");
      if (inc.includes("sendgrid")) detectedServices.push("SendGrid");
      if (inc.includes("amazonses")) detectedServices.push("Amazon SES");
      if (inc.includes("shopify")) detectedServices.push("Shopify");
      if (inc.includes("zendesk")) detectedServices.push("Zendesk");
    }
    if (part === "~all" || part === "-all" || part === "?all" || part === "+all") {
      allMechanism = part as "~all" | "-all" | "?all" | "+all";
    }
  }

  const isSecure = allMechanism === "~all" || allMechanism === "-all";

  return {
    raw: spf,
    isValid: true,
    status: isSecure ? "secure" : "warning",
    includes,
    allMechanism,
    detectedServices,
    recommendation: isSecure
      ? "SPF is active and properly configured with strict sender verification."
      : "SPF ends with permissive flag (" +
        (allMechanism || "+all") +
        "). Change to ~all (SoftFail) or -all (HardFail).",
  };
}

/**
 * Analyses DMARC record from `_dmarc.<domain>`
 */
function analyzeDmarc(dmarcAnswers?: DnsAnswer[]): DmarcAnalysis {
  if (!dmarcAnswers || dmarcAnswers.length === 0) {
    return {
      isValid: false,
      status: "missing",
      recommendation:
        "No DMARC record detected at _dmarc. Add 'v=DMARC1; p=quarantine; rua=mailto:...' to enforce anti-spoofing.",
    };
  }

  const records: string[] = [];
  for (const a of dmarcAnswers) {
    const val = a.data.replace(/^"|"$/g, "").replace(/""/g, "");
    if (val.startsWith("v=DMARC1")) {
      records.push(val);
    }
  }

  if (records.length === 0) {
    return {
      isValid: false,
      status: "missing",
      recommendation:
        "No v=DMARC1 record found at _dmarc hostname. Add a DMARC TXT record to meet 2025/2026 inbox sender requirements.",
    };
  }

  const dmarc = records[0];
  if (!dmarc) {
    return {
      isValid: false,
      status: "missing",
      recommendation: "No DMARC record found.",
    };
  }
  let policy: "none" | "quarantine" | "reject" | undefined;
  let rua: string | undefined;
  let ruf: string | undefined;
  let pct: number | undefined;

  const tags = dmarc.split(";").map((t) => t.trim());
  for (const tag of tags) {
    const [key, ...rest] = tag.split("=");
    const val = rest.join("=").trim();
    if (!key) continue;
    const cleanKey = key.trim().toLowerCase();

    if (cleanKey === "p") {
      if (val === "reject") policy = "reject";
      else if (val === "quarantine") policy = "quarantine";
      else policy = "none";
    }
    if (cleanKey === "rua") rua = val;
    if (cleanKey === "ruf") ruf = val;
    if (cleanKey === "pct") pct = parseInt(val, 10);
  }

  const isEnforced = policy === "quarantine" || policy === "reject";

  return {
    raw: dmarc,
    isValid: true,
    status: isEnforced ? "enforced" : "monitoring",
    policy,
    rua,
    ruf,
    pct,
    recommendation: isEnforced
      ? `DMARC is active with strong '${policy}' enforcement protection against unauthorized spoofers.`
      : "DMARC is set to 'p=none' (Monitoring mode). Outgoing emails are tracked but unauthorized spoofed emails are not blocked.",
  };
}

/**
 * Runs a full, comprehensive DNS diagnostic on a domain
 */
export async function checkFullDomainPropagation(
  domainInput: string,
  preferredProviderId?: string,
): Promise<DnsDiagnosticReport> {
  const domain = normaliseDomain(domainInput);
  const rawResponses: Record<string, DnsResponse | undefined> = {};

  // 1. Parallel DNS queries
  const [
    aRes,
    aaaaRes,
    cnameRes,
    wwwARes,
    mxRes,
    txtRes,
    dmarcRes,
    nsRes,
    dkimTitan1,
    dkimTitan2,
    dkimGoogle,
    dkimM365,
    dkimZoho,
    dkimFastmail,
  ] = await Promise.all([
    queryDoh(domain, "A"),
    queryDoh(domain, "AAAA"),
    queryDoh(domain, "CNAME"),
    queryDoh(`www.${domain}`, "A"),
    queryDoh(domain, "MX"),
    queryDoh(domain, "TXT"),
    queryDoh(`_dmarc.${domain}`, "TXT"),
    queryDoh(domain, "NS"),
    queryDoh(`titan1._domainkey.${domain}`, "TXT"),
    queryDoh(`titan2._domainkey.${domain}`, "TXT"),
    queryDoh(`google._domainkey.${domain}`, "TXT"),
    queryDoh(`selector1._domainkey.${domain}`, "TXT"),
    queryDoh(`zoho._domainkey.${domain}`, "TXT"),
    queryDoh(`fm1._domainkey.${domain}`, "TXT"),
  ]);

  rawResponses["A"] = aRes.data;
  rawResponses["MX"] = mxRes.data;
  rawResponses["TXT"] = txtRes.data;
  rawResponses["DMARC"] = dmarcRes.data;
  rawResponses["NS"] = nsRes.data;

  // Process A / CNAME
  const websiteRecords: { type: "A" | "AAAA" | "CNAME"; value: string; ttl: number }[] = [];
  if (aRes.data?.Answer) {
    for (const a of aRes.data.Answer) {
      if (a.type === 1) websiteRecords.push({ type: "A", value: a.data, ttl: a.TTL });
    }
  }
  if (aaaaRes.data?.Answer) {
    for (const a of aaaaRes.data.Answer) {
      if (a.type === 28) websiteRecords.push({ type: "AAAA", value: a.data, ttl: a.TTL });
    }
  }
  if (cnameRes.data?.Answer) {
    for (const a of cnameRes.data.Answer) {
      if (a.type === 5)
        websiteRecords.push({ type: "CNAME", value: a.data.replace(/\.$/, ""), ttl: a.TTL });
    }
  }
  if (wwwARes.data?.Answer) {
    for (const a of wwwARes.data.Answer) {
      if (a.type === 1 && !websiteRecords.some((r) => r.value === a.data)) {
        websiteRecords.push({ type: "A", value: `www -> ${a.data}`, ttl: a.TTL });
      }
    }
  }

  const websiteResolves = websiteRecords.length > 0;
  const detectedHost = detectHostingPlatform(websiteRecords);

  // Process MX
  const mxRecords = parseMxRecords(mxRes.data?.Answer);
  const hasMx = mxRecords.length > 0;
  const detectedMailProvider = detectEmailProvider(mxRecords);

  // Process SPF
  const spfAnalysis = analyzeSpf(txtRes.data?.Answer);

  // Process DMARC
  const dmarcAnalysis = analyzeDmarc(dmarcRes.data?.Answer);

  // Process Nameservers
  const nsServers = (nsRes.data?.Answer || [])
    .filter((a) => a.type === 2)
    .map((a) => a.data.replace(/\.$/, ""));
  const detectedDns = detectDnsProvider(nsServers);

  // Process DKIM selectors
  const dkimChecks: DkimAnalysis[] = [];
  if (dkimTitan1.data?.Answer && dkimTitan1.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `titan1._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimTitan1.data.Answer[0]?.data,
      status: "active",
    });
  }
  if (dkimTitan2.data?.Answer && dkimTitan2.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `titan2._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimTitan2.data.Answer[0]?.data,
      status: "active",
    });
  }
  if (dkimGoogle.data?.Answer && dkimGoogle.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `google._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimGoogle.data.Answer[0]?.data,
      status: "active",
    });
  }
  if (dkimM365.data?.Answer && dkimM365.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `selector1._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimM365.data.Answer[0]?.data,
      status: "active",
    });
  }
  if (dkimZoho.data?.Answer && dkimZoho.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `zoho._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimZoho.data.Answer[0]?.data,
      status: "active",
    });
  }
  if (dkimFastmail.data?.Answer && dkimFastmail.data.Answer.length > 0) {
    dkimChecks.push({
      selectorChecked: `fm1._domainkey.${domain}`,
      found: true,
      type: "TXT",
      value: dkimFastmail.data.Answer[0]?.data,
      status: "active",
    });
  }

  // Calculate Health Score (0 - 100)
  let score = 0;
  if (websiteResolves) score += 20;
  if (hasMx) score += 30;
  if (spfAnalysis.isValid) {
    if (spfAnalysis.status === "secure") score += 25;
    else score += 15;
  }
  if (dmarcAnalysis.isValid) {
    if (dmarcAnalysis.status === "enforced") score += 20;
    else score += 10;
  }
  if (dkimChecks.length > 0) score += 5;

  let overallGrade: "A+" | "A" | "B" | "C" | "F" = "F";
  if (score >= 90) overallGrade = "A+";
  else if (score >= 80) overallGrade = "A";
  else if (score >= 60) overallGrade = "B";
  else if (score >= 40) overallGrade = "C";
  else overallGrade = "F";

  let summary = "";
  if (overallGrade === "A+") {
    summary =
      "Superb setup! Website resolution, active MX mail routing, SPF authentication, and DMARC enforcement are all verified live.";
  } else if (overallGrade === "A") {
    summary =
      "Strong configuration. Mail servers and basic authentication are active. Consider upgrading DMARC to 'p=quarantine' or adding DKIM for perfection.";
  } else if (overallGrade === "B") {
    summary =
      "Basic email routing is active, but missing SPF or DMARC authentication puts your messages at risk of spam folders.";
  } else if (overallGrade === "C") {
    summary =
      "Partial DNS records found. Ensure your MX records and SPF TXT records are saved at your domain registrar.";
  } else {
    summary =
      "No active mail or web records detected. Ensure nameservers are assigned and DNS records have finished propagating (can take up to 24h).";
  }

  return {
    domain,
    checkedAt: new Date().toISOString(),
    overallGrade,
    overallScore: score,
    summary,
    website: {
      resolves: websiteResolves,
      records: websiteRecords,
      detectedHost,
      status: websiteResolves ? "live" : "offline",
      message: websiteResolves
        ? `Resolves to ${websiteRecords.length} record(s)${detectedHost ? ` on ${detectedHost}` : ""}.`
        : "No A or CNAME records found pointing your domain to a web server.",
    },
    mail: {
      hasMx,
      records: mxRecords,
      detectedProvider: detectedMailProvider,
      status: hasMx ? "active" : "missing",
      message: hasMx
        ? `${mxRecords.length} MX record(s) detected${detectedMailProvider ? ` (${detectedMailProvider})` : ""}.`
        : "No MX records found. Outbound or inbound business emails cannot function.",
    },
    spf: spfAnalysis,
    dmarc: dmarcAnalysis,
    dkim: dkimChecks,
    nameservers: {
      servers: nsServers,
      detectedProvider: detectedDns,
    },
    rawResponses,
  };
}

export interface DomainConflictIssue {
  id: string;
  severity: "blocker" | "warning" | "pass";
  category: "email" | "website" | "security" | "dns";
  title: string;
  description: string;
  impact: string;
  remediation: string;
  suggestedRecord?: {
    type: string;
    host: string;
    value: string;
    action: "create" | "replace" | "delete";
  };
}

export interface DomainHealthAuditReport {
  domain: string;
  checkedAt: string;
  overallScore: number;
  overallGrade: "A+" | "A" | "B" | "C" | "F";
  status: "ready" | "needs_attention" | "blocked";
  issues: DomainConflictIssue[];
  metrics: {
    totalChecked: number;
    passed: number;
    warnings: number;
    blockers: number;
  };
  diagnosticReport: DnsDiagnosticReport;
}

/**
 * Runs a complete, automated domain health and conflict audit
 * Checks for RFC violations, conflicting SPF strings, root CNAME collisions,
 * missing DMARC enforcement, and broken www subdomains.
 */
export async function runCompleteDomainAudit(
  domainInput: string,
  options?: {
    expectedHosting?: string;
    expectedEmail?: string;
    usesBusinessEmail?: boolean;
  },
): Promise<DomainHealthAuditReport> {
  const diagnostic = await checkFullDomainPropagation(domainInput, options?.expectedHosting);
  const issues: DomainConflictIssue[] = [];
  const domain = diagnostic.domain;

  // 1. Check Nameserver Delegation
  if (diagnostic.nameservers.servers.length === 0) {
    issues.push({
      id: "no-nameservers",
      severity: "blocker",
      category: "dns",
      title: "No Nameservers Delegated",
      description: `Domain "${domain}" does not have any active authoritative nameservers responding.`,
      impact:
        "The entire domain is inactive. Neither your website nor email will work for anyone worldwide.",
      remediation:
        "Sign in to your domain registrar and assign primary nameservers (e.g. your registrar's default DNS or Cloudflare).",
    });
  } else {
    issues.push({
      id: "nameservers-ok",
      severity: "pass",
      category: "dns",
      title: "Authoritative Nameservers Active",
      description: `${diagnostic.nameservers.servers.length} nameserver(s) delegated (${diagnostic.nameservers.detectedProvider || diagnostic.nameservers.servers[0]}).`,
      impact: "Global DNS queries can reach your authoritative DNS provider.",
      remediation: "No action needed.",
    });
  }

  // 2. Check for Multiple SPF Records (RFC 7208 Violation)
  const txtRawAnswers = diagnostic.rawResponses["TXT"]?.Answer || [];
  const spfEntries = txtRawAnswers
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"|"$/g, "").replace(/""/g, ""))
    .filter((v) => v.startsWith("v=spf1"));

  if (spfEntries.length > 1) {
    const combinedIncludes = Array.from(
      new Set(
        spfEntries.flatMap((s) =>
          s
            .split(/\s+/)
            .filter((p) => p.startsWith("include:"))
            .map((p) => p.trim()),
        ),
      ),
    );
    const combinedSpf = `v=spf1 ${combinedIncludes.join(" ")} ~all`;

    issues.push({
      id: "multiple-spf-conflict",
      severity: "blocker",
      category: "email",
      title: "Fatal Conflict: Multiple SPF Records Detected (RFC 7208)",
      description: `Found ${spfEntries.length} separate SPF TXT records. RFC 7208 strictly specifies that a domain MUST NOT have more than one SPF TXT record.`,
      impact:
        "Major email providers (Google, Microsoft, Yahoo) will treat this as a fatal 'PermError'. Your business emails will be rejected or routed straight to Spam.",
      remediation:
        "Delete all duplicate SPF records and replace them with a single consolidated SPF record containing all your senders.",
      suggestedRecord: {
        type: "TXT",
        host: "@",
        value: combinedSpf,
        action: "replace",
      },
    });
  } else if (spfEntries.length === 1) {
    const spf = diagnostic.spf;
    if (spf.allMechanism === "+all" || spf.allMechanism === "?all") {
      issues.push({
        id: "permissive-spf",
        severity: "warning",
        category: "security",
        title: "Permissive SPF Qualifier Detected",
        description: `Your SPF record ends with "${spf.allMechanism}", which fails to instruct mail servers to reject or quarantine unauthorized senders.`,
        impact:
          "Spammers can forge emails pretending to be from your business address with minimal barrier.",
        remediation:
          "Update the trailing mechanism from " +
          spf.allMechanism +
          " to ~all (SoftFail) or -all (HardFail).",
        suggestedRecord: {
          type: "TXT",
          host: "@",
          value: spf.raw?.replace(/\s+(\+all|\?all)$/, " ~all") || "v=spf1 ~all",
          action: "replace",
        },
      });
    } else {
      issues.push({
        id: "spf-healthy",
        severity: "pass",
        category: "email",
        title: "SPF Authentication Active & Strict",
        description: `SPF record is configured with ${spf.allMechanism || "~all"} and ${spf.includes.length} authorized include(s).`,
        impact: "Outgoing business emails pass SPF cryptographic checks.",
        remediation: "No action needed.",
      });
    }
  } else if (diagnostic.mail.hasMx || options?.usesBusinessEmail) {
    issues.push({
      id: "missing-spf",
      severity: "blocker",
      category: "email",
      title: "Missing SPF Anti-Spoofing TXT Record",
      description:
        "Mail servers (MX) are active, but no TXT record beginning with 'v=spf1' was found.",
      impact:
        "Emails sent from your domain will fail DMARC and SPF alignment, landing in spam folders under Google and Yahoo sender policies.",
      remediation: "Add an SPF TXT record pointing to your mail provider.",
      suggestedRecord: {
        type: "TXT",
        host: "@",
        value: options?.expectedEmail?.toLowerCase().includes("google")
          ? "v=spf1 include:_spf.google.com ~all"
          : options?.expectedEmail?.toLowerCase().includes("microsoft")
            ? "v=spf1 include:spf.protection.outlook.com ~all"
            : "v=spf1 include:spf.titan.email ~all",
        action: "create",
      },
    });
  }

  // 3. Check DMARC Policy (Mandatory Google/Yahoo requirement)
  if (!diagnostic.dmarc.isValid || diagnostic.dmarc.status === "missing") {
    const isBlocker = diagnostic.mail.hasMx || options?.usesBusinessEmail;
    issues.push({
      id: "missing-dmarc",
      severity: isBlocker ? "blocker" : "warning",
      category: "security",
      title: "Missing DMARC Policy (_dmarc TXT)",
      description: `No DMARC record found at "_dmarc.${domain}". DMARC is required by modern inbox providers to verify sender authenticity.`,
      impact:
        "Without DMARC, emails from your domain are at severe risk of being outright rejected by Gmail, Yahoo, Apple Mail, and Outlook.",
      remediation:
        "Publish a DMARC TXT record at host '_dmarc'. Start with 'p=none' or 'p=quarantine'.",
      suggestedRecord: {
        type: "TXT",
        host: "_dmarc",
        value: `v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc-reports@${domain}`,
        action: "create",
      },
    });
  } else if (diagnostic.dmarc.policy === "none") {
    issues.push({
      id: "dmarc-monitoring",
      severity: "warning",
      category: "security",
      title: "DMARC Set to Monitoring Mode (p=none)",
      description:
        "DMARC is active but running in audit/monitoring mode (p=none). Spoofed emails are tracked but not blocked.",
      impact:
        "Unauthorized senders can still send fake messages claiming to be your domain, though reports will be generated.",
      remediation:
        "Once normal business email delivery is verified, upgrade policy from 'p=none' to 'p=quarantine' or 'p=reject'.",
      suggestedRecord: {
        type: "TXT",
        host: "_dmarc",
        value: `v=DMARC1; p=quarantine; sp=quarantine; rua=${diagnostic.dmarc.rua || `mailto:dmarc@${domain}`}`,
        action: "replace",
      },
    });
  } else {
    issues.push({
      id: "dmarc-enforced",
      severity: "pass",
      category: "security",
      title: `DMARC Enforcement Active (p=${diagnostic.dmarc.policy})`,
      description: `Your domain enforces strict ${diagnostic.dmarc.policy} protection against email impersonators.`,
      impact: "Unauthorized third-parties cannot send mail from your domain.",
      remediation: "No action needed.",
    });
  }

  // 4. Check Root CNAME Collision (RFC 1912 / 2181)
  const rootAnswers = diagnostic.rawResponses["A"]?.Answer || [];
  const rootHasCname =
    rootAnswers.some((a) => a.type === 5) ||
    (diagnostic.rawResponses["CNAME"]?.Answer?.length ?? 0) > 0;
  if (rootHasCname && diagnostic.mail.hasMx) {
    issues.push({
      id: "root-cname-mx-collision",
      severity: "blocker",
      category: "dns",
      title: "Apex CNAME & MX Record Conflict (RFC 1912)",
      description:
        "A CNAME record was detected directly at the root zone (@). In standard DNS, a CNAME at the apex overrides all other records (including MX mail records), breaking incoming email.",
      impact:
        "Incoming customer emails may bounce or disappear because mail servers cannot find MX records under an apex CNAME.",
      remediation:
        "Replace the root CNAME with direct A records pointing to your web host's IP address, or ensure your DNS provider uses CNAME Flattening / ALIAS.",
    });
  }

  // 5. Check Website Resolution (Root A / AAAA)
  if (!diagnostic.website.resolves) {
    issues.push({
      id: "website-not-resolving",
      severity: "blocker",
      category: "website",
      title: "Root Domain Has No Web Server IP",
      description: `Neither A nor CNAME records exist pointing "${domain}" to a web hosting server.`,
      impact:
        "Visitors typing your web address in a browser will encounter a 'Server IP address could not be found' error.",
      remediation:
        "Add an A record pointing to your web host's server IP address (e.g. Shopify 23.227.38.65, Squarespace 198.185.159.144, or your host's IP).",
    });
  } else {
    issues.push({
      id: "website-resolves-ok",
      severity: "pass",
      category: "website",
      title: "Website Address Resolves",
      description: `Resolves to ${diagnostic.website.records.length} record(s)${diagnostic.website.detectedHost ? ` on ${diagnostic.website.detectedHost}` : ""}.`,
      impact: "Visitors can load your website server over HTTP/HTTPS.",
      remediation: "No action needed.",
    });
  }

  // 6. Check www Subdomain Routing
  const wwwRecord = diagnostic.website.records.find(
    (r) => r.value.startsWith("www ->") || r.type === "CNAME",
  );
  const hasWwwResolution = Boolean(wwwRecord) || diagnostic.website.records.length > 0;
  if (!wwwRecord) {
    issues.push({
      id: "missing-www-routing",
      severity: "warning",
      category: "website",
      title: "Missing www Subdomain Alignment",
      description: `Could not verify a distinct CNAME or A record for "www.${domain}".`,
      impact:
        "Customers who type 'www.' before your domain in their browser might see a connection error instead of your site.",
      remediation: `Add a CNAME record with host "www" pointing to your root domain or web host alias.`,
      suggestedRecord: {
        type: "CNAME",
        host: "www",
        value: domain,
        action: "create",
      },
    });
  } else {
    issues.push({
      id: "www-routing-ok",
      severity: "pass",
      category: "website",
      title: "www Subdomain Configured",
      description: `Traffic to "www.${domain}" is properly aliased to your web host.`,
      impact: "Both bare domain and www formats reach your website.",
      remediation: "No action needed.",
    });
  }

  // 7. Check Mail Records (MX)
  if (options?.usesBusinessEmail && !diagnostic.mail.hasMx) {
    issues.push({
      id: "missing-mx-email",
      severity: "blocker",
      category: "email",
      title: "No MX (Mail Exchange) Records Found",
      description: "Business email was marked as required, but no MX records are published in DNS.",
      impact:
        "Your business cannot receive emails. Senders will get 'Mailbox not found' or 'No mail exchange' bounce notifications.",
      remediation:
        "Add the required MX records from your email provider (e.g. Google Workspace, Microsoft 365, Titan).",
    });
  } else if (diagnostic.mail.hasMx) {
    issues.push({
      id: "mx-healthy",
      severity: "pass",
      category: "email",
      title: "Mail Exchange (MX) Active",
      description: `${diagnostic.mail.records.length} MX record(s) detected (${diagnostic.mail.detectedProvider || "Custom Email"}).`,
      impact: "Incoming customer emails can be routed to your inbox provider.",
      remediation: "No action needed.",
    });
  }

  // 8. DKIM Check
  const activeDkim = diagnostic.dkim.filter((d) => d.found);
  if (diagnostic.mail.hasMx && activeDkim.length === 0) {
    issues.push({
      id: "dkim-advisory",
      severity: "warning",
      category: "security",
      title: "DKIM Cryptographic Key Not Detected on Default Selectors",
      description:
        "Could not detect DKIM keys on common provider selectors (google, titan1, selector1, zoho).",
      impact:
        "Emails may lack cryptographic signing headers, slightly lowering deliverability into corporate Microsoft/Google spam filters.",
      remediation:
        "Sign in to your email admin dashboard and activate DKIM signing by copying the provided TXT/CNAME records into your registrar DNS.",
    });
  } else if (activeDkim.length > 0) {
    issues.push({
      id: "dkim-active",
      severity: "pass",
      category: "security",
      title: "DKIM Signature Keys Active",
      description: `Found active DKIM selector: ${activeDkim[0]?.selectorChecked}`,
      impact: "Emails from your domain contain cryptographic tamper-proofing.",
      remediation: "No action needed.",
    });
  }

  // Calculate Metrics
  const blockers = issues.filter((i) => i.severity === "blocker").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const passed = issues.filter((i) => i.severity === "pass").length;
  const totalChecked = issues.length;

  let overallScore = 100 - blockers * 28 - warnings * 12;
  if (overallScore < 0) overallScore = 0;

  let overallGrade: "A+" | "A" | "B" | "C" | "F" = "F";
  if (blockers === 0 && warnings === 0) overallGrade = "A+";
  else if (blockers === 0 && warnings <= 2) overallGrade = "A";
  else if (blockers === 0) overallGrade = "B";
  else if (blockers === 1) overallGrade = "C";
  else overallGrade = "F";

  const status = blockers > 0 ? "blocked" : warnings > 0 ? "needs_attention" : "ready";

  return {
    domain,
    checkedAt: new Date().toISOString(),
    overallScore,
    overallGrade,
    status,
    issues,
    metrics: {
      totalChecked,
      passed,
      warnings,
      blockers,
    },
    diagnosticReport: diagnostic,
  };
}
