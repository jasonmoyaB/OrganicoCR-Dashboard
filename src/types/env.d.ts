/// <reference types="vite/client" />

// `vite/client` declara ImportMetaEnv con index signature `any`. Sin este
// merge, `import.meta.env.VITE_SUPABASE_URL` entra al código como `any`.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  // Pública por definición: es la mitad que el navegador le muestra al
  // servicio de push para que acepte avisos firmados por nosotros. La
  // privada vive en la Edge Function y nunca lleva el prefijo VITE_.
  readonly VITE_VAPID_PUBLIC_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
