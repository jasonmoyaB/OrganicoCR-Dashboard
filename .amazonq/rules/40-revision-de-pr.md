# Cómo revisar un PR en este repo

**Todo comentario de revisión se escribe en español.**

Este proyecto tiene **un solo desarrollador y un solo usuario**. La revisión no
está para imponer gusto, sino para atrapar las tres cosas que cuestan caro:
plata mal conciliada, un agujero de permisos, y una migración que no aplica.

## Orden de prioridad de los hallazgos

1. **Bloqueo** — invariante del dominio rota, agujero de permisos, migración
   editada, pérdida de datos. Se nombra como bloqueo, con la invariante citada.
2. **Corrección** — bug real con un caso concreto que lo dispara.
3. **Mantenibilidad** — límites de archivo/función, capas cruzadas, duplicación.
4. **Estilo** — solo si contradice una convención escrita. Si no está escrita en
   `.amazonq/rules/` ni en `docs/`, no es un hallazgo.

## Checklist por tipo de cambio

### Migración SQL (`supabase/migrations/`)
- [ ] ¿Es un archivo **nuevo**? Editar uno ya aplicado es bloqueo (invariante 7).
- [ ] ¿Un solo cambio atómico?
- [ ] Función nueva → ¿los **dos** revokes y `search_path = public, pg_temp`?
- [ ] Policy nueva → ¿exige `auth.uid() is not null`?
- [ ] ¿Umbrales en `config`, no hardcodeados?
- [ ] ¿Aplica de cero con `supabase db reset`?
- [ ] Si toca el matcher → ¿`supabase/tests/matcher.sql` cubre el caso nuevo?

### Edge Function (`supabase/functions/`)
- [ ] ¿Autenticación real (HMAC o `role = service_role`), no solo `verify_jwt`?
- [ ] ¿El payload crudo se guarda **antes** de procesarse?
- [ ] ¿Idempotente por clave natural?
- [ ] ¿Hay tope de lote si recorre el buzón?
- [ ] ¿Nombres de env correctos (`SUPABASE_SERVICE_ROLE_KEY`, no `SUPABASE_SECRET_KEY`)?

### Extractor de correos (`_extractor/`)
- [ ] ¿La moneda escrita está en el patrón?
- [ ] ¿El monto termina en dígito (`[\d.,]*\d`)?
- [ ] ¿Los egresos y las devoluciones se descartan **antes** de buscar un cobro?
- [ ] ¿Devuelve `no-aplica` con motivo, o `desconocido`, según corresponda?
- [ ] ¿Hay un correo real de muestra en el test?

### Frontend (`src/`)
- [ ] ¿Respeta la dirección de las capas?
- [ ] ¿El mapeo snake→camel quedó en el service?
- [ ] ¿Montos como enteros en céntimos hasta el formateo?
- [ ] ¿Límites de líneas, params, props, indentación?
- [ ] ¿Ningún `VITE_` nuevo con algo secreto?
- [ ] ¿Todo `border` lleva color explícito (Tailwind v4)?
- [ ] Util nuevo → ¿tiene test?
- [ ] ¿Nada de Supabase se cachea en el service worker?

### Service workers (`public/sw*.js`)
- [ ] ¿Siguen en `/public` y sin hash en el nombre? Moverlos a `/src` rompe la
      actualización del worker en cada deploy.
- [ ] Ojo: `oxlint` y `tsc` **no los miran**. Son los únicos archivos del proyecto
      sin red de seguridad — merecen lectura línea por línea.

## Qué NO comentar

- Que falte react-router: es una decisión tomada, hay cuatro secciones y ningún
  enlace que compartir.
- Que el score tope de las empresas sea 0.80: es el diseño, no un bug.
- Que `Pagaron` use `left join`: es intencional.
- Que `webhook_eventos` no tenga policies: deny-all a propósito.
- Que haya archivos de test de otro repo bajo `.claude/worktrees/`.
- Traducir el código al inglés.
- Las restricciones cerradas con el cliente (`docs/specs/02-restricciones.md`)
  **no se re-litigan** en un PR.

## Formato del comentario

```
[bloqueo|corrección|mantenibilidad] archivo:línea
Qué está mal, en una frase.
Por qué importa (invariante o caso concreto que lo dispara).
Cómo se arregla.
```

Sin preámbulos ni elogios de relleno. Si el PR está bien, decirlo en una línea.
