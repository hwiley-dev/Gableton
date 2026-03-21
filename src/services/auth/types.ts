export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  accessTokenExpiresAt: string;
}

export interface OAuthSignInRequest {
  apiBaseUrl: string;
  loginHint?: string;
}

export type AuthStatus = "booting" | "signed_out" | "signing_in" | "authenticated";

export interface AuthSessionValue {
  status: AuthStatus;
  session?: AuthSession;
  error?: string;
  apiBaseUrl?: string;
  signIn: () => Promise<{ ok: boolean; reason?: string }>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
}
