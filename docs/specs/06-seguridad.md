« [Spec](README.md)

# 6. Seguridad

## Reglas

- **El frontend nunca usa la secret key.** Solo la publishable key, y toda protección real vive en RLS.
- **RLS deny-all por defecto.** Cada tabla tiene una policy explícita que exige `auth.uid() is not null`.
- **Un solo usuario** ([R7](02-restricciones.md)), creado a mano en Supabase Auth con correo y contraseña fijos. Signup público deshabilitado en la configuración del proyecto.
- **Secretos fuera del bundle**: credencial IMAP de `info@`, API key del LLM, secreto HMAC del webhook y consumer key de WooCommerce viven en los secretos de las Edge Functions. Vault se reserva para lo que necesita SQL: la key con que `pg_cron` invoca una función.
- **El buzón se abre con `EXAMINE`, no con `SELECT`.** Es el modo de solo lectura de IMAP: el servidor rechaza marcar leído o borrar. La credencial alcanza todo `info@` —costo de leer el buzón del negocio en vez de uno dedicado, decisión del dueño— pero el código no puede modificarlo aunque un bug lo intente, y solo descarga correos cuyo remitente esté en `config.remitentes_banco`.
- **Los pagos son inmutables con un trigger, no solo con un `revoke`.** El `revoke update` cubre a `anon` y `authenticated`; la secret key los salta. El trigger `pagos_inmutables` rechaza el `UPDATE` también para ella.
- **WooCommerce con consumer key de solo lectura**, coherente con [P1](03-principios.md).
- **La función `upsert_pedido` revoca `execute` a `public`, `anon` y `authenticated`.** Solo la secret key la ejecuta. Revocar únicamente de `anon`/`authenticated` no alcanza: Postgres otorga `EXECUTE` a `PUBLIC` en toda función nueva y esos roles heredan de ahí.

## Por qué el usuario vive en Supabase Auth y no en el código

El cliente pidió algo simple: credenciales fijas, sin gestión de usuarios. Eso se respeta — pero **un login con credenciales quemadas en el frontend no protegería nada** en esta arquitectura.

Razón: React corre en la máquina del visitante. La publishable key viaja dentro del bundle de JavaScript. Cualquiera abre DevTools, saca la key y hace:

```bash
curl "https://<proyecto>.supabase.co/rest/v1/pedidos" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

Eso se salta la pantalla de login por completo y descarga la tabla entera. La puerta con candado está ahí, pero la pared no existe.

La solución conserva lo que el cliente quería: **un único usuario creado a mano en Supabase Auth**, con correo y contraseña fijos que nunca cambian. Sin registro, sin recuperación, sin gestionar nada. La diferencia es que Supabase emite un JWT real y RLS lo verifica del lado del servidor.

Costo: unas 15 líneas de código y una fila insertada una vez. La pared existe.

## Qué datos están en juego

Nombres, montos y fechas de transferencias de terceros — los clientes de OrganicoCR, que no son parte de esta decisión. Son datos personales y financieros bajo la **Ley 8968** de Costa Rica.

## Verificación

La garantía se comprueba, no se asume:

```bash
curl "http://127.0.0.1:54321/rest/v1/pedidos" -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY"
```

Debe devolver `[]` — array vacío, no un error. RLS no rechaza: simplemente no devuelve filas. Esa es la prueba de que la publishable key sola no ve nada.

---

« [Modelo de datos](05-datos.md) · [Fases →](07-fases.md)
