import { authorize } from "./_lib/authz.js";
import { hasSponsorshipAccess } from "./_lib/registry.js";
import { queueAccessLog } from "./_lib/audit.js";

function deniedData() {
  return new Response(JSON.stringify({ ok: false, code: "sponsorship_not_allowed", error: "Sponsorship access is required" }), {
    status: 403,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const isProtectedDocument = path === "/" || path.endsWith("/index.html");
  const isProtectedData = path.endsWith("/data/dashboard.json");
  if (!isProtectedDocument && !isProtectedData) return context.next();

  try {
    const { user } = await authorize(context);
    if (!hasSponsorshipAccess(user)) throw Object.assign(new Error("Sponsorship access is not allowed"), { status: 403, code: "sponsorship_not_allowed" });
    queueAccessLog(context, { project: "Sponsorship Tracking", reportKey: "sponsorship", action: isProtectedData ? "data" : "view", result: "allowed", user });
    return context.next();
  } catch (error) {
    queueAccessLog(context, { project: "Sponsorship Tracking", reportKey: "sponsorship", action: isProtectedData ? "data" : "view", result: error?.code || "denied" });
    if (isProtectedData) return deniedData();
    const login = new URL("/login.html", context.request.url);
    login.searchParams.set("reason", error?.code || "login_required");
    return Response.redirect(login.toString(), 302);
  }
}
