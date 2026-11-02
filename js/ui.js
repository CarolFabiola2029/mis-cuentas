// Piezas de pantalla: creación de elementos, avisos, hojas y ventanas de confirmación.
import { E } from './datos.js';
import { formatoSoles, MASCARA } from './dinero.js';
import { icono } from './iconos.js';
import { colorDe } from './paleta.js';

export { icono };

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

// Monto para mostrar, respetando el botón del ojo.
export const monto = (centimos) => (E.ajustes.ocultarMontos ? MASCARA : formatoSoles(centimos));

export function tarjeta(titulo, ...contenido) {
  return h('section', { class: 'tarjeta' }, titulo && h('h2', {}, titulo), contenido);
}

// Bloque con título fuera de la tarjeta blanca, como en el diseño.
export const seccion = (titulo, ...contenido) => h('section', { class: 'seccion' }, h('h2', { class: 'titulo-seccion' }, titulo), contenido);

export function iniciales(nombre) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  if (palabras.length === 1) return Array.from(palabras[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(palabras[0])[0] + Array.from(palabras[1])[0]).toUpperCase();
}

// Siglas de cada cuenta: "Yape" → YA, "CTS BBVA" → CT. Si la primera palabra se repite
// ("Sueldo BCP", "Sueldo BBVA"), se usa la inicial y una letra de la segunda que las distinga: SB, SV.
export function siglasCuentas(cuentas) {
  const letras = (texto) => Array.from(texto.toUpperCase()).filter((l) => /\p{L}|\d/u.test(l));
  const palabras = cuentas.map((c) => c.nombre.trim().split(/\s+/).filter(Boolean));
  const primeras = palabras.map((p) => (p[0] ?? '').toUpperCase());
  const usadas = new Set();
  const siglas = new Map();
  cuentas.forEach((cuenta, i) => {
    const [primera = '?', ...resto] = palabras[i];
    const repetida = primeras.filter((x) => x === primeras[i]).length > 1;
    const inicial = letras(primera)[0] ?? '?';
    const opciones = repetida && resto.length
      ? letras(resto.join('')).map((l) => inicial + l)
      : letras(primera).slice(1).map((l) => inicial + l);
    const sigla = opciones.find((o) => !usadas.has(o)) ?? opciones[0] ?? inicial;
    usadas.add(sigla);
    siglas.set(cuenta.id, sigla);
  });
  return siglas;
}

// Cuadrado de color con las iniciales de la cuenta (la tarjeta lleva su ícono).
export function cuadroCuenta(cuenta, tamano = 38) {
  const color = colorDe(cuenta.color);
  return h(
    'span',
    { class: 'cuadro', style: `--cuadro-fondo:${color.fondo};--cuadro-texto:${color.texto};--cuadro-lado:${tamano}px`, 'aria-hidden': 'true' },
    cuenta.tipo === 'TARJETA_CREDITO'
      ? icono('tarjeta', { tamano: Math.round(tamano * 0.52) })
      : siglasCuentas(E.cuentas.some((c) => c.id === cuenta.id) ? E.cuentas : [cuenta]).get(cuenta.id),
  );
}

// Cuadrado de color con el ícono de una categoría.
export function cuadroIcono(nombreIcono, claveColor, tamano = 38) {
  const color = claveColor ? colorDe(claveColor) : null;
  const estilo = color ? `--cuadro-fondo:${color.fondo};--cuadro-texto:${color.texto};` : '';
  return h(
    'span',
    { class: `cuadro ${color ? '' : 'cuadro-rosa'}`, style: `${estilo}--cuadro-lado:${tamano}px`, 'aria-hidden': 'true' },
    icono(nombreIcono, { tamano: Math.round(tamano * 0.5) }),
  );
}

// Control segmentado de pestañas. "alCambiar" lo pone app.js.
let alCambiarPestana = () => {};
export const fijarCambioPestana = (fn) => { alCambiarPestana = fn; };
export function pestanas(activa) {
  return h('nav', { class: 'pestanas', 'aria-label': 'Secciones' }, [['resumen', 'Resumen'], ['evolucion', 'Evolución'], ['ajustes', 'Ajustes']].map(([clave, texto]) => h('button', {
    type: 'button',
    class: clave === activa ? 'activo' : '',
    'aria-current': clave === activa ? 'page' : 'false',
    onclick: () => alCambiarPestana(clave),
  }, texto)));
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

// Achica la letra de los montos marcados con "ajustable" hasta que entren completos.
export function ajustarTextos(raiz = document) {
  raiz.querySelectorAll('.ajustable').forEach((el) => {
    el.style.fontSize = '';
    let tamano = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > el.clientWidth && tamano > 10) {
      tamano -= 1;
      el.style.fontSize = `${tamano}px`;
    }
  });
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
