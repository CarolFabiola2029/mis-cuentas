// Pantalla Resumen (Inicio).
import {
  agruparPorDia, deudaTarjeta, aFavorTarjeta, esTarjeta, gastoPorCategoria, gastosHoySemanaMes,
  saldosPorCuenta, totalDisponible, ultimos7Dias,
} from './calculos.js';
import { E, ponerAjuste } from './datos.js';
import { abrirEdicion } from './editar.js';
import { etiquetaDia, fechaHoy, hora12, inicioDeMes, sumarDias } from './fechas.js';
import { barras7Dias } from './graficos.js';
import { hacerCopia } from './respaldo.js';
import { h, iconos, monto, tarjeta } from './ui.js';

const MOVIMIENTOS_POR_TANDA = 60;
const DIAS_PARA_RECORDAR_COPIA = 7;
let limite = MOVIMIENTOS_POR_TANDA;

function necesitaCopia(hoy) {
  const ultima = E.ajustes.ultimaCopia ? fechaHoy(new Date(E.ajustes.ultimaCopia)) : E.ajustes.inicioApp;
  return E.movimientos.length > 0 && ultima < sumarDias(hoy, -DIAS_PARA_RECORDAR_COPIA);
}

function avisoCopia() {
  return h(
    'div',
    { class: 'aviso-copia' },
    h('span', {}, 'Haz una copia de seguridad'),
    h('button', { type: 'button', class: 'boton-chico', onclick: hacerCopia }, 'Hacer copia'),
  );
}

function bloqueTotal(total) {
  const oculto = Boolean(E.ajustes.ocultarMontos);
  return h(
    'section',
    { class: 'total' },
    h('span', { class: 'total-titulo' }, 'Dinero disponible'),
    h(
      'div',
      { class: 'total-fila' },
      h('span', { class: 'total-monto cifra' }, monto(total)),
      h('button', {
        type: 'button',
        class: 'boton-icono ojo',
        'aria-label': oculto ? 'Mostrar montos' : 'Ocultar montos',
        'aria-pressed': String(oculto),
        onclick: () => ponerAjuste('ocultarMontos', !oculto),
      }, oculto ? iconos.ojoTachado() : iconos.ojo()),
    ),
  );
}

function bloqueGastado(gastos) {
  return h('section', { class: 'gastado' }, [['Hoy', gastos.hoy], ['Semana', gastos.semana], ['Mes', gastos.mes]].map(([titulo, valor]) => h(
    'div',
    { class: 'gastado-celda' },
    h('span', {}, titulo),
    h('strong', { class: 'cifra gasto-texto' }, monto(valor)),
  )));
}

function filaCuenta(cuenta, saldo) {
  if (esTarjeta(cuenta)) {
    const aFavor = aFavorTarjeta(cuenta, saldo);
    return h(
      'li',
      { class: 'cuenta' },
      h('div', {}, h('strong', {}, cuenta.nombre), h('small', {}, 'Tarjeta de crédito')),
      h(
        'div',
        { class: 'cuenta-montos' },
        h('strong', { class: 'cifra' }, monto(saldo)),
        h('small', { class: 'cifra' }, 'Disponible'),
        h('small', { class: 'cifra' }, aFavor > 0 ? `A favor ${monto(aFavor)}` : `Deuda ${monto(deudaTarjeta(cuenta, saldo))}`),
      ),
    );
  }
  return h(
    'li',
    { class: 'cuenta' },
    h('div', {}, h('strong', {}, cuenta.nombre), cuenta.noSumarAlDisponible && h('small', {}, 'No suma al disponible')),
    h('strong', { class: 'cifra' }, monto(saldo)),
  );
}

function bloqueCategorias(hoy) {
  const filas = gastoPorCategoria(E.movimientos, E.categorias, inicioDeMes(hoy), hoy);
  if (filas.length === 0) return h('p', { class: 'vacio' }, 'Aún no hay gastos este mes.');
  const mayor = filas[0].monto;
  return h('ul', { class: 'categorias' }, filas.map((c) => h(
    'li',
    {},
    h(
      'div',
      { class: 'categoria-fila' },
      h('span', {}, `${c.emoji} ${c.nombre}`),
      h('span', { class: 'cifra' }, monto(c.monto), h('small', {}, ` ${c.porcentaje}%`)),
    ),
    h('div', { class: 'pista' }, h('div', { class: 'relleno', style: `width:${(c.monto / mayor) * 100}%` })),
  )));
}

function textoMovimiento(m) {
  const categoria = E.categorias.find((c) => c.id === m.categoriaId);
  const cuenta = E.cuentas.find((c) => c.id === m.cuentaId)?.nombre ?? '';
  const hora = hora12(m.hora);
  if (m.tipo === 'TRANSFERENCIA') {
    const destino = E.cuentas.find((c) => c.id === m.cuentaDestinoId)?.nombre ?? '';
    return { emoji: '⇄', titulo: m.descripcion || 'Transferencia', detalle: `${cuenta} → ${destino} · ${hora}` };
  }
  const nombre = categoria?.nombre ?? 'Sin categoría';
  return {
    emoji: categoria?.emoji ?? '❓',
    titulo: m.descripcion || nombre,
    detalle: `${m.descripcion ? `${nombre} · ` : ''}${cuenta} · ${hora}`,
  };
}

const SIGNOS = { GASTO: '−', INGRESO: '+', TRANSFERENCIA: '' };
const CLASES = { GASTO: 'gasto-texto', INGRESO: 'ingreso-texto', TRANSFERENCIA: 'transferencia-texto' };

function filaMovimiento(m) {
  const { emoji, titulo, detalle } = textoMovimiento(m);
  return h(
    'li',
    {},
    h(
      'button',
      { type: 'button', class: 'movimiento', onclick: () => abrirEdicion(m) },
      h('span', { class: 'mov-emoji' }, emoji),
      h('span', { class: 'mov-texto' }, h('strong', {}, titulo), h('small', {}, detalle)),
      h('span', { class: `cifra ${CLASES[m.tipo]}` }, `${E.ajustes.ocultarMontos ? '' : SIGNOS[m.tipo]}${monto(m.monto)}`),
    ),
  );
}

function bloqueMovimientos(hoy) {
  if (E.movimientos.length === 0) {
    return h('p', { class: 'vacio' }, 'Aún no hay movimientos. Usa los botones de abajo para registrar el primero.');
  }
  const visibles = E.movimientos.slice(0, limite);
  return [
    agruparPorDia(visibles).map((g) => h(
      'div',
      { class: 'grupo-dia' },
      h('h3', {}, etiquetaDia(g.fecha, hoy)),
      h('ul', { class: 'movimientos' }, g.movimientos.map(filaMovimiento)),
    )),
    E.movimientos.length > limite && h('button', {
      type: 'button',
      class: 'boton suave',
      onclick: (e) => {
        limite += MOVIMIENTOS_POR_TANDA;
        e.target.closest('section').replaceWith(tarjeta('Movimientos', bloqueMovimientos(hoy)));
      },
    }, 'Ver más'),
  ];
}

export function pantallaResumen() {
  const hoy = fechaHoy();
  const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
  const activas = E.cuentas.filter((c) => !c.archivada);
  return [
    necesitaCopia(hoy) && avisoCopia(),
    bloqueTotal(totalDisponible(E.cuentas, saldos)),
    bloqueGastado(gastosHoySemanaMes(E.movimientos, hoy)),
    tarjeta(
      'Mis cuentas',
      activas.length
        ? h('ul', { class: 'cuentas' }, activas.map((c) => filaCuenta(c, saldos.get(c.id))))
        : h('p', { class: 'vacio' }, 'No hay cuentas activas. Agrega una en Ajustes.'),
    ),
    tarjeta('Últimos 7 días', barras7Dias(ultimos7Dias(E.movimientos, hoy), hoy)),
    tarjeta('Gasto del mes por categoría', bloqueCategorias(hoy)),
    tarjeta('Movimientos', bloqueMovimientos(hoy)),
  ];
}
