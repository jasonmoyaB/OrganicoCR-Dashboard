« [Índice](../README.md)

# Spec — Dashboard de conciliación de pagos SINPE

**Estado:** aprobado · **Última revisión:** 2026-09-11 · **Autor:** Jason Moya

Qué construimos y por qué. Para *cómo* construirlo, ver [`plans/`](../plans/README.md).

## Secciones

| # | Archivo | Contenido |
|---|---|---|
| 01 | [Problema y objetivo](01-problema.md) | Qué duele hoy y qué resuelve el dashboard |
| 02 | [Restricciones](02-restricciones.md) | Las 7 decisiones que el cliente ya cerró (R1–R7) |
| 03 | [Principios](03-principios.md) | Las 6 reglas que explican todo lo demás (P1–P6) |
| 04 | [Arquitectura](04-arquitectura.md) | Diagrama, stack y componentes |
| 05 | [Modelo de datos](05-datos.md) | Esquema SQL y algoritmo de conciliación |
| 06 | [Seguridad](06-seguridad.md) | RLS, secretos, autenticación |
| 07 | [Fases](07-fases.md) | Alcance de A, B, C y D |
| 08 | [Pruebas](08-pruebas.md) | Qué se testea y cómo |
| 09 | [Pendientes](09-pendientes.md) | Lo que falta decidir y cuándo |

## Lectura mínima

Si solo vas a leer dos archivos, leé [Restricciones](02-restricciones.md) y [Principios](03-principios.md). Explican el 80% de las decisiones concretas del resto.

---

« [Índice](../README.md) · [Problema →](01-problema.md)
