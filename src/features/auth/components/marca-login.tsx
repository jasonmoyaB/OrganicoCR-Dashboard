import { LogoOrganico } from "@/components/logo-organico";

export function MarcaLogin() {
  return (
    <div className="flex flex-col items-center">
      <LogoOrganico className="h-24" />

      <span className="mt-5 h-0.5 w-10 rounded-full bg-hoja" aria-hidden="true" />

      {/* El logo ya dice "OrganicoCR": repetirlo debajo como título sobraría.
          Lo que falta es qué es esto, y eso es la conciliación de pagos. */}
      <p className="mt-4 font-display text-sm tracking-wide text-apagado">
        Conciliación de pagos
      </p>
    </div>
  );
}
