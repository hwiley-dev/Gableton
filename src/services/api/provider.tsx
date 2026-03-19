import { createContext, useContext, useMemo, type PropsWithChildren } from "react";
import { DemoApiClient, HttpApiClient } from "./client";
import type { ApiClient } from "./types";

const ApiClientContext = createContext<ApiClient | null>(null);

export function ApiClientProvider({ children }: PropsWithChildren) {
  const client = useMemo<ApiClient>(() => {
    const baseUrl = import.meta.env.VITE_GABLETON_API_BASE_URL?.trim();
    const token = import.meta.env.VITE_GABLETON_API_TOKEN?.trim();

    if (baseUrl) {
      return new HttpApiClient({ baseUrl, token: token || undefined });
    }

    return new DemoApiClient();
  }, []);
  return <ApiClientContext.Provider value={client}>{children}</ApiClientContext.Provider>;
}

export function useApiClient(): ApiClient {
  const client = useContext(ApiClientContext);
  if (!client) {
    throw new Error("useApiClient must be used inside ApiClientProvider.");
  }
  return client;
}
