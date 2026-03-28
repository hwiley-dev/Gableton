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
    <div className="auth-shell">
      <div className="auth-panel">
        <div>
          <div className="auth-panel__eyebrow">Orbital Link Required</div>
          <h1 className="auth-panel__title">Sign in to Gableton</h1>
          <p className="auth-panel__copy">
            Gableton will open your default browser to complete sign-in securely.
          </p>
        </div>

        <div className="auth-instruction-block">
          <ol>
            <li>Click <strong>Continue in browser</strong>.</li>
            <li>Complete sign-in in your normal browser.</li>
            <li>Return to Gableton after the browser callback closes.</li>
          </ol>
        </div>

        {effectiveError ? (
          <div className="error-text">{effectiveError}</div>
        ) : null}

        <button
          type="button"
          disabled={isBusy || !apiBaseUrl}
          onClick={() => void handleSignIn()}
          className="action-button action-button--primary"
        >
          {status === "signing_in" ? "Waiting for browser sign-in..." : "Continue in browser"}
        </button>

        <div className="mono-text">
          API endpoint: {apiBaseUrl ?? "Not configured"}
        </div>
      </div>
    </div>
  );
}
