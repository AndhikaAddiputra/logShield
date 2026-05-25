/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COUCHDB_URL: string;
  readonly VITE_COUCHDB_USER: string;
  readonly VITE_COUCHDB_PASSWORD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
