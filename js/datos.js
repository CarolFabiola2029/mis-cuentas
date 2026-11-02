// Datos del teléfono: IndexedDB con una copia en memoria (E) para pintar al instante.
import { openDB } from '../vendor/idb.js';
import { movimientosDeCuenta, ordenarMovimientos } from './calculos.js';
import { fechaHoy } from './fechas.js';
import { colorSiguiente } from './paleta.js';

const ALMACENES = ['cuentas', 'movimientos', 'categorias', 'ajustes'];

const cuentaInicial = (id, nombre, orden, color, extra = {}) => ({
  id, nombre, tipo: 'BANCO', saldoInicial: 0, lineaCredito: 0,
  noSumarAlDisponible: false, color, orden, archivada: false, archivadaEn: '', ...extra,
});

const CUENTAS_INICIALES = [
  cuentaInicial('cta-yape', 'Yape', 0, 'lila'),
  cuentaInicial('cta-ahorros', 'Ahorros', 1, 'durazno'),
  cuentaInicial('cta-sueldo-bcp', 'Sueldo BCP', 2, 'azul'),
  cuentaInicial('cta-sueldo-bbva', 'Sueldo BBVA', 3, 'celeste'),
  cuentaInicial('cta-independencia-bbva', 'Independencia BBVA', 4, 'verde'),
  cuentaInicial('cta-cts-bbva', 'CTS BBVA', 5, 'arena', { noSumarAlDisponible: true }),
  cuentaInicial('cta-credito-bbva', 'Crédito BBVA', 6, 'rosa', { tipo: 'TARJETA_CREDITO' }),
];

const categoriaInicial = (id, nombre, icono, tipo, orden, color) => ({
  id, nombre, icono, tipo, orden, color, archivada: false,
});

const CATEGORIAS_INICIALES = [
  categoriaInicial('cat-comida', 'Comida', 'comida', 'GASTO', 0, 'durazno'),
  categoriaInicial('cat-pasajes', 'Pasajes', 'bus', 'GASTO', 1, 'azul'),
  categoriaInicial('cat-taxi', 'Taxi', 'auto', 'GASTO', 2, 'arena'),
  categoriaInicial('cat-salidas', 'Salidas', 'estrella', 'GASTO', 3, 'lila'),
  categoriaInicial('cat-dulces', 'Dulces', 'dulce', 'GASTO', 4, 'rosa'),
  categoriaInicial('cat-otros', 'Otros', 'puntos', 'GASTO', 5, 'durazno'),
  categoriaInicial('cat-sueldo', 'Sueldo', 'maletin', 'INGRESO', 0, 'verde'),
  categoriaInicial('cat-otros-ingresos', 'Otros ingresos', 'mas', 'INGRESO', 1, 'celeste'),
];

// Completa datos de versiones anteriores (cuentas sin color, categorías con emoji en vez de ícono).
function completarCuenta(cuenta, i) {
  if (cuenta.color) return cuenta;
  const inicial = CUENTAS_INICIALES.find((c) => c.id === cuenta.id);
  // Los nombres de la primera versión venían en mayúsculas; si no se cambiaron, se usan los nuevos.
  const sinCambiar = inicial && cuenta.nombre === inicial.nombre.toUpperCase();
  return { ...cuenta, nombre: sinCambiar ? inicial.nombre : cuenta.nombre, color: inicial?.color ?? colorSiguiente(i) };
}

function completarCategoria(categoria, i) {
  if (categoria.icono && categoria.color) return categoria;
  const { emoji, ...resto } = categoria;
  const inicial = CATEGORIAS_INICIALES.find((c) => c.id === categoria.id);
  return {
    ...resto,
    icono: categoria.icono ?? inicial?.icono ?? 'puntos',
    color: categoria.color ?? inicial?.color ?? colorSiguiente(i),
  };
}

const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Estado en memoria. Las pantallas solo lo leen; se cambia con las funciones de abajo.
export const E = { cuentas: [], movimientos: [], categorias: [], ajustes: {} };

const oyentes = new Set();
export const alCambiar = (fn) => oyentes.add(fn);
const avisar = () => oyentes.forEach((fn) => fn());

let conexion = null;

function abrir() {
  conexion ??= openDB('mis-cuentas', 1, {
    upgrade(db) {
      for (const nombre of ['cuentas', 'movimientos', 'categorias']) db.createObjectStore(nombre, { keyPath: 'id' });
      db.createObjectStore('ajustes');
    },
    terminated() { conexion = null; },
  });
  return conexion;
}

// iOS a veces cierra la conexión cuando la app queda en segundo plano: se reabre y reintenta.
async function conBase(accion) {
  try {
    return await accion(await abrir());
  } catch (error) {
    if (error?.name !== 'InvalidStateError' && !/connection/i.test(error?.message ?? '')) throw error;
    conexion = null;
    return accion(await abrir());
  }
}

// Escribe varios cambios a la vez: o se guardan todos o ninguno.
function escribir(cambios) {
  return conBase(async (db) => {
    const tx = db.transaction(ALMACENES, 'readwrite');
    for (const [almacen, operacion, valor, clave] of cambios) {
      if (operacion === 'poner') tx.objectStore(almacen).put(valor, clave);
      else if (operacion === 'borrar') tx.objectStore(almacen).delete(valor);
      else tx.objectStore(almacen).clear();
    }
    await tx.done;
  });
}

const porOrden = (a, b) => a.orden - b.orden;

async function recargar() {
  await conBase(async (db) => {
    const [cuentas, movimientos, categorias, claves, valores] = await Promise.all([
      db.getAll('cuentas'), db.getAll('movimientos'), db.getAll('categorias'),
      db.getAllKeys('ajustes'), db.getAll('ajustes'),
    ]);
    E.cuentas = cuentas.sort(porOrden);
    E.movimientos = ordenarMovimientos(movimientos);
    E.categorias = categorias.sort(porOrden);
    E.ajustes = Object.fromEntries(claves.map((k, i) => [k, valores[i]]));
  });
}

export function nuevoId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function iniciarDatos() {
  await recargar();
  if (E.ajustes.sembrado) {
    const cuentas = E.cuentas.map(completarCuenta);
    const categorias = E.categorias.map(completarCategoria);
    const cambios = [
      ...cuentas.filter((c, i) => !iguales(c, E.cuentas[i])).map((c) => ['cuentas', 'poner', c]),
      ...categorias.filter((c, i) => !iguales(c, E.categorias[i])).map((c) => ['categorias', 'poner', c]),
    ];
    // Dulces llegó en una versión posterior: se agrega una sola vez (si luego la borran, no vuelve).
    if (!E.ajustes.dulcesAgregada) {
      const yaExiste = E.categorias.some((c) => c.id === 'cat-dulces' || c.nombre.trim().toLowerCase() === 'dulces');
      if (!yaExiste) {
        const dulces = CATEGORIAS_INICIALES.find((c) => c.id === 'cat-dulces');
        cambios.push(['categorias', 'poner', { ...dulces, orden: siguienteOrden(E.categorias) }]);
      }
      cambios.push(['ajustes', 'poner', true, 'dulcesAgregada']);
    }
    if (cambios.length) {
      await escribir(cambios);
      await recargar();
    }
    return;
  }
  await escribir([
    ...CUENTAS_INICIALES.map((c) => ['cuentas', 'poner', c]),
    ...CATEGORIAS_INICIALES.map((c) => ['categorias', 'poner', c]),
    ['ajustes', 'poner', fechaHoy(), 'inicioApp'],
    ['ajustes', 'poner', true, 'sembrado'],
    ['ajustes', 'poner', true, 'dulcesAgregada'],
  ]);
  await recargar();
}

export async function ponerAjuste(clave, valor) {
  await escribir([['ajustes', 'poner', valor, clave]]);
  E.ajustes[clave] = valor;
  avisar();
}

export async function completarBienvenida(cuentasConSaldo) {
  await escribir([
    ...cuentasConSaldo.map((c) => ['cuentas', 'poner', c]),
    ['ajustes', 'poner', true, 'bienvenidaHecha'],
    ['ajustes', 'poner', fechaHoy(), 'inicioApp'],
  ]);
  await recargar();
}

// --- Movimientos ---

export async function guardarMovimiento(m) {
  await escribir([['movimientos', 'poner', m]]);
  E.movimientos = ordenarMovimientos([...E.movimientos.filter((x) => x.id !== m.id), m]);
  avisar();
}

export async function eliminarMovimiento(id) {
  await escribir([['movimientos', 'borrar', id]]);
  E.movimientos = E.movimientos.filter((m) => m.id !== id);
  avisar();
}

// --- Cuentas y categorías ---

async function guardarEn(almacen, registro) {
  await escribir([[almacen, 'poner', registro]]);
  E[almacen] = [...E[almacen].filter((x) => x.id !== registro.id), registro].sort(porOrden);
  avisar();
}

const siguienteOrden = (lista) => lista.reduce((max, x) => Math.max(max, x.orden + 1), 0);

export const guardarCuenta = (cuenta) => guardarEn('cuentas', cuenta);
export const guardarCategoria = (categoria) => guardarEn('categorias', categoria);
export const ordenNuevaCuenta = () => siguienteOrden(E.cuentas);
export const ordenNuevaCategoria = () => siguienteOrden(E.categorias);
export const colorNuevaCuenta = () => colorSiguiente(E.cuentas.length);
export const colorNuevaCategoria = () => colorSiguiente(E.categorias.length);

export const nombreUsuaria = () => E.ajustes.nombreUsuaria?.trim() || 'Carol';

export const limites = () => E.ajustes.limites ?? [];
export const guardarLimites = (lista) => ponerAjuste('limites', lista);

export const archivarCuenta = (cuenta) => guardarCuenta({ ...cuenta, archivada: true, archivadaEn: fechaHoy() });
export const restaurarCuenta = (cuenta) => guardarCuenta({ ...cuenta, archivada: false, archivadaEn: '' });
export const fijarArchivoCategoria = (categoria, archivada) => guardarCategoria({ ...categoria, archivada });

export async function eliminarCuenta(id) {
  const borrados = movimientosDeCuenta(E.movimientos, id);
  await escribir([
    ['cuentas', 'borrar', id],
    ...borrados.map((m) => ['movimientos', 'borrar', m.id]),
  ]);
  const ids = new Set(borrados.map((m) => m.id));
  E.cuentas = E.cuentas.filter((c) => c.id !== id);
  E.movimientos = E.movimientos.filter((m) => !ids.has(m.id));
  avisar();
}

// Elimina la categoría. Si se indica reemplazo, antes pasa sus movimientos a esa otra.
export async function eliminarCategoria(id, reemplazoId = null) {
  const ahora = new Date().toISOString();
  const pasados = E.movimientos
    .filter((m) => m.categoriaId === id)
    .map((m) => ({ ...m, categoriaId: reemplazoId, editadoEn: ahora }));
  // Sus límites se van con ella.
  await escribir([
    ['categorias', 'borrar', id],
    ...(reemplazoId ? pasados.map((m) => ['movimientos', 'poner', m]) : []),
    ['ajustes', 'poner', limites().filter((l) => l.categoriaId !== id), 'limites'],
  ]);
  await recargar();
  avisar();
}

// Sube o baja un elemento dentro de la lista visible y renumera el orden.
export async function mover(almacen, lista, id, delta) {
  const i = lista.findIndex((x) => x.id === id);
  const j = i + delta;
  if (j < 0 || j >= lista.length) return;
  const nueva = [...lista];
  [nueva[i], nueva[j]] = [nueva[j], nueva[i]];
  const huecos = lista.map((x) => x.orden).sort((a, b) => a - b);
  const cambiados = nueva.map((x, k) => ({ ...x, orden: huecos[k] }));
  await escribir(cambiados.map((x) => [almacen, 'poner', x]));
  await recargar();
  avisar();
}

// --- Copia de seguridad ---

export function armarCopia() {
  return {
    app: 'mis-cuentas',
    version: 1,
    exportadoEn: new Date().toISOString(),
    inicioApp: E.ajustes.inicioApp,
    nombreUsuaria: nombreUsuaria(),
    limites: limites(),
    cuentas: E.cuentas,
    categorias: E.categorias,
    movimientos: E.movimientos,
  };
}

// Reemplaza todo en una sola operación: si algo falla, los datos anteriores quedan intactos.
export async function restaurarCopia(copia) {
  const cuentas = copia.cuentas.map((c, i) => completarCuenta(
    c.archivada && !c.archivadaEn ? { ...c, archivadaEn: fechaHoy() } : c,
    i,
  ));
  await escribir([
    ...['cuentas', 'movimientos', 'categorias'].map((a) => [a, 'vaciar']),
    ...cuentas.map((c) => ['cuentas', 'poner', c]),
    ...copia.categorias.map(completarCategoria).map((c) => ['categorias', 'poner', c]),
    ...(copia.nombreUsuaria ? [['ajustes', 'poner', copia.nombreUsuaria, 'nombreUsuaria']] : []),
    ['ajustes', 'poner', copia.limites ?? [], 'limites'],
    ['ajustes', 'poner', true, 'dulcesAgregada'],
    ...copia.movimientos.map((m) => ['movimientos', 'poner', m]),
    ['ajustes', 'poner', true, 'bienvenidaHecha'],
    ['ajustes', 'poner', copia.inicioApp ?? fechaHoy(), 'inicioApp'],
    ['ajustes', 'poner', copia.exportadoEn ?? new Date().toISOString(), 'ultimaCopia'],
  ]);
  await recargar();
  avisar();
}
