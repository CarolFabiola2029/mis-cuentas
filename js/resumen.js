// Pantalla Resumen (Inicio).
import {
  agruparPorDia, aFavorTarjeta, deudaTarjeta, esTarjeta, gastoEntre, gastoPorCategoria, gastosHoySemanaMes,
  saldosPorCuenta, totalDisponible, ultimos7Dias,
} from './calculos.js';
import { E, nombreUsuaria, ponerAjuste } from './datos.js';
import { abrirEdicion } from './editar.js';
import { etiquetaDia, fechaHoy, fechaLima, fechaSaludo, hora12, inicioDeMes, sumarDias } from './fechas.js';
import { fraseDelDia } from './frase.js';
import * as frases from './frases.js';
import { barras7Dias } from './graficos.js';
import { bloqueLimitesResumen } from './limites.js';
import { hacerCopia } from './respaldo.js';
import {
  cuadroCuenta, cuadroIcono, h, icono, iniciales, monto, pestanas, seccion,
} from './ui.js';

const MOVIMIENTOS_POR_TANDA = 60;
const DIAS_PARA_RECORDAR_COPIA = 7;
const TONOS_CATEGORIA = ['#C93D6E', '#E07A9E', '#EBA3BD', '#F2C3D4', '#F6D3E0'];

let limite = MOVIMIENTOS_POR_TANDA;
let globoVisible = false;
let animarGlobo = false;

// --- Saludo y frase del día ---

function lanzarCorazones(boton) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const caja = boton.getBoundingClientRect();
  for (let i = 0; i < 4; i += 1) {
    const corazon = h('span', {
      class: 'corazon-flotante',
      style: `left:${caja.left + caja.width / 2 - 8 + (i - 1.5) * 9}px;top:${caja.top + window.scrollY}px;animation-delay:${i * 90}ms;--desvio:${(i - 1.5) * 14}px`,
    }, icono('corazon', { relleno: true, tamano: 16 }));
    document.body.append(corazon);
    setTimeout(() => corazon.remove(), 1500);
  }
}

async function tocarCorazon(e, repintar) {
  globoVisible = !globoVisible;
  animarGlobo = globoVisible;
  if (globoVisible) {
    lanzarCorazones(e.currentTarget);
    const hoy = fechaLima();
    const historial = E.ajustes.historialFrases ?? [];
    const elegida = fraseDelDia(hoy, historial, frases);
    // ponerAjuste repinta la pantalla; si la frase ya estaba guardada, se repinta a mano.
    if (elegida.historial !== historial) await ponerAjuste('historialFrases', elegida.historial);
    else repintar();
  } else {
    repintar();
  }
}

function saludo(repintar) {
  const nombre = nombreUsuaria();
  const fraseHoy = (E.ajustes.historialFrases ?? []).find((f) => f.fecha === fechaLima());
  return [
    h(
      'header',
      { class: 'saludo' },
      h(
        'div',
        { class: 'saludo-texto' },
        h('span', { class: 'saludo-fecha' }, fechaSaludo(fechaHoy())),
        h(
          'div',
          { class: 'saludo-fila' },
          h('h1', { class: 'titulo' }, `Hola, ${nombre}`),
          h('button', {
            type: 'button',
            class: 'boton-corazon',
            'aria-label': globoVisible ? 'Ocultar la frase del día' : 'Ver la frase del día',
            'aria-expanded': String(globoVisible),
            onclick: (e) => tocarCorazon(e, repintar),
          }, icono('corazon', { relleno: true })),
        ),
      ),
      h('span', { class: 'avatar', 'aria-hidden': 'true' }, iniciales(nombre).slice(0, 1)),
    ),
    globoVisible && fraseHoy && h(
      'div',
      { class: `globo ${animarGlobo ? 'entrando' : ''}`, role: 'status' },
      h('p', {}, fraseHoy.texto),
      h('span', { class: 'firma' }, '— Andrés'),
    ),
  ];
}

// --- Tarjeta principal ---

function tarjetaPrincipal(total, gastos) {
  const oculto = Boolean(E.ajustes.ocultarMontos);
  const excluidas = E.cuentas.filter((c) => !c.archivada && !esTarjeta(c) && c.noSumarAlDisponible)
    .map((c) => c.nombre.replace(/\s+BBVA$|\s+BCP$/i, ''));
  const nota = excluidas.length
    ? `No incluye ${excluidas.join(', ')} ni tarjeta de crédito`
    : 'No incluye tarjeta de crédito';
  return h(
    'section',
    { class: 'principal', 'aria-label': 'Dinero disponible' },
    h('span', { class: 'principal-titulo' }, 'Dinero disponible'),
    h(
      'div',
      { class: 'principal-fila' },
      h('span', { class: 'principal-monto cifra' }, monto(total)),
      h('button', {
        type: 'button',
        class: 'boton-ojo',
        'aria-label': oculto ? 'Mostrar montos' : 'Ocultar montos',
        'aria-pressed': String(oculto),
        onclick: () => ponerAjuste('ocultarMontos', !oculto),
      }, icono(oculto ? 'ojoTachado' : 'ojo', { tamano: 22 })),
    ),
    h('span', { class: 'principal-nota' }, nota),
    h('div', { class: 'principal-cajas' }, [['Hoy', gastos.hoy], ['Semana', gastos.semana], ['Mes', gastos.mes]].map(([titulo, valor]) => h(
      'div',
      { class: 'principal-caja' },
      h('span', {}, titulo),
      h('strong', { class: 'cifra' }, monto(valor)),
    ))),
  );
}

function avisoCopia() {
  return h(
    'div',
    { class: 'aviso-copia' },
    h('span', {}, 'Haz una copia de seguridad'),
    h('button', { type: 'button', class: 'boton-chico', onclick: hacerCopia }, 'Hacer copia'),
  );
}

function necesitaCopia(hoy) {
  const ultima = E.ajustes.ultimaCopia ? fechaHoy(new Date(E.ajustes.ultimaCopia)) : E.ajustes.inicioApp;
  return E.movimientos.length > 0 && ultima < sumarDias(hoy, -DIAS_PARA_RECORDAR_COPIA);
}

// --- Cuentas ---

function filaCuenta(cuenta, saldo) {
  if (esTarjeta(cuenta)) {
    const aFavor = aFavorTarjeta(cuenta, saldo);
    const porcentaje = cuenta.lineaCredito > 0 ? Math.min(100, Math.max(0, (saldo / cuenta.lineaCredito) * 100)) : 0;
    return h(
      'li',
      { class: 'cuenta' },
      h(
        'div',
        { class: 'cuenta-fila' },
        cuadroCuenta(cuenta),
        h(
          'div',
          { class: 'cuenta-nombre' },
          h('strong', {}, cuenta.nombre),
          h('small', { class: 'cifra' }, aFavor > 0 ? `A favor ${monto(aFavor)}` : `Deuda ${monto(deudaTarjeta(cuenta, saldo))}`),
        ),
        h('div', { class: 'cuenta-monto' }, h('strong', { class: 'cifra' }, monto(saldo)), h('small', {}, 'disponible')),
      ),
      cuenta.lineaCredito > 0 && h(
        'div',
        {
          class: 'pista', role: 'img',
          'aria-label': E.ajustes.ocultarMontos ? 'Línea disponible' : `${Math.round(porcentaje)} % de la línea disponible`,
        },
        h('div', { class: 'relleno tarjeta-relleno', style: `width:${porcentaje}%` }),
      ),
    );
  }
  return h(
    'li',
    { class: 'cuenta' },
    h(
      'div',
      { class: 'cuenta-fila' },
      cuadroCuenta(cuenta),
      h(
        'div',
        { class: 'cuenta-nombre' },
        h('strong', {}, cuenta.nombre),
        cuenta.noSumarAlDisponible && h('span', { class: 'pildora-aviso' }, 'No suma al disponible'),
      ),
      h('div', { class: 'cuenta-monto' }, h('strong', { class: `cifra ${cuenta.noSumarAlDisponible ? 'apagado' : ''}` }, monto(saldo))),
    ),
  );
}

// --- Categorías del mes ---

function bloqueCategorias(hoy) {
  const filas = gastoPorCategoria(E.movimientos, E.categorias, inicioDeMes(hoy), hoy);
  if (filas.length === 0) return h('p', { class: 'vacio' }, 'Aún no hay gastos este mes.');
  const mayor = filas[0].monto;
  return h('ul', { class: 'categorias' }, filas.map((c, i) => h(
    'li',
    {},
    h(
      'div',
      { class: 'categoria-fila' },
      h('strong', {}, c.nombre),
      h('span', { class: 'cifra' }, `${monto(c.monto)} · ${c.porcentaje}%`),
    ),
    h('div', { class: 'pista gruesa' }, h('div', {
      class: 'relleno',
      style: `width:${(c.monto / mayor) * 100}%;background:${TONOS_CATEGORIA[Math.min(i, TONOS_CATEGORIA.length - 1)]}`,
    })),
  )));
}

// --- Movimientos ---

const SIGNOS = { GASTO: '−', INGRESO: '+', TRANSFERENCIA: '' };

function datosMovimiento(m) {
  const cuenta = E.cuentas.find((c) => c.id === m.cuentaId)?.nombre ?? '';
  const hora = hora12(m.hora);
  if (m.tipo === 'TRANSFERENCIA') {
    const destino = E.cuentas.find((c) => c.id === m.cuentaDestinoId)?.nombre ?? '';
    return { icono: 'flechas', titulo: m.descripcion || 'Transferencia', detalle: `${cuenta} → ${destino} · ${hora}` };
  }
  const categoria = E.categorias.find((c) => c.id === m.categoriaId);
  const nombre = categoria?.nombre ?? 'Sin categoría';
  return { icono: categoria?.icono ?? 'puntos', titulo: m.descripcion || nombre, detalle: `${nombre} · ${cuenta} · ${hora}` };
}

function filaMovimiento(m) {
  const d = datosMovimiento(m);
  return h(
    'li',
    {},
    h(
      'button',
      { type: 'button', class: `movimiento mov-${m.tipo.toLowerCase()}`, onclick: () => abrirEdicion(m) },
      cuadroIcono(d.icono, null, 40),
      h('span', { class: 'mov-texto' }, h('strong', {}, d.titulo), h('small', {}, d.detalle)),
      h('span', { class: 'mov-monto cifra' }, `${E.ajustes.ocultarMontos ? '' : SIGNOS[m.tipo]}${monto(m.monto)}`),
    ),
  );
}

function bloqueMovimientos(hoy) {
  if (E.movimientos.length === 0) {
    return h('p', { class: 'vacio' }, 'Aún no hay movimientos. Usa los botones de abajo para registrar el primero.');
  }
  const visibles = E.movimientos.slice(0, limite);
  return [
    agruparPorDia(visibles).map((g) => {
      const gastado = gastoEntre(E.movimientos, g.fecha, g.fecha);
      return h(
        'div',
        { class: 'grupo-dia' },
        h(
          'div',
          { class: 'grupo-cabecera' },
          h('h3', {}, etiquetaDia(g.fecha, hoy)),
          gastado > 0 && h('span', { class: 'cifra' }, `Gastado ${monto(gastado)}`),
        ),
        h('ul', { class: 'movimientos' }, g.movimientos.map(filaMovimiento)),
      );
    }),
    E.movimientos.length > limite && h('button', {
      type: 'button',
      class: 'boton suave',
      onclick: (e) => {
        limite += MOVIMIENTOS_POR_TANDA;
        e.target.closest('.bloque-movimientos').replaceWith(h('div', { class: 'bloque-movimientos' }, bloqueMovimientos(hoy)));
      },
    }, 'Ver más'),
  ];
}

export function pantallaResumen(repintar) {
  const hoy = fechaHoy();
  const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
  const activas = E.cuentas.filter((c) => !c.archivada);
  const vista = [
    saludo(repintar),
    tarjetaPrincipal(totalDisponible(E.cuentas, saldos), gastosHoySemanaMes(E.movimientos, hoy)),
    pestanas('resumen'),
    necesitaCopia(hoy) && avisoCopia(),
    seccion(
      'Mis cuentas',
      activas.length
        ? h('ul', { class: 'tarjeta cuentas' }, activas.map((c) => filaCuenta(c, saldos.get(c.id))))
        : h('p', { class: 'vacio' }, 'No hay cuentas activas. Agrega una en Ajustes.'),
    ),
    seccion('Últimos 7 días', h('div', { class: 'tarjeta' }, barras7Dias(ultimos7Dias(E.movimientos, hoy), hoy))),
    bloqueLimitesResumen(),
    seccion('En qué se fue este mes', h('div', { class: 'tarjeta' }, bloqueCategorias(hoy))),
    seccion('Movimientos', h('div', { class: 'bloque-movimientos' }, bloqueMovimientos(hoy))),
  ];
  animarGlobo = false;
  return vista;
}
