/// <reference types="vite/client" />

// `vite/client` declara ImportMetaEnv con index signature `any`. Sin este
// merge, `import.meta.env.VITE_SUPABASE_URL` entra al código como `any`.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
