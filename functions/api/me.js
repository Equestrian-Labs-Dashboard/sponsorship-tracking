import { authorize } from "../_lib/authz.js";
import { json, errorJson } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const { user } = await authorize(context);
    return json({
      ok: true,
      email: user.email,
      user: user.name,
      accessRaw: user.reportAccess.raw,
      access: user.reportAccess.tokens,
      all: user.reportAccess.all,
    });
  } catch (e) {
    return errorJson(e?.message || "Access check failed", Number(e?.status || 500), e?.code || "access_check_failed");
  }
}
