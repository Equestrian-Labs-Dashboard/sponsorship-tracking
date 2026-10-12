import { verifyGoogleIdToken } from "../_lib/google_identity.js";
import { createSessionToken, sessionCookie } from "../_lib/session.js";
import { assertUserActive } from "../_lib/authz.js";
import { getRegistryUser, hasSponsorshipAccess } from "../_lib/registry.js";
import { errorJson, json } from "../_lib/http.js";
import { queueAccessLog } from "../_lib/audit.js";

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    const credential = String(body?.credential || "").trim();
    if (!credential) return errorJson("Google credential is required", 400, "credential_missing");

    const identity = await verifyGoogleIdToken(credential, context.env);
    const user = assertUserActive(await getRegistryUser(context.env, identity.email));
    if (!hasSponsorshipAccess(user)) {
      throw Object.assign(new Error("Your verified email is not authorized for Sponsorship Tracking"), { status: 403, code: "sponsorship_not_allowed" });
    }
    const { token, ttl } = await createSessionToken(context.env, user.email);
    queueAccessLog(context, { project: "Sponsorship Tracking", reportKey: "sponsorship", action: "login", result: "allowed", user });
    const response = json({ ok: true, email: user.email, user: user.name });
    response.headers.set("set-cookie", sessionCookie(token, ttl));
    return response;
  } catch (error) {
    queueAccessLog(context, { project: "Sponsorship Tracking", reportKey: "sponsorship", action: "login", result: error?.code || "denied" });
    return errorJson(error?.message || "Sign in failed", Number(error?.status || 500), error?.code || "sign_in_failed");
  }
}
