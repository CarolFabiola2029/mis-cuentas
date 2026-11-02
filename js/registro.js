// Registro rápido: hoja paso a paso con teclado numérico propio.
import { esTarjeta, normalizarMovimiento, saldosPorCuenta, validarMovimiento } from './calculos.js';
import { E, guardarMovimiento, nuevoId } from './datos.js';
import { aCentimos, formatoSoles, teclear } from './dinero.js';
import { fechaHoy, horaAhora } from './fechas.js';
import { abrirCapa, aviso, campo, h, iconos, monto, vibrar } from './ui.js';

const FLUJOS = {
  GASTO: {
    titulo: 'Nuevo gasto', clase: 'gasto', pasos: ['monto', 'categoria', 'cuenta', 'final'],
    preguntaCuenta: '¿Con qué pagaste?', aviso: 'Gasto guardado', etiquetaCuenta: 'Pagado con',
  },
  INGRESO: {
    titulo: 'Nuevo ingreso', clase: 'ingreso', pasos: ['monto', 'categoria', 'cuenta', 'final'],
    preguntaCuenta: '¿A qué cuenta entró?', aviso: 'Ingreso guardado', etiquetaCuenta: 'Entró a',
  },
  TRANSFERENCIA: {
    titulo: 'Mover dinero', clase: 'transferencia', pasos: ['monto', 'origen', 'destino', 'final'],
    aviso: 'Transferencia guardada',
  },
};

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'borrar'];

export function abrirRegistro(tipo) {
  const flujo = FLUJOS[tipo];
  const b = {
    montoTexto: '', categoriaId: '', cuentaId: '', cuentaDestinoId: '',
    descripcion: '', fecha: fechaHoy(), hora: horaAhora(),
  };
  let indice = 0;
  let guardando = false;
  let hacia = 'adelante';

  const { panel, cerrar } = abrirCapa({
    etiqueta: flujo.titulo,
    alCerrar: () => document.removeEventListener('keydown', teclaFisica),
  });

  const paso = () => flujo.pasos[indice];

  function ir(delta) {
    hacia = delta > 0 ? 'adelante' : 'atras';
    indice += delta;
    pintar();
  }

  // Comodidad para probar en la laptop con el teclado de verdad.
  function teclaFisica(e) {
    if (paso() !== 'monto') return;
    if (/^[0-9]$/.test(e.key)) pulsar(e.key);
    else if (e.key === '.' || e.key === ',') pulsar('.');
    else if (e.key === 'Backspace') pulsar('borrar');
    else if (e.key === 'Enter' && aCentimos(b.montoTexto)) ir(1);
  }
  document.addEventListener('keydown', teclaFisica);

  function pulsar(tecla) {
    b.montoTexto = teclear(b.montoTexto, tecla);
    panel.querySelector('.monto-grande').textContent = formatoSoles(aCentimos(b.montoTexto) ?? 0);
    panel.querySelector('.boton-continuar').disabled = !aCentimos(b.montoTexto);
  }

  function pasoMonto() {
    return h(
      'div',
      { class: 'paso-monto' },
      h('h3', {}, '¿Cuánto?'),
      h('div', { class: `monto-grande ${flujo.clase}` }, formatoSoles(aCentimos(b.montoTexto) ?? 0)),
      h('div', { class: 'teclado' }, TECLAS.map((t) => h('button', {
        type: 'button',
        class: 'tecla',
        'aria-label': t === 'borrar' ? 'Borrar' : t,
        onclick: () => pulsar(t),
      }, t === 'borrar' ? iconos.borrar() : t))),
      h('button', {
        type: 'button',
        class: 'boton primario boton-continuar',
        disabled: !aCentimos(b.montoTexto),
        onclick: () => ir(1),
      }, 'Continuar'),
    );
  }

  function pasoCategoria() {
    const categorias = E.categorias.filter((c) => c.tipo === tipo && !c.archivada);
    return [
      h('h3', {}, '¿En qué categoría?'),
      categorias.length === 0 && h('p', { class: 'vacio' }, 'No hay categorías activas. Agrega una en Ajustes.'),
      h('div', { class: 'rejilla-categorias' }, categorias.map((c) => h('button', {
        type: 'button',
        class: `opcion-categoria ${c.id === b.categoriaId ? 'elegida' : ''}`,
        onclick: () => { b.categoriaId = c.id; ir(1); },
      }, h('span', { class: 'emoji' }, c.emoji), h('span', {}, c.nombre)))),
    ];
  }

  function listaCuentas(titulo, campoCuenta, excluida) {
    const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
    const cuentas = E.cuentas.filter((c) => !c.archivada);
    const disponibles = cuentas.filter((c) => c.id !== excluida);
    return [
      h('h3', {}, titulo),
      disponibles.length === 0 && h('p', { class: 'vacio' }, 'No hay otra cuenta activa. Agrega una en Ajustes.'),
      h('div', { class: 'lista-opciones' }, cuentas.map((c) => h(
        'button',
        {
          type: 'button',
          class: `opcion-cuenta ${c.id === b[campoCuenta] ? 'elegida' : ''}`,
          disabled: c.id === excluida,
          onclick: () => { b[campoCuenta] = c.id; ir(1); },
        },
        h('span', {}, c.nombre, esTarjeta(c) && h('small', {}, 'Disponible')),
        c.id === excluida ? h('small', {}, 'Origen') : h('span', { class: 'cifra' }, monto(saldos.get(c.id))),
      ))),
    ];
  }

  const nombreCuenta = (id) => E.cuentas.find((c) => c.id === id)?.nombre ?? '';

  function pasoFinal() {
    const categoria = E.categorias.find((c) => c.id === b.categoriaId);
    const filas = tipo === 'TRANSFERENCIA'
      ? [['De', nombreCuenta(b.cuentaId)], ['A', nombreCuenta(b.cuentaDestinoId)]]
      : [['Categoría', `${categoria?.emoji} ${categoria?.nombre}`], [flujo.etiquetaCuenta, nombreCuenta(b.cuentaId)]];
    const error = h('p', { class: 'error', role: 'alert' });
    const botonGuardar = h('button', { type: 'button', class: 'boton primario', onclick: guardar }, 'Guardar');

    async function guardar() {
      if (guardando) return;
      const ahora = new Date().toISOString();
      const m = normalizarMovimiento({
        id: nuevoId(), tipo, monto: aCentimos(b.montoTexto), categoriaId: b.categoriaId,
        cuentaId: b.cuentaId, cuentaDestinoId: b.cuentaDestinoId, descripcion: b.descripcion,
        fecha: b.fecha, hora: b.hora, creadoEn: ahora, editadoEn: ahora,
      });
      const problema = validarMovimiento(m, fechaHoy());
      if (problema) { error.textContent = problema; return; }
      guardando = true;
      botonGuardar.disabled = true;
      try {
        await guardarMovimiento(m);
        cerrar();
        vibrar();
        aviso(`${flujo.aviso}: ${monto(m.monto)}`, `exito ${flujo.clase}`);
      } catch {
        guardando = false;
        botonGuardar.disabled = false;
        error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
      }
    }

    return [
      h('h3', {}, 'Revisa y guarda'),
      h(
        'div',
        { class: 'resumen-registro' },
        h('div', { class: `monto-grande ${flujo.clase}` }, formatoSoles(aCentimos(b.montoTexto))),
        h('dl', {}, filas.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
      ),
      campo('Descripción (opcional)', h('input', {
        type: 'text', maxlength: 80, value: b.descripcion, placeholder: 'Ej. Almuerzo con amigas',
        enterkeyhint: 'done', oninput: (e) => { b.descripcion = e.target.value; },
      })),
      h(
        'div',
        { class: 'fila-campos' },
        campo('Fecha', h('input', {
          type: 'date', value: b.fecha, max: fechaHoy(), oninput: (e) => { b.fecha = e.target.value; },
        })),
        campo('Hora', h('input', {
          type: 'time', value: b.hora, oninput: (e) => { b.hora = e.target.value; },
        })),
      ),
      error,
      botonGuardar,
    ];
  }

  function contenidoPaso() {
    switch (paso()) {
      case 'monto': return pasoMonto();
      case 'categoria': return pasoCategoria();
      case 'cuenta': return listaCuentas(flujo.preguntaCuenta, 'cuentaId');
      case 'origen': return listaCuentas('¿De qué cuenta sale?', 'cuentaId');
      case 'destino': return listaCuentas('¿A qué cuenta va?', 'cuentaDestinoId', b.cuentaId);
      default: return pasoFinal();
    }
  }

  function pintar() {
    panel.replaceChildren(
      h(
        'header',
        { class: 'hoja-cabecera' },
        indice > 0
          ? h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Atrás', onclick: () => ir(-1) }, iconos.atras(), 'Atrás')
          : h('span', { class: 'boton-icono' }),
        h('strong', {}, flujo.titulo),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Cerrar', onclick: cerrar }, iconos.cerrar()),
      ),
      h(
        'div',
        {
          class: 'progreso', role: 'progressbar', 'aria-valuemin': 1,
          'aria-valuemax': flujo.pasos.length, 'aria-valuenow': indice + 1,
        },
        flujo.pasos.map((_, i) => h('span', { class: i <= indice ? `lleno ${flujo.clase}` : '' })),
      ),
      h('div', { class: `hoja-cuerpo paso-${hacia}` }, contenidoPaso()),
    );
  }

  pintar();
}
