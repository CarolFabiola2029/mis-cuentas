// Íconos SVG de línea (grosor 1.9). Cada uno es una lista de [etiqueta, atributos].
const p = (d) => ['path', { d }];
const c = (cx, cy, r) => ['circle', { cx, cy, r }];
const r = (x, y, width, height, rx) => ['rect', { x, y, width, height, rx }];

const DIBUJOS = {
  // Interfaz
  ojo: [p('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z'), c(12, 12, 3)],
  ojoTachado: [
    p('M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-3.2 4.2M6.6 6.6A17.7 17.7 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6'),
    p('M9.9 9.9a3 3 0 0 0 4.2 4.2'),
    p('M3 3l18 18'),
  ],
  atras: [p('M15 18l-6-6 6-6')],
  adelante: [p('M9 18l6-6-6-6')],
  cerrar: [p('M18 6L6 18M6 6l12 12')],
  subir: [p('M18 15l-6-6-6 6')],
  bajar: [p('M6 9l6 6 6-6')],
  borrar: [p('M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z'), p('M17 9.5l-5 5M12 9.5l5 5')],
  menos: [p('M5 12h14')],
  flechas: [p('M4 8h15l-3.5-3.5'), p('M20 16H5l3.5 3.5')],
  corazon: [p('M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z')],
  // Categorías
  comida: [p('M7 3v18'), p('M4.5 3v5a2.5 2.5 0 0 0 5 0V3'), p('M17 21V3c-2.2 1.2-3.5 4-3.5 7.5V13H17')],
  bus: [r(4, 3, 16, 15, 3), p('M4 11h16'), p('M9 6.5h6'), p('M7.5 14.5h.01M16.5 14.5h.01'), p('M7.5 18v2.5M16.5 18v2.5')],
  auto: [p('M5 17V12.5l1.8-4.4A2 2 0 0 1 8.6 7h6.8a2 2 0 0 1 1.8 1.1l1.8 4.4V17z'), p('M5 12.5h14'), c(8, 17, 1.8), c(16, 17, 1.8)],
  estrella: [p('M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z')],
  puntos: [c(5, 12, 1.2), c(12, 12, 1.2), c(19, 12, 1.2)],
  maletin: [r(3, 7, 18, 13, 2.5), p('M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7'), p('M3 13h18')],
  mas: [p('M12 5v14M5 12h14')],
  carrito: [p('M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6'), c(10, 20, 1.3), c(17, 20, 1.3)],
  cafe: [p('M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z'), p('M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16'), p('M8.5 3.5V6M12 3.5V6')],
  casa: [p('M4 10.5L12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z'), p('M9.5 20.5v-6h5v6')],
  foco: [p('M9 18h6M10 21h4'), p('M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z')],
  telefono: [r(7, 2.5, 10, 19, 2.5), p('M11 18.5h2')],
  regalo: [r(3.5, 8, 17, 4, 1), p('M5 12v8h14v-8M12 8v12'), p('M12 8C10.5 4.5 7 4.5 7 6.5S9.5 8 12 8zm0 0c1.5-3.5 5-3.5 5-1.5S14.5 8 12 8z')],
  salud: [r(3.5, 3.5, 17, 17, 4), p('M12 8v8M8 12h8')],
  ropa: [p('M8.5 3.5L4 6l1.5 4.5 2.5-1v11h8v-11l2.5 1L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z')],
  libro: [p('M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z'), p('M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z')],
  viaje: [p('M21 3L3 10.5l7 2.5 2.5 7z'), p('M21 3L10 13')],
  mascota: [p('M12 13c-2.5 0-4.5 2.2-4.5 4.3 0 1.5 1.2 2.2 2.5 2.2.8 0 1.3-.4 2-.4s1.2.4 2 .4c1.3 0 2.5-.7 2.5-2.2 0-2.1-2-4.3-4.5-4.3z'), c(6.5, 10.5, 1.6), c(9.7, 6.5, 1.6), c(14.3, 6.5, 1.6), c(17.5, 10.5, 1.6)],
  tarjeta: [r(3, 5.5, 18, 13, 2.5), p('M3 10h18'), p('M7 15h3')],
  billete: [r(2.5, 6, 19, 12, 2.5), c(12, 12, 2.5), p('M6 12h.01M18 12h.01')],
  pesa: [p('M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11')],
  brillo: [p('M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z'), p('M19 15v5M16.5 17.5h5')],
  pelicula: [r(3, 5, 18, 14, 2.5), p('M3 9.5h18'), p('M8 5l2 4.5M13 5l2 4.5')],
  dulce: [c(12, 12, 4), p('M8.3 10.6L4.5 8.3v7.4l3.8-2.3'), p('M15.7 10.6l3.8-2.3v7.4l-3.7-2.3'), p('M10.5 10.5l3 3')],
  gasolina: [p('M4 20.5v-15A1.5 1.5 0 0 1 5.5 4h7A1.5 1.5 0 0 1 14 5.5v15M3 20.5h12M7 8h4'), p('M14 10h2a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8.5L18 6')],
};

// Íconos que se pueden elegir para una categoría, con su nombre para lectores de pantalla.
export const ICONOS_CATEGORIA = [
  ['comida', 'Comida'], ['dulce', 'Dulces'], ['carrito', 'Compras'], ['cafe', 'Café'], ['bus', 'Bus'], ['auto', 'Auto'],
  ['gasolina', 'Gasolina'], ['estrella', 'Estrella'], ['pelicula', 'Película'], ['ropa', 'Ropa'],
  ['brillo', 'Belleza'], ['salud', 'Salud'], ['casa', 'Casa'], ['foco', 'Servicios'], ['telefono', 'Teléfono'],
  ['regalo', 'Regalo'], ['corazon', 'Corazón'], ['libro', 'Estudios'], ['viaje', 'Viaje'], ['mascota', 'Mascota'],
  ['pesa', 'Gimnasio'], ['tarjeta', 'Tarjeta'], ['billete', 'Dinero'], ['maletin', 'Trabajo'], ['mas', 'Más'],
  ['puntos', 'Otros'],
];

export const existeIcono = (nombre) => Object.hasOwn(DIBUJOS, nombre);

export function icono(nombre, { relleno = false, tamano = 24 } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const atributos = {
    viewBox: '0 0 24 24', width: tamano, height: tamano, 'aria-hidden': 'true',
    fill: relleno ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.9,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'icono',
  };
  for (const [k, v] of Object.entries(atributos)) svg.setAttribute(k, v);
  for (const [etiqueta, props] of DIBUJOS[nombre] ?? DIBUJOS.puntos) {
    const el = document.createElementNS(ns, etiqueta);
    for (const [k, v] of Object.entries(props)) el.setAttribute(k, v);
    svg.append(el);
  }
  return svg;
}
