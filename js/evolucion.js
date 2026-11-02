// Pantalla Evolución del mes.
import { primerMes, serieMes } from './calculos.js';
import { E } from './datos.js';
import { fechaHoy, inicioDeMes, mesAnterior, mesSiguiente, nombreMes } from './fechas.js';
import { lineaSaldo } from './graficos.js';
import { h, icono, monto, pestanas, seccion } from './ui.js';

let mesElegido = null;

export function pantallaEvolucion(repintar) {
  const hoy = fechaHoy();
  const mesActual = inicioDeMes(hoy);
  const minimo = primerMes(E.movimientos, E.ajustes.inicioApp, hoy);
  const mes = mesElegido && mesElegido >= minimo && mesElegido <= mesActual ? mesElegido : mesActual;
  const serie = serieMes(E.cuentas, E.movimientos, mes, hoy);
  const esActual = mes === mesActual;

  const cambiarMes = (nuevo) => {
    mesElegido = nuevo;
    repintar();
  };

  const oculto = E.ajustes.ocultarMontos;
  const variacionTexto = `${serie.variacion > 0 && !oculto ? '+' : ''}${monto(serie.variacion)}`;
  const claseVariacion = oculto || serie.variacion === 0 ? '' : serie.variacion < 0 ? 'gasto-texto' : 'ingreso-texto';
  const datos = [
    ['Inicio del mes', monto(serie.inicio)],
    [esActual ? 'Saldo actual' : 'Saldo final', monto(serie.final)],
    ['Variación', variacionTexto, claseVariacion],
    ['Gastado', monto(serie.gastado), 'gasto-texto'],
    ['Ingresos', monto(serie.ingresos), 'ingreso-texto'],
    ['Gasto promedio por día', monto(serie.promedioDiario)],
  ];

  return [
    h('h1', { class: 'titulo titulo-pantalla' }, 'Evolución'),
    pestanas('evolucion'),
    h(
      'div',
      { class: 'selector-mes' },
      h('button', {
        type: 'button', class: 'boton-icono', 'aria-label': 'Mes anterior',
        disabled: mes <= minimo, onclick: () => cambiarMes(mesAnterior(mes)),
      }, icono('atras')),
      h('strong', {}, nombreMes(mes)),
      h('button', {
        type: 'button', class: 'boton-icono', 'aria-label': 'Mes siguiente',
        disabled: esActual, onclick: () => cambiarMes(mesSiguiente(mes)),
      }, icono('adelante')),
    ),
    seccion(
      'Saldo total día a día',
      h(
        'div',
        { class: 'tarjeta' },
        lineaSaldo(serie, hoy),
        h('p', { class: 'nota' }, 'La línea punteada marca el saldo con que empezó el mes.'),
      ),
    ),
    seccion('Resumen del mes', h('dl', { class: 'tarjeta datos-mes' }, datos.map(([titulo, valor, clase]) => h(
      'div',
      { class: 'dato' },
      h('dt', {}, titulo),
      h('dd', { class: `cifra ${clase ?? ''}` }, valor),
    )))),
  ];
}
