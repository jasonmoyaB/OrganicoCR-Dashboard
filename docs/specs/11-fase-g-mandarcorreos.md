« [Índice](README.md)

# 11. Fase G — Reenviar facturas de proveedores a `recepcion@facturaelectronica.cr`

**Estado: EN PRUEBA.** Pedida el 2026-09-24. Los 38 filtros de cPanel se crearon ese mismo día. Falta verlos funcionar con correos reales.

## Problema

Los proveedores le mandan sus facturas electrónicas a `info@organicocr.store`, y el dueño tiene que reenviar cada una a mano a `recepcion@facturaelectronica.cr`, el buzón donde su sistema de facturación las recibe. Eso es trabajo repetido, y una factura que nadie reenvía es gasto que no se declara.

**Objetivo:** que todo correo de la lista de proveedores llegue solo a `recepcion@facturaelectronica.cr`, sin que nadie lo toque, y que se quede también en `info@`.

## Decisión: filtro de cPanel, no código

**Para esto no hace falta IA, regex ni Edge Function.** El buzón es un Dovecot/Exim de cPanel, y cPanel ya trae **Email Filters**: una regla por remitente con la acción *Redirect to email*. Actúa cuando el correo **se entrega**, antes que cualquier código nuestro, sin cron, sin credenciales SMTP y sin tablas nuevas.

| | A — Filtro de cPanel (**recomendada**) | B — Edge Function `reenviar-proveedores` |
|---|---|---|
| Cómo | Una regla *From contains …* por proveedor → *Redirect to email* | `pg_cron` → IMAP (`EXAMINE`) → coincidencia contra la tabla `proveedores_reenvio` → envío SMTP desde `info@`, idempotente por `Message-ID` |
| Código | Ninguno | Función, migración, tabla de reenvíos, tests, pantalla |
| Correos viejos | No: solo los que entran desde que se activa | Sí, puede reenviar el histórico |
| Se ve en el dashboard | No | Sí: qué se reenvió y qué falló |
| Riesgo DMARC (abajo) | **Sí**: reenvía el correo original, con el `From` del proveedor | No: sale con `From: info@organicocr.store` |
| Esfuerzo | ~3 h (reglas, prueba por proveedor, docs) | ~20 h |

**Primero se hace la A.** Solo se pasa a la B si pasa alguna de estas tres cosas:
1. `recepcion@` rechaza los reenvíos por DMARC.
2. El cliente necesita reenviar el histórico.
3. El cliente quiere ver los reenvíos en el dashboard.

### El único riesgo real de la A: DMARC

Un *redirect* manda el correo tal cual, con `From: facturacion@ampm.cr`, pero sale desde el servidor de Bluehost. Si el dominio del proveedor publica `p=reject` y el servidor de `facturaelectronica.cr` hace cumplir DMARC, **ese correo se rechaza**. Bluehost compartido no deja activar SRS (es de WHM).

No se puede saber antes de probar. Por eso cada proveedor se prueba una vez (paso 4). Si alguno rebota, ese proveedor en particular pasa a la B o se sigue reenviando a mano. El filtro de los demás no cambia.

### Lo que la Fase G no toca

- **`correo-poll` sigue igual.** Abre el buzón con `EXAMINE`, así que no lo modifica, y solo mira `config.remitentes_banco`.
- **Ninguna regla puede coincidir con `servicioalcliente@davibank.cr` ni con `notificaciones@baccredomatic.cr`.** Son los avisos de pago. Un filtro que los mueva o los descarte deja al matcher sin datos, y nadie se entera.
- **La copia se queda en el INBOX.** Cada filtro lleva dos acciones: *Redirect to email* **y** *Deliver to folder → INBOX*. Con el redirect solo, Exim lo toma como la entrega del correo y la copia puede no quedar en `info@`. Se verifica en el paso 4.

## Lista de proveedores

Tal como la mandó el cliente, normalizada. Los filtros de cPanel comparan contra la cabecera `From` completa, **nombre visible incluido**, así que un proveedor sin dirección también se puede filtrar por su nombre.

| # | Proveedor | Regla (`From` contiene…) | Condición extra / nota |
|---|---|---|---|
| 1 | Guadalupe Natural | `Guadalupe Natural` | |
| 2 | Ecom Trading | `DocumentoElectronico@ecomtrading.com` | |
| 3 | Davibank — leasing | `Alertas@davibank.cr` | **Y** `Subject` contiene `leasing`. Sin esa condición reenvía también las alertas de inicio de sesión |
| 4 | Automercado | `enviofe17@automercado.biz` | |
| 5 | Facturar.cr (Starbucks, entre otros) | `Facturar.cr` | Es una plataforma que usan muchos comercios. Asunto de ejemplo: "Documento Electrónico_Starbucks" |
| 6 | Inversiones TB S.A. | `INVERSIONES TB` | Asunto "Documento electrónico" |
| 7 | Cámara de Productores de Caña del Pacífico | `PRODUCTORES DE CA` | Se corta antes de la Ñ (ver trampas) |
| 8 | Ecopollo | `facturacion@ecopollocr.com` | |
| 9 | Gasoil S.A. | `GASOIL` | Llega como "Documentos Electronicos - GASOIL S.A" y como "DOC ELECTRONICOS GASOIL S.A" |
| 10 | SuFacturaFacil | `SuFacturaFacil` | Plataforma de varios comercios |
| 11 | facturaelectronica.cr | `notificaciones@facturaelectronica.cr` | Estaba **dos veces** en la lista. Ver pregunta abierta 2 |
| 12 | Comercializadora LYW S.A. | `PRODUCTOS LYW` | |
| 13 | Petróleos Delta | `Delta Costa Rica` | Sin la tilde |
| 14 | Greencorp Biorganiks | `Greencorp` | |
| 15 | BAC — gastos | `facturaelectronica@baccredomatic.cr` | **No confundir** con `notificaciones@baccredomatic.cr`, que son los pagos |
| 16 | Ipsofactu | `@ipsofactu.mx` | El cliente escribió `.mxv`: casi seguro es un error de tipeo. Con `@ipsofactu.mx` coincide igual |
| 17 | Agrícola Biosol S.A. | `AGRICOLA BIOSOL` | También es cliente de ventas (tiene facturas a crédito en GTI) |
| 18 | Agro Pro Centro América S.A. | `AGRO PRO CENTRO` | |
| 19 | DEKRA | `factura.cr@dekra.com` | |
| 20 | AVD Internacional (Mayca) | `maycafacturaelectronica@avdinternacional.com` | |
| 21 | Telecable | `Telecable` | |
| 22 | Cajeta Express | `CAJETA EXPRESS` | Nombre visible "CAJETA EXPRESS / EDUARDO ENRIQUE RAMIREZ ALVAREZ" |
| 23 | Subway | `facturas@subwaycostarica.net` | |
| 24 | La Cocina Criolla El Palenque | `EL PALENQUE` | |
| 25 | Supermercados Compre Bien | `Compre Bien` | |
| 26 | Grupo Sur | `dyn_sendmail@gruposur.com` | |
| 27 | Almacenes El Colono | `El Colono` | |
| 28 | Carnes Don Fernando | `felectronica@carnesdonfernando.com` | |
| 29 | AM PM | `facturacion@ampm.cr` | |
| 30 | Instituto Nacional de Seguros | `Instituto Nacional de Seguros` | |
| 31 | Coonatramar | `Coonatramar` | |
| 32 | Restaurante Fátima (WebPOS) | `RESTAURANTE FATIMA` | |
| 33 | Ferretería Brenes | `ferreteriabrenes@logicaldata.cloud` | |
| 34 | QuPOS | `QuPOS` | Plataforma de varios comercios |
| 35 | Corporación de Supermercados Unidos | `SUPERMERCADOS UNIDOS` | Sin la tilde de "CORPORACIÓN" |
| 36 | El Toro | `negocioeltoro8691@gmail.com` | |
| 37 | MSA / Agro Tierras Altas S.A. | `MSA Notificaci` o `AGRO TIERRAS ALTAS` | Asunto "AGRO TIERRAS ALTAS S.A - Factura electróiica", con la errata del proveedor. No filtrar por esa palabra |
| 38 | Panadería Los Olivos | `Los Olivos` | |

## Trampas

- **Tildes y Ñ.** Un nombre con tilde viaja codificado en la cabecera (`=?UTF-8?Q?Petr=C3=B3leos?=`). Exim normalmente lo decodifica antes de filtrar, pero si una regla no coincide, la tilde es lo primero a sospechar. Por eso las reglas de la tabla cortan antes de la letra acentuada.
- **Nombres cortos coinciden de más.** `Los Olivos` o `El Colono` también coinciden con un correo personal que tenga ese texto en el nombre. Es aceptable: el costo es que `recepcion@` reciba un correo que no es factura. Si molesta, se reemplaza el nombre por la dirección exacta, que sale del primer correo real.
- **Plataformas compartidas** (Facturar.cr, SuFacturaFacil, QuPOS). La regla reenvía **todo** lo que llegue por esa plataforma, también de comercios que no están en la lista. Si el cliente solo quiere algunos, hay que sumar una condición por el asunto.
- **Solo correos nuevos.** El filtro actúa al entregar. Lo que ya está en el buzón se reenvía a mano o con la opción B.
- **No hay bucle**, salvo que `recepcion@` le conteste a `info@` con un `From` de la lista. `notificaciones@facturaelectronica.cr` es del mismo dominio: hay que ver qué manda (pregunta abierta 2).

## Plan

1. **Abrir Email Filters, nunca Forwarders.** Un *Forwarder* de `info@` reenvía **todo** el buzón a un tercero: los avisos del banco, los correos de clientes y los de Woo. Visto el 2026-09-24: el webmail (`:2096`) muestra *Forwarders* en el menú, pero no *Email Filters*. Los filtros se abren así:
   - URL directa en la sesión del webmail: `…:2096/cpsess…/webmail/jupiter/mail/filters/userfilters.html`
   - o desde el cPanel de la cuenta (`organicocr.store:2083`, o Bluehost → Advanced → cPanel) → Email → *Email Filters* → *Manage Filters* de `info@organicocr.store`.
2. **Crear un filtro por proveedor**, llamado `reenvio-<proveedor>`, con dos acciones: *Redirect to email* → `recepcion@facturaelectronica.cr` y *Deliver to folder* → `INBOX` (en el webmail de esta cuenta la acción se llama *Submit in folder*). Uno por proveedor y no uno gigante: si un proveedor rebota o molesta, se apaga su regla sin tocar las demás.
3. **Probar el filtro** con *Filter Test* de cPanel, pegando una cabecera `From` real de cada proveedor.
4. **Probar de punta a punta** con un correo real de 2 o 3 proveedores:
   - llegó a `recepcion@`;
   - se quedó en el INBOX de `info@`;
   - no rebotó por DMARC (mirar si vuelve un *bounce* a `info@`).
5. **Verificar que el cobro no se tocó:** el siguiente aviso de Davibank y del BAC sigue entrando en `correos_banco`.
6. **Documentar** en este archivo qué proveedores funcionaron, cuáles rebotaron y la fecha.

## Verificado

- **2026-09-24, Filter Test de AM PM:** el filtro coincide (`$header_from: contains facturacion@ampm.cr`) y hace las dos cosas: `Deliver message to: recepcion@facturaelectronica.cr` y `Save message to: /home4/rganicoc/mail/organicocr.store/info/`, que es el INBOX. La salida dice `No other deliveries will occur` y eso está bien: la copia la garantiza el *Submit in folder*. **Sin esa acción, el correo se iría solo a `recepcion@` y desaparecería de `info@`.**
- **2026-09-24, Filter Test de `servicioalcliente@davibank.cr`:** `Filtering did not set up a significant delivery. Normal delivery will occur.` El aviso de pago no se reenvía.
- **2026-09-24: los 38 filtros quedaron creados** en `info@organicocr.store`, uno por proveedor, cada uno con *Redirect to email* + *Submit in folder → INBOX*. Falta volver a correr el Filter Test con todos ya cargados.
- **2026-09-24, prueba real con un filtro temporal (`reenvio-prueba`):** un correo de verdad enviado a `info@` se reenvió al destino y quedó en el INBOX. El reenvío funciona con correo real, no solo en el Filter Test.
- **Dos errores vistos en el Filter Test del 2026-09-24:**
  - `reenvio-davibank-leasing` no tenía la regla `Subject contains leasing`, así que reenviaba **todas** las alertas de Davibank.
  - `reenvio-facturarcr` tenía el texto `enviofe17@automercado.biz` en vez de `Facturar.cr`.

  Hay que corregir los dos y volver a correr el Filter Test.
- Pendiente: una factura real que llegue a `recepcion@` sin rebote por DMARC. Se comprueba en cPanel → Email → *Track Delivery*.

## Preguntas abiertas para el cliente

1. **¿`recepcion@facturaelectronica.cr` acepta correos reenviados?** Algunos sistemas de recepción exigen que el XML venga del emisor. Se confirma en el paso 4.
2. **`notificaciones@facturaelectronica.cr`**: ¿son facturas de proveedores o acuses de su propio sistema? Si son acuses, reenviárselos a `recepcion@` del mismo proveedor no sirve para nada y hay que quitar la regla.
3. **¿Hace falta reenviar lo que ya está en el buzón?** Si la respuesta es sí, eso es la opción B.
4. **Plataformas compartidas**: ¿se reenvía todo lo que llegue por Facturar.cr, SuFacturaFacil y QuPOS, o solo algunos comercios?
5. **Ipsofactu:** confirmar el dominio, `.mx` o `.mxv`.
