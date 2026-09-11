import { useState, type FormEvent } from "react";
import { iniciarSesion } from "../services/auth-service";

// Genérico a propósito: distinguir "ese correo no existe" de "contraseña
// incorrecta" le confirma a un atacante qué correos son válidos.
const MENSAJE_CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

export function useLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function manejarSubmit(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);

    try {
      await iniciarSesion({ email, password });
    } catch {
      setError(MENSAJE_CREDENCIALES_INVALIDAS);
    } finally {
      setEnviando(false);
    }
  }

  return { email, setEmail, password, setPassword, error, enviando, manejarSubmit };
}
