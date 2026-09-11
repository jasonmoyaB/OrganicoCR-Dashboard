// Recrea el usuario único del dashboard en el Supabase local.
// `supabase db reset` borra auth.users; este script lo repone.
// Idempotente: si el usuario ya existe, no hace nada.

const { SUPABASE_URL, SUPABASE_SECRET_KEY, DEV_LOGIN_EMAIL, DEV_LOGIN_PASSWORD } = process.env;

const faltantes = Object.entries({
  SUPABASE_URL,
  SUPABASE_SECRET_KEY,
  DEV_LOGIN_EMAIL,
  DEV_LOGIN_PASSWORD,
})
  .filter(([, valor]) => !valor)
  .map(([nombre]) => nombre);

if (faltantes.length > 0) {
  console.error(`Faltan variables en .env.local: ${faltantes.join(", ")}`);
  process.exit(1);
}

// El script escribe usuarios con la secret key. Apuntarlo a la nube por
// accidente crearía una cuenta real con una contraseña de desarrollo.
if (!SUPABASE_URL.includes("127.0.0.1") && !SUPABASE_URL.includes("localhost")) {
  console.error(`SUPABASE_URL no es local: ${SUPABASE_URL}. Abortado.`);
  process.exit(1);
}

const respuesta = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: DEV_LOGIN_EMAIL,
    password: DEV_LOGIN_PASSWORD,
    email_confirm: true,
  }),
});

const cuerpo = await respuesta.json();

if (respuesta.ok) {
  console.log(`Usuario creado: ${cuerpo.email}`);
  process.exit(0);
}

if (cuerpo.error_code === "email_exists") {
  console.log(`Usuario ya existe: ${DEV_LOGIN_EMAIL}`);
  process.exit(0);
}

console.error(`Error ${respuesta.status}: ${cuerpo.msg ?? JSON.stringify(cuerpo)}`);
process.exit(1);
