import { useEffect } from "react";

export function OAuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payload = {
      type: "gableton-oauth-callback",
      code: params.get("code"),
      state: params.get("state"),
      error: params.get("error")
    };

    if (window.opener) {
      window.opener.postMessage(payload, window.location.origin);
    }

    window.setTimeout(() => {
      window.close();
    }, 150);
  }, []);

  return (
    <div className="auth-shell">
      <div className="auth-panel" style={{ width: "min(420px, 100%)" }}>
        <div className="auth-panel__eyebrow">Handshake Complete</div>
        <h1 className="auth-panel__title">Gableton</h1>
        <p className="auth-panel__copy">
          Finishing browser sign-in. You can return to the app.
        </p>
      </div>
    </div>
  );
}
