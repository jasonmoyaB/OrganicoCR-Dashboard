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

**Ubicación:** `supabase/functions/correo-poll/index.ts:52` y `:118`

```ts
for (const remitente of remitentes) {
  const respuesta = await buzon.texto(
    `UID SEARCH FROM ${entrecomillar(remitente)} UID ${desde + 1}:*`,
  );
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
   ascendentes y el cursor avanza al último (`index.ts:128`). Con ejecución
   concurrente no hay "último" bien definido, y un fallo a mitad dejaría el
   cursor por delante de correos nunca capturados — que es exactamente el
   modo de fallo que el diseño evita (repetir es gratis, saltarse un pago no).

## `react-doctor/server-sequential-independent-await`

**Ubicación:** `supabase/functions/correo-poll/index.ts:90–97`

```ts
const { cursor, remitentes } = await leerConfigCorreo(supabase);
const buzon = await abrirBuzon(credencial());
```

**Evidencia:**

1. **Son independientes en los datos, no en los efectos.** `abrirBuzon` abre un
   socket TLS contra el servidor de correo. `leerConfigCorreo` lanza cuando
   `remitentes_banco` está vacía (`config-correo.ts:42`), justamente para que
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

---

Verificado el 2026-09-16 con `react-doctor` (oxlint-plugin-react-doctor 0.9.3).

## `react-doctor/async-parallel`

**Ubicación:** `supabase/functions/correo-poll/index.ts:90–97`

```ts
const { cursor, remitentes } = await leerConfigCorreo(supabase);
const reprocesados = await reprocesarHuerfanos(supabase);
const buzon = await abrirBuzon(credencial());
```

**Evidencia:**

Es el mismo hallazgo que ya estaba adjudicado como
`react-doctor/server-sequential-independent-await` (ver la entrada del
2026-09-14): la regla cambió de nombre en 0.9.3 y ahora exige **tres** awaits
consecutivos, que es justo lo que quedó al insertar `reprocesarHuerfanos` en el
medio. La evidencia anterior sigue valiendo entera y se suma una razón nueva:

1. **`Promise.all` filtra el socket, igual que antes.** `leerConfigCorreo`
   lanza cuando `remitentes_banco` está vacía (`config-correo.ts:42`). Con
   `Promise.all` el rechazo es inmediato pero `abrirBuzon` sigue su curso y
   resuelve con un socket TLS que ya nadie cierra: el `try/finally` que llama a
   `buzon.cerrar()` nunca llegó a empezar. Un descriptor filtrado por corrida,
   cada 5 minutos.
2. **`reprocesarHuerfanos` es un efecto ordenado, no un dato.** Su comentario lo
   dice y el código lo cumple: se recogen los correos a medias *antes* de bajar
   nada nuevo, leyendo de la base y sin tocar IMAP. Adelantar el handshake TLS
   para que corra en paralelo con ese reproceso solo consigue tener la conexión
   al buzón abierta y ociosa más tiempo, contra un Dovecot de cPanel que limita
   conexiones concurrentes por usuario.
3. **No hay independencia de errores.** Si la config no se puede leer, la
   función no debe ni intentar conectarse al buzón: cada intento de conexión
   cuenta contra cPHulk, que es exactamente el riesgo que documenta CLAUDE.md.
4. **La ganancia es nula.** Se ahorraría un viaje a Postgres (milisegundos)
   frente a un handshake TLS remoto que se paga igual.

La propia receta de la regla lista este caso: «authorization gates, side
effects, error ordering, ... rate limits ... can still require sequencing even
when values are not referenced».

**Resultado:** Rejected (falso positivo). Suprimido para ese archivo y esa regla.

---

## `react-doctor/async-await-in-loop` (archivo nuevo)

**Ubicación:** `supabase/functions/correo-poll/reprocesar-huerfanos.ts:37`

```ts
for (const fila of (data ?? []) as FilaHuerfana[]) {
  await procesarCorreo(supabase, { ... });
}
```

**Evidencia:**

1. **Hay dependencia acarreada por el bucle, a través de la base.** No es que
   una iteración no lea el resultado de la anterior: es que el *resultado* de
   cada iteración depende de lo que escribieron las previas. `procesarCorreo`
   termina en `upsert` sobre `pagos` (`procesar-correo.ts:47`), y ese insert
   dispara el trigger `pagos_concilian`
   (`20260914210500_matcher.sql:178-180`) -> `conciliar_pago` ->
   `candidatos_de_pago`, que filtra `ped.estado_pago in ('pendiente','revisar')`
   y excluye los pedidos que ya tienen una conciliación `confirmado`. O sea: el
   conjunto de candidatos de un pago es función de los pagos ya procesados.
   Ejecutarlos en paralelo cambia el resultado, no solo la velocidad.
2. **El 1:1 de R5 se rompe de forma ruidosa, no silenciosa.**
   `conciliacion_pedido_unica` (`20260914210000_conciliaciones.sql:32`) es un
   índice único parcial. Dos pagos del mismo monto procesados a la vez leen el
   mismo `mejor.pedido_id` —ninguno confirmó todavía— y ambos intentan
   insertarlo. El `on conflict (pago_id, pedido_id) do nothing` no los cubre
   porque los `pago_id` son distintos: el segundo insert viola el índice, y una
   excepción dentro de un trigger aborta la sentencia entera.
3. **El orden es deliberado y es el orden correcto.** La consulta trae los
   huérfanos con `.order("recibido_at")` (línea 32) para que el pago más viejo
   reclame primero. En paralelo no hay "primero".
4. **Cada iteración manda un push.** El mismo insert dispara además
   `pagos_avisan` (`20260915120500_avisar_pago_nuevo.sql:57-58`) ->
   `net.http_post` -> `enviar-push`. `LOTE_HUERFANOS` es 50: paralelizar son 50
   envíos simultáneos al servicio de push por corrida.

La receta de la regla pide mantener el bucle secuencial ante «ordered side
effects, transactions, cumulative state, rate-limited services». Acá están los
cuatro.

**Resultado:** Rejected (falso positivo). Suprimido para ese archivo y esa
regla. Es el mismo criterio ya aplicado a `index.ts` el 2026-09-14; el archivo
es nuevo, así que no estaba cubierto.

---

## `react-doctor/no-noninteractive-element-interactions`

**Ubicación:** `src/components/modal.tsx:42`

```tsx
<dialog ref={dialogo} aria-labelledby={tituloId} className={CLASE_DIALOGO}
        onClose={onCerrar} onClick={alClicarFondo}>
```

**Evidencia:**

El detector marca el `onClick` sobre `<dialog>`, que es un elemento semántico no
genérico. El defecto que describe la regla es «funcionalidad que el mouse puede
ejecutar y la tecnología de asistencia no». Acá esa funcionalidad —cerrar— tiene
dos caminos de teclado, los dos verificables en el fuente:

1. **Escape.** El diálogo se abre con `showModal()` (línea 30). Por spec, Escape
   sobre un diálogo modal lo cierra y emite el evento `close`, que está cableado
   a `onClose={onCerrar}` (línea 46). No hace falta renderizar para establecerlo.
2. **Botón de cerrar.** Línea 54:
   `<button type="button" onClick={onCerrar} aria-label="Cerrar">`. Es un
   `<button>` real: enfocable por defecto y activable con Enter y barra
   espaciadora por el navegador, y vive dentro de la trampa de foco que
   `showModal()` instala.
3. **El clic en el fondo es azúcar redundante para el mouse.** No es la única
   vía a ninguna función. El recorrido completo es operable con teclado de punta
   a punta: `pago-row.tsx:33-37` abre el modal con `tabIndex={0}` +
   `onKeyDown` (Enter y espacio), y el modal se cierra por los dos caminos de
   arriba.
4. **La única supresión que acepta la regla sería una regresión.** El detector
   se calla solo si el elemento lleva un `role` interactivo estático. Ponerle
   `role="button"` a un `<dialog>` pisa su `role="dialog"` implícito, que es lo
   que hace que `aria-labelledby` (línea 44) se anuncie como título del diálogo
   y que el lector de pantalla entre en modo modal. La receta de la regla ofrece
   dos remedios —mover el handler a un elemento interactivo, o añadir rol
   interactivo más teclado— y ninguno aplica al fondo de un `<dialog>`: el
   backdrop no es ni puede ser un elemento interactivo.

**Evidencia no recogida:** auditoría con lector de pantalla y prueba renderizada.
No es recogible en esta corrida: `vite.config.ts` fija `test.environment: "node"`
y el proyecto no tiene `jsdom`, `happy-dom` ni `@testing-library` en
`package.json` (y jsdom no implementa `HTMLDialogElement.showModal()`, así que
tampoco probaría la trampa de foco). La adjudicación no depende de ella: los
puntos 1-4 se establecen leyendo el fuente y la especificación HTML.

**Resultado:** Rejected (falso positivo). Suprimido para ese archivo y esa regla.
No se reestructura el componente: mover el handler a un `<div>` scrim interno
—la única forma de que el detector calle sin romper el rol— no cambia ni un
detalle de la accesibilidad real, y cambiaría el `::backdrop` nativo por un
elemento pintado a mano, que es justo lo que el comentario de las líneas 3-6
explica por qué no se hace.
