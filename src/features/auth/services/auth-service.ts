import { supabase } from "@/lib/supabase";

interface Credenciales {
  email: string;
  password: string;
}

export async function iniciarSesion(credenciales: Credenciales): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword(credenciales);
  if (error) throw error;
}

export async function cerrarSesion(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
