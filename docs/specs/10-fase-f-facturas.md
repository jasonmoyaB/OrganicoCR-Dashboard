« [Índice](README.md)

# 10. Fase F — Facturas, cuentas por cobrar y recordatorios

**Estado: PROPUESTA, no aprobada.** Cotizada a Hernán el 2026-09-23; puede no desarrollarse nunca. Nada de esto está implementado y ninguna otra fase depende de ella. Si se aprueba, este archivo pasa a `07-fases.md` y el cómo a `plans/`.

## Problema

Hoy el dashboard cruza pagos del banco contra **pedidos de WooCommerce**. Pero buena parte de la venta no pasa por la tienda: son facturas electrónicas emitidas desde **GTI**, muchas a crédito (30 y 60 días). El dueño no ve en ningún lado quién le debe una factura ni cuándo vence.

## Flujo propuesto

1. Hernán descarga el Excel "Documentos Emitidos" desde GTI y lo sube a una carpeta de Google Drive compartida con el sistema.
2. El sistema lee el Excel, guarda las facturas y las cruza contra los pagos del banco que ya captura `correo-poll`.
3. Sección **"Por cobrar"**: facturas a crédito, contado o crédito visible, fecha de vencimiento.
4. Push al celular cuando una factura a crédito está por vencer o vencida.
5. Push **cada lunes**: "Por favor subir el excel de las ventas".

## El Excel real

Muestra: `docs/excelVentasEJM/Copia de Documentos Emitidos Colonizado Excel-5.xlsx` — 48 documentos, 01/09 al 21/09/2026, emisor CONSULTORES AGROAMBIENTALES S.A. Hoja `Documentos Emitidos Colonizado`.

Columnas pedidas por el cliente:

| Col | Encabezado | Uso |
|---|---|---|
| A | `# Documento` | Clave natural (20 dígitos, único) → upsert idempotente |
| H | `Nombre Receptor` | Similitud contra `pagos.remitente_nombre` |
| I | `Cédula Receptor` | Agrupa facturas del mismo cliente |
| L | `Condición de Venta` | `Contado` / `Crédito` |
| N | `Moneda` | `CRC` / `USD` |
| AI | `Total Colones` | Monto a cruzar |
| AJ | `Días Crédito` | Plazo |
| AK | `Fecha Vencimiento` | Recordatorios |

**Hacen falta cuatro más**, o el cruce da resultados falsos:

| Col | Encabezado | Sin ella |
|---|---|---|
| E | `Tipo Documento` | Las notas de crédito (monto negativo) cuentan como venta |
| F | `# Documento Referencia` | No se sabe qué factura anula cada nota de crédito |
| G | `Fecha` | No hay ventana de fechas para el cruce |
| K | `Estado` | Los `Anulado` quedan como deuda |

## Trampas vistas en la muestra

- **Notas de crédito anulan facturas.** 7378 (Rivera, ₡17 413,55) queda anulada por la nota 228 (−₡17 413,55). Hay que netear por `# Documento Referencia`.
- **Vencimiento faltante.** 7362 es crédito a 60 días sin `Fecha Vencimiento`: calcular `Fecha + Días Crédito`. Probablemente es el "error en el excel" que menciona el cliente.
- **Hasta 4 decimales** (`254866.6156`). Se redondea a céntimos al importar (invariante 3). El banco puede redondear distinto: una diferencia de ₡1 cae en "Revisar", nunca se confirma sola.
- **Facturas en USD** (5 de 48). `Total Colones` ya viene convertido, pero no cuadra exacto con un pago en colones: van a "Revisar".
- **Un pago cubre varias facturas.** AGRICOLA BIOSOL tiene 5 facturas a crédito abiertas; paga en bloque. El matcher 1:1 actual (R5) no lo ve. Mismo problema que ya existe con pedidos (Rivera: ₡38 831 contra dos pedidos).
- **Fechas como texto** `dd/mm/aaaa`, no como fecha de Excel.
- **Leer por encabezado, no por letra.** Si GTI agrega una columna, la letra se corre y el importador leería el campo equivocado sin error.

## Decisiones ya tomadas

- **No hace falta IA para leer el Excel.** Columnas fijas, datos estructurados. Se parsea en código. El cruce es SQL determinista (invariante 6).
- **El Excel se guarda crudo antes de procesarse** (invariante 4), igual que `correos_banco`: si el parser mejora, se re-procesa sin pedirle nada al cliente.
- **Una factura no se degrada.** Mismo criterio que `pedidos.estado_pago`: re-subir un Excel viejo no puede devolver a "debe" algo ya cobrado.

## Estimado

| # | Tarea | h |
|---|---|---|
| 1 | Leer Drive (cuenta de servicio, carpeta compartida, no releer archivos ya vistos) | 10 |
| 2 | Importador: encabezados, validación, tabla `facturas_emitidas`, notas de crédito, anulados, RLS + los dos revokes | 14 |
| 3 | Cruce pagos ↔ facturas en el matcher SQL, pago contra varias facturas, pantalla Revisar | 20 |
| 4 | Sección "Por cobrar" + push de vencimiento + vencimiento faltante | 10 |
| 5 | Push de los lunes (`pg_cron` + `enviar-push`, ya existen) | 2 |
| — | Pruebas, deploy, docs, contingencia 15 % | 7 |
| | **Total** | **~63 h** |

Cotizado: **₡750 000** adicionales (proyecto pasa de ₡400 000 a ₡1 150 000). Plazo: 3–4 semanas desde la confirmación. Costo mensual extra: ₡0 (sin LLM, Supabase free).

## Qué se necesita del cliente para arrancar

- Confirmación del monto.
- 2–3 Excels de meses distintos.
- Permiso para usar también las columnas E, F, G y K.
- Una carpeta de Drive compartida con el correo de la cuenta de servicio.

## Abierto

- ¿Las facturas y los pedidos de Woo son el mismo negocio? Si una venta existe en los dos, el cruce no puede cobrarla dos veces.
- ¿Cuántos días antes del vencimiento avisar?
- ¿Las facturas en USD se cobran en dólares o en colones?
