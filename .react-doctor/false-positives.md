# Falsos positivos de React Doctor

Cada entrada exige evidencia verificada contra el código o el artefacto real, no
una impresión. Las supresiones viven en `doctor.config.json`, siempre acotadas
al archivo (o al glob más chico) **y** a la regla concreta: ninguna regla se
apaga a nivel de repo.

Verificado el 2026-09-11 con `react-doctor` (oxlint-plugin-react-doctor 0.9.3).

---

## `react-doctor/command-execution-input-risk`

**Ubicación:** `.agents/skills/skill-creator/eval-viewer/generate_review.py:291`

```python
result = subprocess.run(
    ["lsof", "-ti", f":{port}"],
    capture_output=True, text=True, timeout=5,
)
```

**Evidencia:**

1. **No hay shell.** La llamada usa la forma de lista con ejecutable fijo
   (`lsof`) y sin `shell=True`. Sin shell no hay metacaracteres que interpretar:
   la inyección de comandos es estructuralmente imposible, no improbable. La
   receta de la regla lo dice explícitamente — lo que dispara el detector es la
   interpolación del f-string, no un sink real.
2. **`port` no viene de un caller externo.** Nace en `argparse`
   (línea 390: `parser.add_argument("--port", "-p", type=int, default=3117)`),
   se lee en `main()` (línea 439: `port = args.port`) y se pasa a `_kill_port`.
   Es un argumento de línea de comandos ya convertido a `int` por argparse: no
   hay `request`, `query` ni `body` en ninguna parte del camino.
3. **No es código de producción ni web-facing.** Es una herramienta local de
   la skill vendorizada `skill-creator`: un CLI
   (`python generate_review.py <workspace-path>`) que además liga el servidor a
   `127.0.0.1` (línea 443). `grep -rn "eval-viewer\|generate_review" src
   supabase scripts` no devuelve nada: ningún archivo del proyecto lo importa ni
   lo ejecuta. El repo es un dashboard React/Vite; no despliega Python.
4. La regla declara que salta "repo dev-tooling (tools/, scripts/,
   management/commands, …)". `.agents/skills/**/eval-viewer/` es exactamente
   eso; el detector no reconoce esa forma de ruta.

**Resultado:** Rejected (falso positivo). Suprimido para ese archivo y esa
regla. No se edita el archivo: es código vendorizado de terceros y cualquier
cambio se pierde en la próxima actualización de la skill.

---

## `react-doctor/artifact-baas-authority-surface` (×2)

**Ubicación:** `dist/assets/index-*.js` y
`.claude/worktrees/admin-trab-modal/dist/assets/index-*.js`

**Evidencia:**

1. **El campo que dispara la regla no es nuestro.** El match cae dentro de
   `signInWithSSO` de `@supabase/auth-js@2.116.0`
   (`node_modules/.pnpm/@supabase+auth-js@2.116.0/.../GoTrueClient.js:2142`:
   `'providerId' in params ? { provider_id: params.providerId } : null`).
   `grep -rn "providerId\|ownerId\|tenantId\|isAdmin\|orgId" src/` devuelve
   **0 líneas**: ningún campo de autorización del proyecto viaja en el bundle.
   Lo que se envía es el SDK, no nuestro modelo de datos.
2. **La única tabla que el bundle nombra es `pedidos`** (4 ocurrencias), que no
   está en la lista de colecciones sensibles de la regla (users, profiles,
   organizations, memberships).
3. **La config de Supabase es pública por diseño y está documentada.** Solo
   viajan la URL y la publishable key (`docs/specs/06-seguridad.md`); la secret
   key nunca lleva prefijo `VITE_`.
4. **Cada frontera la aplica RLS del lado del servidor, comprobado en runtime**
   contra el stack local el 2026-09-11:
   - `GET /rest/v1/pedidos` con la publishable key sola → `[]`.
   - `PATCH` de `total_centimos` con un JWT `authenticated` → `403`
     (`42501 permission denied for table pedidos`).
   - `PATCH estado_pago=anulado` con un JWT `authenticated` → `403`
     (`new row violates row-level security policy`).
   - `PATCH estado_pago=pagado` (el único flujo de la app) → `204`.

   Los nombres que viajan son, entonces, reconocimiento de bajo valor y no una
   ruta de acceso: exactamente el predicado de supresión de la receta.

**Resultado:** Rejected (falso positivo). Suprimido con el glob más chico que
cubre el patrón (`dist/assets/*.js`), porque el nombre del archivo lleva hash de
contenido y cambia en cada build. El bundle es artefacto generado: no se edita.

---

## `react-doctor/supabase-rls-policy-risk`

**Ubicación:** `supabase/migrations/20260911182122_fase_a_pedidos.sql:127`

```sql
create policy "usuario autenticado actualiza pedidos"
  on pedidos for update
  to authenticated
  using (true)
  with check (true);
```

**Este hallazgo era genuino y se arregló.** No se suprime el problema: se
suprime la lectura de una migración inmutable ya aplicada, cuyo efecto quedó
revertido en `supabase/migrations/20260911205500_endurecer_update_pedidos.sql`.

**Evidencia del estado final** (tras `supabase db reset`, que aplica las tres
migraciones limpio):

```
 policyname                                  | cmd    | qual                                                            | with_check
 usuario autenticado lee pedidos             | SELECT | true                                                            |
 usuario autenticado marca el estado de pago | UPDATE | ((auth.uid() IS NOT NULL) AND (estado_pago <> 'anulado'::text))  | ((auth.uid() IS NOT NULL) AND (estado_pago = ANY (ARRAY['pendiente','revisar','pagado'])))
```

La policy `using (true) with check (true)` ya no existe. Y `authenticated` tiene
privilegio de UPDATE sobre **una sola columna**:

```
 privilege_type | column_name
 UPDATE         | estado_pago
```

Es el predicado de supresión que la propia receta contempla: «una migración que
afloja y vuelve a apretar en una sentencia posterior — verificá el estado final
de la policy». Acá el apriete vive en una migración posterior porque
`docs/referencia/convenciones.md` prohíbe editar una migración ya aplicada, y
esta se aplicó en producción (`docs/plans/fase-a/13-despliegue.md`, paso 1,
marcado hecho).

**Resultado:** hallazgo genuino corregido; supresión acotada a ese archivo y esa
regla. Toda migración futura sigue cubierta por la regla.

---

Verificado el 2026-09-14 contra `supabase/functions/correo-poll/`.

## `react-doctor/async-await-in-loop`

**Ubicación:** `supabase/functions/correo-poll/index.ts:43` y `:89`

```ts
for (const remitente of remitentes) {
  const respuesta = await buzon.texto(`UID SEARCH FROM "${remitente}" UID ${desde + 1}:*`);
  ...
}

for (const uid of uids) {
  conteo[await capturarCorreo(supabase, await traerCorreo(buzon, uid, uidvalidity))] += 1;
}
```

**Evidencia:**

1. **IMAP sobre una conexión es un protocolo serial, y el cliente lo asume.**
   `cliente-imap.ts` guarda el resto sin consumir en un único `pendiente` y
   numera las etiquetas con un `contador` compartido. Dos `ordenar()`
   concurrentes escribirían en el mismo socket y leerían del mismo buffer:
   las respuestas se mezclan y el `finDeRespuesta` de una corta la otra.
   Paralelizar acá no es "más rápido", es corromper el flujo.
2. **La alternativa que sugiere la regla no aplica.** `Promise.all` sobre
   estas iteraciones exigiría una conexión IMAP por remitente y por correo.
   El buzón es el del negocio y Dovecot limita conexiones concurrentes por
   usuario (`mail_max_userip_connections`, 10 por defecto en cPanel): abrir
   una por correo haría que el poll se auto-bloquee apenas entren 10 avisos.
3. **El orden es parte de la corrección, no un detalle.** Los UID se procesan
   ascendentes y el cursor avanza al último (`index.ts:97`). Con ejecución
   concurrente no hay "último" bien definido, y un fallo a mitad dejaría el
   cursor por delante de correos nunca capturados — que es exactamente el
   modo de fallo que el diseño evita (repetir es gratis, saltarse un pago no).

## `react-doctor/server-sequential-independent-await`

**Ubicación:** `supabase/functions/correo-poll/index.ts:70`

```ts
const { cursor, remitentes } = await leerConfigCorreo(supabase);
const buzon = await abrirBuzon(credencial());
```

**Evidencia:**

1. **Son independientes en los datos, no en los efectos.** `abrirBuzon` abre un
   socket TLS contra el servidor de correo. `leerConfigCorreo` lanza cuando
   `remitentes_banco` está vacía (`config-correo.ts:41`), justamente para que
   el poll no corra a ciegas.
2. **`Promise.all` filtraría la conexión.** Si `leerConfigCorreo` rechaza, el
   `Promise.all` rechaza de inmediato pero `abrirBuzon` sigue su curso y
   resuelve con un socket abierto que ya nadie cierra: el `try/finally` que
   llama a `buzon.cerrar()` nunca llegó a empezar. En una función que corre
   cada 5 minutos eso es un descriptor filtrado por corrida hasta agotar el
   límite de conexiones del buzón.
3. **Lo que se gana no compensa.** El ahorro es un viaje a Postgres local
   (milisegundos) frente a un handshake TLS contra un servidor remoto que se
   hace igual. No hay ganancia de latencia medible y sí un modo de fallo nuevo.
