import { useMemo, useState } from "react";
import { RANGO, type Rango } from "@/constants/rangos-fecha";
import { diaDeHoyCR, rangoDe, rangoPersonalizado } from "@/utils/rango-fechas";

interface Personalizado {
  desde: string;
  hasta: string;
}

const VACIO: Personalizado = { desde: "", hasta: "" };

export function useFiltroFechas(inicial: Rango = RANGO.TODO) {
  const [rango, setRango] = useState<Rango>(inicial);
  const [personalizado, setPersonalizado] = useState<Personalizado>(VACIO);

  const limites = useMemo(
    () =>
      rango === RANGO.PERSONALIZADO
        ? rangoPersonalizado(personalizado.desde, personalizado.hasta)
        : rangoDe(rango),
    [rango, personalizado],
  );

  // Escribir una fecha es elegir el rango personalizado: obligar a apretar
  // antes un botón "Personalizado" sería un paso de más para lo mismo.
  const cambiarPersonalizado = (campo: keyof Personalizado, valor: string) => {
    setPersonalizado((actual) => ({ ...actual, [campo]: valor }));
    setRango(RANGO.PERSONALIZADO);
  };

  // Al volver a un rango rápido los campos se limpian: dejarlos escritos
  // sugiere que siguen filtrando cuando ya no lo hacen.
  const elegirRango = (nuevo: Rango) => {
    setRango(nuevo);
    if (nuevo !== RANGO.PERSONALIZADO) setPersonalizado(VACIO);
  };

  return { rango, limites, personalizado, elegirRango, cambiarPersonalizado, hoy: diaDeHoyCR() };
}
