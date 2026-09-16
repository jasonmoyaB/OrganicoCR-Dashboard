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
- **Toda función `security definer` lleva DOS revokes, no uno.** Postgres otorga `EXECUTE` a `PUBLIC` en toda función nueva, y Supabase **además** otorga `EXECUTE` nominal a `anon` y `authenticated` por default privileges del esquema `public`. Revocar de `PUBLIC` no toca esos grants nominales, y revocar solo de `anon, authenticated` deja vivo el de `PUBLIC`. Hacen falta las dos líneas.
- **`resolver_conciliacion` es la única función con `grant execute ... to authenticated`.** Como es `security definer` y salta RLS, verifica `auth.uid()` a mano. Sin sesión devuelve `permission denied for function`. Confirmar y descartar pasan por ahí y no por dos updates desde el cliente: marcar el pedido `pagado` y que después el índice único rechace la conciliación dejaría un cobro sin pago que lo respalde.
- **La llave privada VAPID vive en los secretos de la Edge Function.** La pública sí va en el bundle con prefijo `VITE_`, y eso es correcto por diseño: es la mitad que el navegador le muestra al servicio de push. Con la privada, cualquiera puede mandarle notificaciones al dueño haciéndose pasar por el dashboard.
- **`verify_jwt` no protege a `enviar-push`.** Acepta cualquier JWT del proyecto, y la publishable key es uno de ellos: viaja en el bundle que descarga el navegador. La función decodifica el bearer y exige `role = service_role`. **Lee el payload sin verificar la firma, y eso solo vale porque `verify_jwt` sigue activo**: el gateway es quien la verifica. Si alguna vez se apaga para esta función, el chequeo deja de valer.
- **No se compara contra `SUPABASE_SERVICE_ROLE_KEY`.** Fue el primer intento y en producción daba 401: lo que el runtime inyecta ahí no es el mismo string que el trigger saca de Vault. Verificado en la nube el 2026-09-15 — service_role da 200, la publishable key da 401.

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

Para los revokes, la única fuente fiable es la base, no el error de un `curl`:

```sql
select proname, array_to_string(proacl, ',') from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and prosecdef;   -- solo postgres y service_role
```

**Cómo distinguir los fallos:** `permission denied for function` = el revoke funciona · `new row violates row-level security policy` = la función corrió y solo RLS la detuvo · `PGRST202` con 404 = ambiguo, puede ser la firma del argumento y no el permiso, así que no sirve como prueba.

Verificado el 2026-09-14: con solo el revoke de `PUBLIC`, `POST /rest/v1/rpc/conciliar_pago` con la publishable key devolvía **204** — la función `security definer` corría para cualquiera que abriera el bundle.

---

« [Modelo de datos](05-datos.md) · [Fases →](07-fases.md)
