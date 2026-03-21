function normalizeBaseUrl(value?: string): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/\/+$/, "");
}

export function getConfiguredApiBaseUrl(): string | undefined {
  const runtimeBaseUrl =
    typeof window !== "undefined" ? window.gabletonRuntimeConfig?.apiBaseUrl : undefined;
  return normalizeBaseUrl(runtimeBaseUrl || import.meta.env.VITE_GABLETON_API_BASE_URL);
}
