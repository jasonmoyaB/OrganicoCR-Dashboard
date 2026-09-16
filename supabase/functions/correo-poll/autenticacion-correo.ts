// Qué dice el servidor de correo sobre si el aviso vino de verdad del banco.
//
// Hasta ahora lo único que decidía "esto es del banco" era el header `From`, que
// lo escribe quien manda. Un aviso de SINPE Móvil falsificado con el monto
// exacto y el número de pedido en el motivo es justo el caso que el matcher
// puede auto-confirmar: pedido cobrado sin que haya entrado un colón.
//
// `Authentication-Results` (RFC 8601) lo agrega el servidor que RECIBE, no quien
// manda, y por eso sirve como ancla. Quien lo escribe acá es el Dovecot de
// cPanel al entregar en el buzón.
//
// Que el atacante meta su propio `Authentication-Results: dmarc=pass` en el
// mensaje no ayuda: las cabeceras se apilan hacia arriba, el servidor receptor
// pone la suya de primera, y `leerCabeceras` se queda con la primera aparición.
// Esa regla —"la primera gana"— es lo que hace confiable esta lectura.
//
// DNS verificado el 2026-09-16: `_dmarc.baccredomatic.cr` publica `p=reject` y
// `_dmarc.davibank.cr` publica `p=quarantine`. El BAC está cubierto; un aviso
// falsificado de Davibank no se rechaza en el borde, se entrega marcado, y este
// módulo es lo que lo detiene antes de que se vuelva un pago.

export type VeredictoAutenticacion = "pasa" | "falla" | "sin-datos";

// `dmarc` manda sobre `dkim`: DMARC pasa si DKIM **o** SPF alinean, así que un
// `dkim=fail` con `dmarc=pass` es un reenvío legítimo, no un fraude.
const METODOS_EN_ORDEN = ["dmarc", "dkim"];

// `spf` queda fuera a propósito: falla de forma rutinaria en cualquier reenvío
// y bloquear por él perdería avisos buenos. Igual se guarda la cabecera entera,
// así que la decisión se puede revisar sin volver a pedirle nada al servidor.
function resultadoDe(cabecera: string, metodo: string): string | null {
  const encontrado = new RegExp(`\\b${metodo}\\s*=\\s*([a-z]+)`, "i").exec(cabecera);

  return encontrado ? encontrado[1].toLowerCase() : null;
}

export function veredictoDe(cabecera: string | null | undefined): VeredictoAutenticacion {
  if (!cabecera) return "sin-datos";

  for (const metodo of METODOS_EN_ORDEN) {
    const resultado = resultadoDe(cabecera, metodo);

    if (resultado === "pass") return "pasa";
    if (resultado === "fail") return "falla";
  }

  // `none`, `neutral`, `temperror` y compañía no son una acusación: significan
  // que no se pudo comprobar. Tratarlos como fraude descartaría plata de
  // verdad, que es el error caro de los dos.
  return "sin-datos";
}
