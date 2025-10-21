/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TRACKIMO_USERNAME: string;
  readonly VITE_TRACKIMO_PASSWORD: string;
  readonly VITE_TRACKIMO_API_URL: string;
  readonly VITE_TRACKIMO_CLIENT_ID: string;
  readonly VITE_TRACKIMO_CLIENT_SECRET: string;
  readonly VITE_TRACKIMO_REDIRECT_URI: string;
  readonly VITE_ENVIRONMENT: string;
  readonly VITE_LOG_LEVEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
