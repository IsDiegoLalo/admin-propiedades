/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PROPERTIES_API_URL: string;
  readonly VITE_RESERVATIONS_API_URL: string;
  readonly VITE_REVIEWS_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
