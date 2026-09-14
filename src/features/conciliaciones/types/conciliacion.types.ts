// Lo que el matcher propuso: un pedido, el pago que podría cubrirlo, y por qué
// lo cree. El desglose no es adorno — es lo que deja decidir en dos segundos
// si la sugerencia tiene sentido.
export interface DesgloseScore {
  monto: number;
  nombre: number;
  tiempo: number;
  referencia: number;
}

export interface Sugerencia {
  id: string;
  score: number;
  desglose: DesgloseScore;
  pedidoId: string;
  numeroPedido: string;
  clienteNombre: string;
  totalCentimos: number;
  fechaPedido: string;
  pagoId: string;
  remitenteNombre: string | null;
  montoCentimos: number;
  referenciaDetalle: string | null;
  fechaPago: string;
}
