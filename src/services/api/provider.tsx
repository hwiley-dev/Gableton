import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { DemoApiClient, HttpApiClient } from "./client";
import type { ApiClient } from "./types";
import { useAuthSession } from "../auth/provider";
import { getConfiguredApiBaseUrl } from "../runtime/config";

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ children }: PropsWithChildren) {
  const { session } = useAuthSession();

  const client = useMemo<ApiClient>(() => {
    const baseUrl = getConfiguredApiBaseUrl();
    const token = session?.accessToken || import.meta.env.VITE_GABLETON_API_TOKEN?.trim();

    if (baseUrl) {
      return new HttpApiClient({ baseUrl, token: token || undefined });
    }

    return new DemoApiClient();
  }, [session?.accessToken]);
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used inside ApiClientProvider.");
  }
  return client;
}
