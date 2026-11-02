// Gráficos dibujados con SVG propio. Heredan colores de las variables del tema.
import { E } from './datos.js';
import { formatoCorto, formatoSoles, MASCARA } from './dinero.js';
import { etiquetaDia, inicialDia } from './fechas.js';
import { h, s } from './ui.js';

const ANCHO = 340;

export function barras7Dias(dias, hoy) {
  const alto = 170;
  const techo = 24;
  const base = alto - 24;
  const paso = ANCHO / 7;
  const ancho = 24;
  const maximo = Math.max(...dias.map((d) => d.monto), 1);
  const oculto = E.ajustes.ocultarMontos;
  const descripcion = dias.map((d) => `${etiquetaDia(d.fecha, hoy)}: ${oculto ? 'oculto' : formatoSoles(d.monto)}`).join('; ');

  return s(
    'svg',
    { class: 'grafico', viewBox: `0 0 ${ANCHO} ${alto}`, role: 'img', 'aria-label': `Gasto de los últimos 7 días. ${descripcion}` },
    s('line', { class: 'eje', x1: 0, x2: ANCHO, y1: base + 0.5, y2: base + 0.5 }),
    dias.map((d, i) => {
      const x = paso * i + paso / 2;
      const altura = d.monto === 0 ? 0 : Math.max(4, (d.monto / maximo) * (base - techo));
      const y = base - altura;
      const r = Math.min(4, altura);
      const esHoy = d.fecha === hoy;
      return [
        altura > 0 && s('path', {
          class: esHoy ? 'barra hoy' : 'barra',
          d: `M${x - ancho / 2} ${base}V${y + r}Q${x - ancho / 2} ${y} ${x - ancho / 2 + r} ${y}H${x + ancho / 2 - r}Q${x + ancho / 2} ${y} ${x + ancho / 2} ${y + r}V${base}Z`,
        }),
        s('text', { class: 'valor', x, y: y - 6, 'text-anchor': 'middle' }, oculto ? '••' : formatoCorto(d.monto)),
        s('text', { class: esHoy ? 'dia hoy' : 'dia', x, y: alto - 6, 'text-anchor': 'middle' }, inicialDia(d.fecha)),
      ];
    }),
  );
}

export function lineaSaldo(serie, hoy) {
  const alto = 210;
  const margenIzq = 8;
  const margenDer = 8;
  const arriba = 14;
  const abajo = alto - 26;
  const oculto = E.ajustes.ocultarMontos;
  const valores = [...serie.dias.map((d) => d.saldo), serie.inicio];
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const holgura = max === min ? Math.max(Math.abs(max) * 0.1, 100) : (max - min) * 0.12;
  const yMin = min - holgura;
  const yMax = max + holgura;
  const xDia = (i) => margenIzq + (i / Math.max(serie.diasDelMes - 1, 1)) * (ANCHO - margenIzq - margenDer);
  const yValor = (v) => abajo - ((v - yMin) / (yMax - yMin)) * (abajo - arriba);
  const puntos = serie.dias.map((d, i) => [xDia(i), yValor(d.saldo)]);
  const trazo = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const [xFin, yFin] = puntos.at(-1);
  const area = `${trazo}L${xFin.toFixed(1)} ${abajo}L${xDia(0).toFixed(1)} ${abajo}Z`;
  const marcas = [...new Set([1, 8, 15, 22, serie.diasDelMes])].filter((d) => d <= serie.diasDelMes && (d === serie.diasDelMes || serie.diasDelMes - d > 3));

  const cursor = s('line', { class: 'cursor', y1: arriba, y2: abajo, visibility: 'hidden' });
  const puntoCursor = s('circle', { class: 'punto', r: 5, visibility: 'hidden' });
  const lectura = h('p', { class: 'lectura', 'aria-live': 'polite' }, 'Toca el gráfico para ver cada día');

  const grafico = s(
    'svg',
    {
      class: 'grafico tocable',
      viewBox: `0 0 ${ANCHO} ${alto}`,
      role: 'img',
      'aria-label': `Saldo total día a día, desde ${oculto ? 'monto oculto' : formatoSoles(serie.inicio)} hasta ${oculto ? 'monto oculto' : formatoSoles(serie.final)}.`,
    },
    s('line', { class: 'referencia', x1: margenIzq, x2: ANCHO - margenDer, y1: yValor(serie.inicio), y2: yValor(serie.inicio) }),
    s('path', { class: 'area', d: area }),
    s('path', { class: 'linea', d: trazo }),
    cursor,
    puntoCursor,
    s('circle', { class: 'punto', cx: xFin, cy: yFin, r: 5 }),
    marcas.map((d) => s('text', { class: 'dia', x: xDia(d - 1), y: alto - 6, 'text-anchor': d === 1 ? 'start' : d === serie.diasDelMes ? 'end' : 'middle' }, String(d))),
  );

  function señalar(e) {
    const caja = grafico.getBoundingClientRect();
    const xVista = ((e.clientX - caja.left) / caja.width) * ANCHO;
    const dia = Math.round(((xVista - margenIzq) / (ANCHO - margenIzq - margenDer)) * (serie.diasDelMes - 1));
    const i = Math.min(Math.max(dia, 0), serie.dias.length - 1);
    const [x, y] = puntos[i];
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
    puntoCursor.setAttribute('cx', x);
    puntoCursor.setAttribute('cy', y);
    cursor.setAttribute('visibility', 'visible');
    puntoCursor.setAttribute('visibility', 'visible');
    lectura.textContent = `${etiquetaDia(serie.dias[i].fecha, hoy)}: ${oculto ? MASCARA : formatoSoles(serie.dias[i].saldo)}`;
  }
  grafico.addEventListener('pointerdown', señalar);
  grafico.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') señalar(e); });

  return [grafico, lectura];
}
