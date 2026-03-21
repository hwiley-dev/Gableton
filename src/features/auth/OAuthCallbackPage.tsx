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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f3f4f6",
        color: "#111827"
      }}
    >
      <div
        style={{
          width: 360,
          padding: 32,
          border: "1px solid #d7d7d7",
          borderRadius: 12,
          background: "#ffffff"
        }}
      >
        <h1 style={{ marginTop: 0 }}>Gableton</h1>
        <p style={{ marginBottom: 0 }}>Finishing browser sign-in. You can return to the app.</p>
      </div>
    </div>
  );
}
