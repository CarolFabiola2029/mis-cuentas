// Elige la frase del día. Función pura: recibe el historial y devuelve la frase y el historial nuevo.
import { claveDiaSemana, sumarDias } from './fechas.js';

const DIAS_SIN_REPETIR = 7;
const DIAS_EN_HISTORIAL = 30;
const PROBABILIDAD_DEL_DIA = 2 / 3;

// banco: { frasesPorDia, generales, fechasEspeciales }
// historial: [{ fecha: 'AAAA-MM-DD', texto }]
export function fraseDelDia(fecha, historial, banco, azar = Math.random) {
  const yaElegida = historial.find((h) => h.fecha === fecha);
  if (yaElegida) return { texto: yaElegida.texto, historial };

  const anteriores = historial.filter((h) => h.fecha < fecha);
  const ayer = anteriores.find((h) => h.fecha === sumarDias(fecha, -1))?.texto;
  const recientes = new Set(anteriores
    .filter((h) => h.fecha >= sumarDias(fecha, -DIAS_SIN_REPETIR))
    .map((h) => h.texto));

  let texto = banco.fechasEspeciales[fecha.slice(5)];
  if (!texto) {
    const delDia = banco.frasesPorDia[claveDiaSemana(fecha)] ?? [];
    const grupos = azar() < PROBABILIDAD_DEL_DIA ? [delDia, banco.generales] : [banco.generales, delDia];
    // Primero evita las de la última semana; si no queda ninguna, solo evita la de ayer.
    const intentos = [
      ...grupos.map((g) => g.filter((t) => !recientes.has(t))),
      ...grupos.map((g) => g.filter((t) => t !== ayer)),
    ];
    const opciones = intentos.find((g) => g.length > 0) ?? banco.generales;
    texto = opciones[Math.floor(azar() * opciones.length)];
  }

  const limite = sumarDias(fecha, -DIAS_EN_HISTORIAL);
  return {
    texto,
    historial: [...historial.filter((h) => h.fecha >= limite && h.fecha !== fecha), { fecha, texto }],
  };
}
