// Montos: siempre enteros en céntimos. Nunca se usa parseFloat para dinero.

export const MONTO_MAXIMO = 999999999; // S/ 9,999,999.99
export const MASCARA = 'S/ ••••';

const conMiles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function formatoSoles(centimos) {
  const abs = Math.abs(centimos);
  const entero = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, '0');
  return `${centimos < 0 ? '−' : ''}S/ ${conMiles(entero)}.${decimales}`;
}

// Etiqueta de las barras: con decimales si es menor a 100, sin "S/" para que quepa.
export function formatoCorto(centimos) {
  if (centimos === 0) return '0';
  if (Math.abs(centimos) < 10000) return formatoSoles(centimos).replace('S/ ', '');
  return `${centimos < 0 ? '−' : ''}${conMiles(Math.round(Math.abs(centimos) / 100))}`;
}

// Convierte lo que se escribe en un campo de texto a céntimos.
// Acepta "1234.5", "1,234.56", "1234,56" (el teclado del iPhone puede traer coma).
// Devuelve null si está vacío o no es válido.
export function aCentimos(texto) {
  const s = String(texto ?? '').replace(/S\/|\s/gi, '');
  const m = s.match(/^(\d{1,3}(?:,\d{3})+|\d{1,3}(?:\.\d{3})+|\d*)(?:[.,](\d{0,2}))?$/);
  if (!m || (m[1] === '' && !m[2])) return null;
  const decimales = m[2] ?? '';
  // "1.234" sin decimales es ambiguo: mejor rechazarlo que guardar mil veces más.
  if (m[1].includes('.') && !s.slice(m[1].length).startsWith(',')) return null;
  const digitos = m[1].replace(/[.,]/g, '');
  if (digitos.length > 7) return null;
  const centimos = Number(digitos || 0) * 100 + Number(decimales.padEnd(2, '0'));
  return centimos > MONTO_MAXIMO ? null : centimos;
}

// Texto para precargar un campo editable a partir de céntimos ("1234.50").
export const aTexto = (centimos) => `${Math.floor(centimos / 100)}.${String(centimos % 100).padStart(2, '0')}`;

// Lógica del teclado numérico propio. Recibe el texto actual y la tecla tocada.
export function teclear(actual, tecla) {
  if (tecla === 'borrar') return actual.slice(0, -1);
  const [entero, decimales] = actual.split('.');
  if (tecla === '.') {
    if (decimales !== undefined) return actual;
    return `${actual || '0'}.`;
  }
  if (decimales !== undefined) return decimales.length >= 2 ? actual : actual + tecla;
  if (entero === '0') return tecla;
  return entero.length >= 7 ? actual : actual + tecla;
}
