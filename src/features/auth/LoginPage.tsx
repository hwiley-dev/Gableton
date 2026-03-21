import { useState } from "react";
import { useAuthSession } from "../../services/auth/provider";

export function LoginPage() {
  const { signIn, status, error, apiBaseUrl } = useAuthSession();
  const [localError, setLocalError] = useState<string>();

  const handleSignIn = async () => {
    setLocalError(undefined);
    const result = await signIn();
    if (!result.ok) {
      setLocalError(result.reason);
    }
  };

  const effectiveError = localError || error;
  const isBusy = status === "signing_in" || status === "booting";

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
          width: 460,
          display: "grid",
          gap: 18,
          padding: 32,
          border: "1px solid #d7d7d7",
          borderRadius: 12,
          background: "#ffffff"
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Sign in to Gableton</h1>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Gableton will open your default browser to complete sign-in securely.
          </p>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            background: "#f9fafb",
            color: "#374151",
            fontSize: 14,
            lineHeight: 1.5
          }}
        >
          <div>1. Click <strong>Continue in browser</strong>.</div>
          <div>2. Complete sign-in in your normal browser.</div>
          <div>3. Gableton will finish the session and return you to the app.</div>
        </div>

        {effectiveError ? (
          <div style={{ color: "#b42318", fontSize: 14 }}>{effectiveError}</div>
        ) : null}

        <button
          type="button"
          disabled={isBusy || !apiBaseUrl}
          onClick={() => void handleSignIn()}
          style={{
            padding: "12px 14px",
            borderRadius: 8,
            border: "1px solid #111827",
            background: "#111827",
            color: "#ffffff"
          }}
        >
          {status === "signing_in" ? "Waiting for browser sign-in..." : "Continue in browser"}
        </button>

        <div style={{ fontSize: 12, color: "#6b7280" }}>
          API endpoint: {apiBaseUrl ?? "Not configured"}
        </div>
      </div>
    </div>
  );
}
