// Piezas de pantalla: creación de elementos, avisos, hojas y ventanas de confirmación.
import { E } from './datos.js';
import { formatoSoles, MASCARA } from './dinero.js';

export function h(etiqueta, props, ...hijos) {
  const el = document.createElement(etiqueta);
  aplicar(el, props);
  el.append(...hijos.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false));
  return el;
}

function aplicar(el, props) {
  for (const [clave, valor] of Object.entries(props ?? {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave.startsWith('on')) el.addEventListener(clave.slice(2), valor);
    else if (clave === 'class') el.setAttribute('class', valor);
    else if (['value', 'checked', 'disabled', 'selected'].includes(clave)) el[clave] = valor;
    else el.setAttribute(clave, valor === true ? '' : valor);
  }
}

export function s(etiqueta, props, ...hijos) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', etiqueta);
  aplicar(el, props);
  el.append(...hijos.flat(Infinity).filter((x) => x !== null && x !== undefined && x !== false));
  return el;
}

const trazo = (...hijos) => s('svg', {
  viewBox: '0 0 24 24', width: 24, height: 24, fill: 'none', stroke: 'currentColor',
  'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
}, hijos);

export const iconos = {
  ojo: () => trazo(
    s('path', { d: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z' }),
    s('circle', { cx: 12, cy: 12, r: 3 }),
  ),
  ojoTachado: () => trazo(
    s('path', { d: 'M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.2 4.2M6.6 6.6A17.7 17.7 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6' }),
    s('path', { d: 'M9.9 9.9a3 3 0 0 0 4.2 4.2' }),
    s('line', { x1: 3, y1: 3, x2: 21, y2: 21 }),
  ),
  atras: () => trazo(s('path', { d: 'M15 18l-6-6 6-6' })),
  adelante: () => trazo(s('path', { d: 'M9 18l6-6-6-6' })),
  cerrar: () => trazo(s('path', { d: 'M18 6L6 18M6 6l12 12' })),
  subir: () => trazo(s('path', { d: 'M18 15l-6-6-6 6' })),
  bajar: () => trazo(s('path', { d: 'M6 9l6 6 6-6' })),
  borrar: () => trazo(
    s('path', { d: 'M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z' }),
    s('path', { d: 'M17 9.5l-5 5M12 9.5l5 5' }),
  ),
};

// Monto para mostrar, respetando el botón del ojo.
export const monto = (centimos) => (E.ajustes.ocultarMontos ? MASCARA : formatoSoles(centimos));

export function tarjeta(titulo, ...contenido) {
  return h('section', { class: 'tarjeta' }, titulo && h('h2', {}, titulo), contenido);
}

// --- Avisos breves ---

export function aviso(texto, tipo = '') {
  document.querySelector('.aviso')?.remove();
  const el = h('div', { class: `aviso ${tipo}`, role: 'status' }, texto);
  document.body.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 250);
  }, 2400);
}

export const vibrar = () => navigator.vibrate?.(15);

// --- Capas: hojas que suben desde abajo y ventanas centradas ---

let capasAbiertas = 0;
let scrollGuardado = 0;

// En iPhone, overflow:hidden no basta para que el fondo no se mueva.
function bloquearFondo() {
  if (capasAbiertas++ > 0) return;
  scrollGuardado = window.scrollY;
  document.body.classList.add('bloqueado');
  document.body.style.top = `-${scrollGuardado}px`;
}

function liberarFondo() {
  if (--capasAbiertas > 0) return;
  document.body.classList.remove('bloqueado');
  document.body.style.top = '';
  window.scrollTo(0, scrollGuardado);
}

export function abrirCapa({ tipo = 'hoja', etiqueta, alCerrar }) {
  bloquearFondo();
  const panel = h('div', {
    class: tipo, role: 'dialog', 'aria-modal': 'true', 'aria-label': etiqueta, tabindex: '-1',
  });
  const fondo = h('div', { class: `fondo fondo-${tipo}` }, panel);
  document.body.append(fondo);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fondo.classList.add('abierta');
    panel.focus({ preventScroll: true });
  }));
  let cerrada = false;
  function cerrar() {
    if (cerrada) return;
    cerrada = true;
    fondo.classList.remove('abierta');
    liberarFondo();
    alCerrar?.();
    setTimeout(() => fondo.remove(), 260);
  }
  return { panel, cerrar };
}

// Ventana propia en lugar de confirm(). Devuelve el valor del botón tocado.
// acciones: [{ texto, valor, estilo: 'primario' | 'peligro' | 'suave' }]
export function preguntar({ titulo, mensaje, acciones }) {
  return new Promise((resolver) => {
    const { panel, cerrar } = abrirCapa({ tipo: 'modal', etiqueta: titulo });
    panel.append(
      h('h2', {}, titulo),
      ...[mensaje].flat().filter(Boolean).map((linea) => h('p', {}, linea)),
      h('div', { class: 'modal-acciones' }, acciones.map((a) => h('button', {
        class: `boton ${a.estilo ?? 'suave'}`,
        type: 'button',
        onclick: () => { cerrar(); resolver(a.valor); },
      }, a.texto))),
    );
  });
}

export const confirmar = (titulo, mensaje, texto, estilo = 'primario') => preguntar({
  titulo,
  mensaje,
  acciones: [{ texto, valor: true, estilo }, { texto: 'Cancelar', valor: false }],
}).then(Boolean);

export const informar = (titulo, mensaje) => preguntar({
  titulo, mensaje, acciones: [{ texto: 'Entendido', valor: true, estilo: 'primario' }],
});

// --- Campos de formulario ---

export const campo = (texto, control, ayuda) => h(
  'label',
  { class: 'campo' },
  h('span', { class: 'campo-titulo' }, texto),
  control,
  ayuda && h('span', { class: 'campo-ayuda' }, ayuda),
);

export const campoMonto = (props) => h('input', {
  type: 'text', inputmode: 'decimal', autocomplete: 'off', placeholder: '0.00', ...props,
});

export function opcionesSelect(items, seleccionado, textoVacio) {
  return [
    !seleccionado && h('option', { value: '', selected: true }, textoVacio),
    items.map((x) => h('option', { value: x.valor, selected: x.valor === seleccionado }, x.texto)),
  ];
}

// Mantiene las hojas visibles sobre el teclado del iPhone.
export function vigilarTeclado() {
  const vista = window.visualViewport;
  if (!vista) return;
  const ajustar = () => {
    const raiz = document.documentElement.style;
    raiz.setProperty('--alto-visible', `${vista.height}px`);
    raiz.setProperty('--teclado', `${Math.max(0, window.innerHeight - vista.height - vista.offsetTop)}px`);
  };
  vista.addEventListener('resize', ajustar);
  vista.addEventListener('scroll', ajustar);
  ajustar();
}
