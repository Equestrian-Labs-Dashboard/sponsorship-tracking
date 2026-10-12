import { getValues } from "./google.js";

let cache = { key: "", at: 0, users: new Map() };

const SPONSORSHIP_ALIASES = [
  "sponsorship",
  "sponsorship tracking",
  "sponsor",
  "sponsors",
];

function normalize(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function cleanHeader(value) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

export function parseReportAccess(value) {
  const raw = String(value || "").trim();
  const normalized = normalize(raw);
  if (!raw) return { raw, all: false, tokens: [] };
  if (["all", "todos", "todo", "all reports"].includes(normalized) || normalized.includes("all reports")) {
    return { raw, all: true, tokens: ["all"] };
  }
  const tokens = new Set();
  for (const part of raw.split(/[;,|/]+|\s+and\s+|\s+y\s+/i).map(normalize).filter(Boolean)) {
    if (["all", "todos", "todo"].includes(part)) {
      tokens.add("all");
      continue;
    }
    if (["no", "none", "deny", "denied", "blocked", "false"].includes(part)) tokens.add("blocked");
    if (SPONSORSHIP_ALIASES.some(alias => part === alias || part.includes(alias))) tokens.add("sponsorship");
  }
  if (tokens.has("all")) return { raw, all: true, tokens: ["all"] };
  return { raw, all: false, tokens: [...tokens] };
}

export function hasSponsorshipAccess(user) {
  const access = user?.reportAccess || { all: false, tokens: [] };
  return !access.tokens.includes("blocked") && (access.all || access.tokens.includes("sponsorship"));
}

function findHeaders(values) {
  for (let row = 0; row < Math.min(values.length, 15); row += 1) {
    const headers = (values[row] || []).map(cleanHeader);
    const email = headers.findIndex(header => ["email", "emailaddress", "useremail"].includes(header));
    const access = headers.findIndex(header => ["reportaccess", "access", "reports", "reportpermissions"].includes(header));
    if (email >= 0 && access >= 0) {
      return {
        row,
        name: headers.findIndex(header => ["username", "name", "user"].includes(header)),
        email,
        access,
      };
    }
  }
  throw new Error("User Access Registry must contain Email and Report Access headers");
}

async function loadUsers(env) {
  const sheetId = String(env.USER_REGISTRY_SHEET_ID || "").trim();
  const tab = String(env.USER_REGISTRY_TAB || "User Access Registry").trim();
  if (!sheetId) throw new Error("USER_REGISTRY_SHEET_ID is not configured");
  const key = `${sheetId}|${tab}`;
  const ttl = Math.max(5, Number(env.USER_REGISTRY_CACHE_SECONDS || 30)) * 1000;
  if (cache.key === key && Date.now() - cache.at < ttl) return cache.users;

  const escapedTab = tab.replace(/'/g, "''");
  const result = await getValues(env, sheetId, `'${escapedTab}'!A:Z`);
  const values = Array.isArray(result.values) ? result.values : [];
  if (!values.length) throw new Error("User Access Registry is empty or unreadable");
  const headers = findHeaders(values);
  const users = new Map();
  for (const row of values.slice(headers.row + 1)) {
    const email = normalize(row[headers.email]);
    if (!email || !email.includes("@")) continue;
    const name = headers.name >= 0 ? String(row[headers.name] || "").trim() : "";
    const accessRaw = String(row[headers.access] || "").trim();
    users.set(email, {
      email,
      name: name || email,
      accessRaw,
      reportAccess: parseReportAccess(accessRaw),
    });
  }
  cache = { key, at: Date.now(), users };
  return users;
}

export async function getRegistryUser(env, email) {
  return (await loadUsers(env)).get(normalize(email)) || null;
}
