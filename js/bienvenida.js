// Pantalla del primer arranque.
import { botonRestaurar } from './ajustes.js';
import { esTarjeta } from './calculos.js';
import { completarBienvenida, E } from './datos.js';
import { aCentimos } from './dinero.js';
import { campo, campoMonto, h } from './ui.js';

export function pantallaBienvenida(alTerminar) {
  const entradas = new Map(E.cuentas.map((c) => [c.id, { saldo: '', linea: '' }]));
  const error = h('p', { class: 'error', role: 'alert' });

  const campoDe = (cuenta, clave, texto) => campo(texto, campoMonto({
    'aria-label': `${cuenta.nombre}: ${texto}`,
    oninput: (e) => { entradas.get(cuenta.id)[clave] = e.target.value; },
  }));

  const leer = (texto) => (texto.trim() === '' ? 0 : aCentimos(texto));

  async function empezar() {
    const cuentas = [];
    for (const c of E.cuentas) {
      const { saldo, linea } = entradas.get(c.id);
      const saldoInicial = leer(saldo);
      const lineaCredito = esTarjeta(c) ? leer(linea) : 0;
      if (saldoInicial === null || lineaCredito === null) {
        error.textContent = `Revisa el monto de ${c.nombre}.`;
        return;
      }
      if (esTarjeta(c) && saldoInicial > lineaCredito) {
        error.textContent = 'La línea disponible no puede ser mayor que la línea total.';
        return;
      }
      cuentas.push({ ...c, saldoInicial, lineaCredito });
    }
    try {
      await completarBienvenida(cuentas);
      alTerminar();
    } catch {
      error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
    }
  }

  return h(
    'div',
    { class: 'bienvenida' },
    h('h1', {}, 'Mis Cuentas'),
    h('p', {}, 'Ingresa cuánto tienes hoy en cada cuenta. Si dejas un campo vacío queda en S/ 0.00, y todo se puede cambiar después en Ajustes.'),
    h('section', { class: 'tarjeta' }, E.cuentas.map((c) => (esTarjeta(c)
      ? h(
        'div',
        { class: 'bloque-tarjeta' },
        h('strong', {}, c.nombre),
        campoDe(c, 'linea', 'Línea total (S/)'),
        campoDe(c, 'saldo', 'Línea disponible (S/)'),
      )
      : campoDe(c, 'saldo', c.nombre)))),
    error,
    h('button', { type: 'button', class: 'boton primario', onclick: empezar }, 'Empezar'),
    botonRestaurar('Ya tengo una copia de seguridad', 'boton suave', alTerminar),
  );
}
