// Reglas de saldos y estadísticas. Funciones puras: no tocan la pantalla ni la base de datos.
import { finDeMes, inicioDeMes, lunesDe, sumarDias } from './fechas.js';

export const TIPOS_CUENTA = ['BANCO', 'EFECTIVO', 'TARJETA_CREDITO'];
export const TIPOS_MOVIMIENTO = ['GASTO', 'INGRESO', 'TRANSFERENCIA'];

export const esTarjeta = (cuenta) => cuenta.tipo === 'TARJETA_CREDITO';

// Saldo = saldo inicial + ingresos − gastos ± transferencias.
// Con "hasta" solo cuenta los movimientos hasta esa fecha, incluida.
export function saldosPorCuenta(cuentas, movimientos, hasta = null) {
  const saldos = new Map(cuentas.map((c) => [c.id, c.saldoInicial]));
  const sumar = (id, valor) => {
    if (saldos.has(id)) saldos.set(id, saldos.get(id) + valor);
  };
  for (const m of movimientos) {
    if (hasta && m.fecha > hasta) continue;
    if (m.tipo === 'INGRESO') sumar(m.cuentaId, m.monto);
    else sumar(m.cuentaId, -m.monto);
    if (m.tipo === 'TRANSFERENCIA') sumar(m.cuentaDestinoId, m.monto);
  }
  return saldos;
}

// En tarjeta, el saldo es la línea disponible.
export const deudaTarjeta = (cuenta, saldo) => Math.max(0, cuenta.lineaCredito - saldo);
export const aFavorTarjeta = (cuenta, saldo) => Math.max(0, saldo - cuenta.lineaCredito);

// Lo que se debe en todas las tarjetas activas (para el botón "Contando crédito").
export const deudaTarjetas = (cuentas, saldos) => cuentas
  .filter((c) => !c.archivada && esTarjeta(c))
  .reduce((total, c) => total + deudaTarjeta(c, saldos.get(c.id)), 0);

const sumaAlDisponible = (c) => !esTarjeta(c) && !c.noSumarAlDisponible;

export function totalDisponible(cuentas, saldos) {
  return cuentas
    .filter((c) => !c.archivada && sumaAlDisponible(c))
    .reduce((total, c) => total + saldos.get(c.id), 0);
}

// Total disponible al cierre de un día pasado. Una cuenta archivada sigue contando
// en los días anteriores a su archivo, para que los meses pasados no cambien.
export function totalEnFecha(cuentas, movimientos, fecha) {
  const saldos = saldosPorCuenta(cuentas, movimientos, fecha);
  return cuentas
    .filter((c) => sumaAlDisponible(c) && (!c.archivada || fecha < c.archivadaEn))
    .reduce((total, c) => total + saldos.get(c.id), 0);
}

const sumaTipo = (movimientos, tipo, desde, hasta) => movimientos
  .filter((m) => m.tipo === tipo && m.fecha >= desde && m.fecha <= hasta)
  .reduce((total, m) => total + m.monto, 0);

export const gastoEntre = (movimientos, desde, hasta) => sumaTipo(movimientos, 'GASTO', desde, hasta);

export function gastosHoySemanaMes(movimientos, hoy) {
  return {
    hoy: gastoEntre(movimientos, hoy, hoy),
    semana: gastoEntre(movimientos, lunesDe(hoy), hoy),
    mes: gastoEntre(movimientos, inicioDeMes(hoy), hoy),
  };
}

export function ultimos7Dias(movimientos, hoy) {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(hoy, i - 6);
    return { fecha, monto: gastoEntre(movimientos, fecha, fecha) };
  });
}

export function gastoPorCategoria(movimientos, categorias, desde, hasta) {
  const montos = new Map();
  for (const m of movimientos) {
    if (m.tipo !== 'GASTO' || m.fecha < desde || m.fecha > hasta) continue;
    montos.set(m.categoriaId, (montos.get(m.categoriaId) ?? 0) + m.monto);
  }
  const total = [...montos.values()].reduce((a, b) => a + b, 0);
  return [...montos.entries()]
    .map(([id, monto]) => {
      const categoria = categorias.find((c) => c.id === id);
      return {
        id,
        nombre: categoria?.nombre ?? 'Sin categoría',
        icono: categoria?.icono ?? 'puntos',
        monto,
        porcentaje: Math.round((monto / total) * 100),
      };
    })
    .sort((a, b) => b.monto - a.monto);
}

// Datos de la pantalla Evolución para el mes que contiene "fechaMes".
export function serieMes(cuentas, movimientos, fechaMes, hoy) {
  const desde = inicioDeMes(fechaMes);
  const ultimoDia = finDeMes(fechaMes);
  const hasta = ultimoDia < hoy ? ultimoDia : hoy;
  const dias = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    dias.push({ fecha: f, saldo: totalEnFecha(cuentas, movimientos, f) });
  }
  const inicio = totalEnFecha(cuentas, movimientos, sumarDias(desde, -1));
  const final = dias.at(-1).saldo;
  const gastado = gastoEntre(movimientos, desde, hasta);
  return {
    dias,
    diasDelMes: Number(ultimoDia.slice(8)),
    inicio,
    final,
    variacion: final - inicio,
    gastado,
    ingresos: sumaTipo(movimientos, 'INGRESO', desde, hasta),
    promedioDiario: Math.round(gastado / dias.length),
  };
}

// Primer mes que se puede consultar en Evolución.
export function primerMes(movimientos, inicioApp, hoy) {
  const fechas = movimientos.map((m) => m.fecha);
  if (inicioApp) fechas.push(inicioApp);
  return inicioDeMes(fechas.reduce((min, f) => (f < min ? f : min), hoy));
}

export function ordenarMovimientos(movimientos) {
  const clave = (m) => `${m.fecha} ${m.hora} ${m.creadoEn}`;
  return [...movimientos].sort((a, b) => clave(b).localeCompare(clave(a)));
}

export function agruparPorDia(movimientosOrdenados) {
  const grupos = [];
  for (const m of movimientosOrdenados) {
    if (grupos.at(-1)?.fecha !== m.fecha) grupos.push({ fecha: m.fecha, movimientos: [] });
    grupos.at(-1).movimientos.push(m);
  }
  return grupos;
}

export function movimientosDeCuenta(movimientos, cuentaId) {
  return movimientos.filter((m) => m.cuentaId === cuentaId || m.cuentaDestinoId === cuentaId);
}

// Deja solo los campos que corresponden al tipo de movimiento.
export function normalizarMovimiento(m) {
  const transferencia = m.tipo === 'TRANSFERENCIA';
  return {
    ...m,
    categoriaId: transferencia ? '' : m.categoriaId,
    cuentaDestinoId: transferencia ? m.cuentaDestinoId : '',
    descripcion: (m.descripcion ?? '').trim(),
  };
}

// Devuelve el problema en palabras, o null si el movimiento está bien.
export function validarMovimiento(m, hoy) {
  if (!TIPOS_MOVIMIENTO.includes(m.tipo)) return 'Elige el tipo de movimiento.';
  if (!Number.isInteger(m.monto) || m.monto <= 0) return 'Escribe un monto mayor a cero.';
  if (m.tipo !== 'TRANSFERENCIA' && !m.categoriaId) return 'Elige una categoría.';
  if (!m.cuentaId) return m.tipo === 'TRANSFERENCIA' ? 'Elige la cuenta de origen.' : 'Elige una cuenta.';
  if (m.tipo === 'TRANSFERENCIA') {
    if (!m.cuentaDestinoId) return 'Elige la cuenta de destino.';
    if (m.cuentaDestinoId === m.cuentaId) return 'El origen y el destino deben ser cuentas distintas.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(m.fecha ?? '')) return 'Elige la fecha.';
  if (m.fecha > hoy) return 'La fecha no puede ser futura.';
  if (!/^\d{2}:\d{2}$/.test(m.hora ?? '')) return 'Elige la hora.';
  return null;
}

// Revisa una copia de seguridad antes de tocar los datos actuales.
// --- Límites de gasto ---
// Un límite: { id, categoriaId, monto (céntimos), periodo: 'DIA' | 'SEMANA' | 'MES' }

export const PERIODOS = { DIA: 'Por día', SEMANA: 'Por semana', MES: 'Por mes' };
export const PERIODOS_FRASE = { DIA: 'hoy', SEMANA: 'esta semana', MES: 'este mes' };

// Días que abarca el periodo que contiene la fecha (la semana va de lunes a domingo).
export function rangoPeriodo(periodo, fecha) {
  if (periodo === 'DIA') return { desde: fecha, hasta: fecha };
  if (periodo === 'SEMANA') {
    const lunes = lunesDe(fecha);
    return { desde: lunes, hasta: sumarDias(lunes, 6) };
  }
  return { desde: inicioDeMes(fecha), hasta: finDeMes(fecha) };
}

// Cuánto se lleva gastado de cada límite en el periodo que contiene "fecha".
// Se pasa solo si el gasto supera el límite: con S/ 10.00 de límite, 10.00 no avisa y 10.10 sí.
export function estadoLimites(limites, movimientos, fecha) {
  return limites.map((limite) => {
    const { desde, hasta } = rangoPeriodo(limite.periodo, fecha);
    const gastado = movimientos
      .filter((m) => m.tipo === 'GASTO' && m.categoriaId === limite.categoriaId && m.fecha >= desde && m.fecha <= hasta)
      .reduce((total, m) => total + m.monto, 0);
    return {
      limite,
      gastado,
      excedido: gastado > limite.monto,
      exceso: Math.max(0, gastado - limite.monto),
      porcentaje: limite.monto > 0 ? (gastado / limite.monto) * 100 : 0,
    };
  });
}

// Límites que quedaron pasados por un gasto recién guardado o editado.
export const limitesPasadosPor = (movimiento, limites, movimientos) => (
  movimiento.tipo !== 'GASTO' ? [] : estadoLimites(
    limites.filter((l) => l.categoriaId === movimiento.categoriaId),
    movimientos,
    movimiento.fecha,
  ).filter((e) => e.excedido)
);

const limiteOk = (l) => l?.id && typeof l.categoriaId === 'string'
  && Number.isInteger(l.monto) && l.monto > 0 && Object.hasOwn(PERIODOS, l.periodo);

export function validarCopia(copia) {
  const invalida = 'Este archivo no es una copia válida de Mis Cuentas.';
  if (copia?.app !== 'mis-cuentas' || copia.version !== 1) return invalida;
  const { cuentas, movimientos, categorias } = copia;
  if (![cuentas, movimientos, categorias].every(Array.isArray)) return invalida;
  const cuentaOk = (c) => c?.id && typeof c.nombre === 'string' && TIPOS_CUENTA.includes(c.tipo)
    && Number.isInteger(c.saldoInicial) && Number.isInteger(c.lineaCredito) && Number.isInteger(c.orden);
  // Las copias antiguas traen "emoji"; las nuevas, "icono".
  const categoriaOk = (c) => c?.id && typeof c.nombre === 'string'
    && (typeof c.icono === 'string' || typeof c.emoji === 'string')
    && ['GASTO', 'INGRESO'].includes(c.tipo) && Number.isInteger(c.orden);
  if (!cuentas.every(cuentaOk) || !categorias.every(categoriaOk)) return invalida;
  const idsCuenta = new Set(cuentas.map((c) => c.id));
  const movimientoOk = (m) => m?.id && m.creadoEn
    && validarMovimiento(m, '9999-12-31') === null
    && idsCuenta.has(m.cuentaId)
    && (m.tipo !== 'TRANSFERENCIA' || idsCuenta.has(m.cuentaDestinoId));
  if (copia.limites !== undefined && !(Array.isArray(copia.limites) && copia.limites.every(limiteOk))) return invalida;
  return movimientos.every(movimientoOk) ? null : invalida;
}
