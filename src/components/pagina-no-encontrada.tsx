export function PaginaNoEncontrada() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16 text-center sm:px-8">
      <p className="font-display text-6xl font-semibold text-bosque">404</p>
      <h1 className="mt-4 font-display text-2xl font-semibold text-tinta">
        Esta página no existe
      </h1>
      <p className="mt-2 text-apagado">
        La dirección está mal escrita o esa sección ya no existe. Elegí una sección arriba.
      </p>
    </div>
  );
}
