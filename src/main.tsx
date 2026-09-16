import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { registrarServiceWorker } from "@/lib/registrar-service-worker";
import App from "./App";
import "./index.css";

// Antes del render y fuera de React: el worker no depende del árbol de
// componentes, y engancharlo a un efecto lo ataría al ciclo de vida de una
// pantalla que puede desmontarse.
registrarServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
