const message = document.getElementById("message");
const next = new URLSearchParams(window.location.search).get("next");

function setMessage(text) {
  message.textContent = text;
}

function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google Sign-In could not be loaded"));
    document.head.appendChild(script);
  });
}

async function signIn(response) {
  try {
    setMessage("Verifying your Google account...");
    const result = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const body = await result.json().catch(() => ({}));
    if (!result.ok || !body.ok) throw new Error(body.error || "Sign in failed");
    window.location.assign(next && next.startsWith("/") ? next : "/");
  } catch (error) {
    setMessage(error.message || "Sign in failed. Please contact the report administrator.");
  }
}

async function start() {
  try {
    const existing = await fetch("/api/me", { cache: "no-store" });
    if (existing.ok) {
      const session = await existing.json();
      if (session.ok) {
        window.location.replace("/");
        return;
      }
    }
    const configResponse = await fetch("/api/config", { cache: "no-store" });
    const config = await configResponse.json().catch(() => ({}));
    if (!configResponse.ok || !config.googleClientId) throw new Error(config.error || "Sign-in configuration is unavailable");
    await loadGoogleIdentity();
    google.accounts.id.initialize({ client_id: config.googleClientId, callback: signIn, ux_mode: "popup" });
    google.accounts.id.renderButton(document.getElementById("googleSignIn"), { theme: "outline", size: "large", width: 300, text: "signin_with" });
    setMessage("Use your authorized Google account.");
  } catch (error) {
    setMessage(error.message || "Sign-in configuration is unavailable");
  }
}

start();
