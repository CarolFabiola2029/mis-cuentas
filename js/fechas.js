// Fechas como texto 'AAAA-MM-DD' en hora local del teléfono.
// No usar toISOString() para "hoy": en Perú (UTC-5) daría mañana desde las 7 p. m.

const dos = (n) => String(n).padStart(2, '0');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

const aUTC = (iso) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
};
const deUTC = (f) => `${f.getUTCFullYear()}-${dos(f.getUTCMonth() + 1)}-${dos(f.getUTCDate())}`;

export const fechaHoy = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// Fecha en Lima, aunque el teléfono tenga otra zona horaria (para la frase del día).
export function fechaLima(d = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
  } catch {
    return fechaHoy(d);
  }
}
export const horaAhora = (d = new Date()) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;

export function sumarDias(iso, n) {
  const f = aUTC(iso);
  f.setUTCDate(f.getUTCDate() + n);
  return deUTC(f);
}

export function lunesDe(iso) {
  const dia = aUTC(iso).getUTCDay();
  return sumarDias(iso, dia === 0 ? -6 : 1 - dia);
}

export const inicioDeMes = (iso) => `${iso.slice(0, 7)}-01`;

export function finDeMes(iso) {
  const [a, m] = iso.split('-').map(Number);
  return deUTC(new Date(Date.UTC(a, m, 0)));
}

export const mesAnterior = (iso) => inicioDeMes(sumarDias(inicioDeMes(iso), -1));
export const mesSiguiente = (iso) => sumarDias(finDeMes(iso), 1);

export const nombreMes = (iso) => {
  const [a, m] = iso.split('-').map(Number);
  return `${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} ${a}`;
};

export const inicialDia = (iso) => DIAS[aUTC(iso).getUTCDay()][0].toUpperCase();

// 'lunes', 'miercoles', 'sabado'…: sin tildes, para usarlo como clave en frases.js.
export const claveDiaSemana = (iso) => DIAS[aUTC(iso).getUTCDay()].normalize('NFD').replace(/[̀-ͯ]/g, '');

// "Lunes, 2 de noviembre"
export function fechaSaludo(iso) {
  const f = aUTC(iso);
  const dia = DIAS[f.getUTCDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
}

export function fechaLarga(iso, hoy) {
  const f = aUTC(iso);
  const texto = `${DIAS[f.getUTCDay()]} ${f.getUTCDate()} de ${MESES[f.getUTCMonth()]}`;
  const conAnio = iso.slice(0, 4) === hoy.slice(0, 4) ? texto : `${texto} de ${iso.slice(0, 4)}`;
  return conAnio[0].toUpperCase() + conAnio.slice(1);
}

export function etiquetaDia(iso, hoy) {
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  return fechaLarga(iso, hoy);
}

export function hora12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${dos(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
}

// Número de serie de Excel para una fecha (días desde 1899-12-30).
export const serieExcel = (iso) => Math.round((aUTC(iso) - Date.UTC(1899, 11, 30)) / 86400000);
