/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GABLETON_API_BASE_URL?: string;
  readonly VITE_GABLETON_API_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  gabletonRuntimeConfig?: {
    apiBaseUrl?: string;
  };
}
