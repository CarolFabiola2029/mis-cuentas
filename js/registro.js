// Registro rápido: hoja paso a paso con teclado numérico propio.
import { esTarjeta, normalizarMovimiento, saldosPorCuenta, validarMovimiento } from './calculos.js';
import { E, guardarMovimiento, nuevoId } from './datos.js';
import { aCentimos, formatoSoles, teclear } from './dinero.js';
import { fechaHoy, horaAhora } from './fechas.js';
import {
  abrirCapa, aviso, campo, cuadroCuenta, cuadroIcono, h, icono, monto, vibrar,
} from './ui.js';

const FLUJOS = {
  GASTO: {
    etiqueta: 'Nuevo gasto', clase: 'gasto', pasos: ['monto', 'categoria', 'cuenta', 'final'],
    preguntaCategoria: '¿En qué lo gastaste?', preguntaCuenta: '¿Con qué pagaste?',
    aviso: 'Gasto guardado', etiquetaCuenta: 'Pagado con',
    pistas: ['luego eliges la categoría', 'luego eliges con qué pagaste', 'luego revisas y guardas', 'último paso'],
  },
  INGRESO: {
    etiqueta: 'Nuevo ingreso', clase: 'ingreso', pasos: ['monto', 'categoria', 'cuenta', 'final'],
    preguntaCategoria: '¿Qué ingreso es?', preguntaCuenta: '¿A qué cuenta entró?',
    aviso: 'Ingreso guardado', etiquetaCuenta: 'Entró a',
    pistas: ['luego eliges la categoría', 'luego eliges a qué cuenta entró', 'luego revisas y guardas', 'último paso'],
  },
  TRANSFERENCIA: {
    etiqueta: 'Mover dinero', clase: 'transferencia', pasos: ['monto', 'origen', 'destino', 'final'],
    aviso: 'Transferencia guardada',
    pistas: ['luego eliges de dónde sale', 'luego eliges a dónde va', 'luego revisas y guardas', 'último paso'],
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
    etiqueta: flujo.etiqueta,
    alCerrar: () => document.removeEventListener('keydown', teclaFisica),
  });

  const paso = () => flujo.pasos[indice];

  function ir(delta) {
    if (indice + delta < 0) { cerrar(); return; }
    hacia = delta > 0 ? 'adelante' : 'atras';
    indice += delta;
    pintar();
  }

  // Comodidad para probar en la laptop con el teclado de verdad.
  function teclaFisica(e) {
    if (e.key === 'Escape') { cerrar(); return; }
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

  const tarjetaMonto = () => h(
    'div',
    { class: 'tarjeta-monto' },
    h('span', {}, 'Monto'),
    h('strong', { class: 'cifra' }, formatoSoles(aCentimos(b.montoTexto))),
  );

  function pasoMonto() {
    return h(
      'div',
      { class: 'paso-monto' },
      h('h3', { class: 'titulo' }, '¿Cuánto?'),
      h('div', { class: 'monto-grande cifra' }, formatoSoles(aCentimos(b.montoTexto) ?? 0)),
      h('div', { class: 'teclado' }, TECLAS.map((t) => h('button', {
        type: 'button',
        class: 'tecla',
        'aria-label': t === 'borrar' ? 'Borrar' : t,
        onclick: () => pulsar(t),
      }, t === 'borrar' ? icono('borrar') : t))),
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
      tarjetaMonto(),
      h('h3', { class: 'titulo' }, flujo.preguntaCategoria),
      categorias.length === 0 && h('p', { class: 'vacio' }, 'No hay categorías activas. Agrega una en Ajustes.'),
      h('div', { class: `rejilla-categorias ${categorias.length % 2 ? 'impar' : ''}` }, categorias.map((c) => h(
        'button',
        {
          type: 'button',
          class: `opcion-categoria ${c.id === b.categoriaId ? 'elegida' : ''}`,
          'aria-pressed': String(c.id === b.categoriaId),
          onclick: () => { b.categoriaId = c.id; ir(1); },
        },
        cuadroIcono(c.icono, c.color, 52),
        h('span', {}, c.nombre),
      ))),
    ];
  }

  function listaCuentas(titulo, campoCuenta, excluida) {
    const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
    const cuentas = E.cuentas.filter((c) => !c.archivada);
    const disponibles = cuentas.filter((c) => c.id !== excluida);
    return [
      tarjetaMonto(),
      h('h3', { class: 'titulo' }, titulo),
      disponibles.length === 0 && h('p', { class: 'vacio' }, 'No hay otra cuenta activa. Agrega una en Ajustes.'),
      h('div', { class: 'lista-opciones' }, cuentas.map((c) => h(
        'button',
        {
          type: 'button',
          class: `opcion-cuenta ${c.id === b[campoCuenta] ? 'elegida' : ''}`,
          disabled: c.id === excluida,
          onclick: () => { b[campoCuenta] = c.id; ir(1); },
        },
        cuadroCuenta(c),
        h('span', { class: 'opcion-nombre' }, c.nombre, esTarjeta(c) && h('small', {}, 'Disponible')),
        c.id === excluida ? h('small', {}, 'Origen') : h('span', { class: 'cifra' }, monto(saldos.get(c.id))),
      ))),
    ];
  }

  const nombreCuenta = (id) => E.cuentas.find((c) => c.id === id)?.nombre ?? '';

  function pasoFinal() {
    const categoria = E.categorias.find((c) => c.id === b.categoriaId);
    const filas = tipo === 'TRANSFERENCIA'
      ? [['De', nombreCuenta(b.cuentaId)], ['A', nombreCuenta(b.cuentaDestinoId)]]
      : [['Categoría', categoria?.nombre ?? ''], [flujo.etiquetaCuenta, nombreCuenta(b.cuentaId)]];
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
      tarjetaMonto(),
      h('h3', { class: 'titulo' }, 'Revisa y guarda'),
      h('dl', { class: 'tarjeta resumen-registro' }, filas.map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)])),
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
    const total = flujo.pasos.length;
    panel.replaceChildren(
      h(
        'header',
        { class: 'hoja-cabecera' },
        h('button', {
          type: 'button',
          class: 'boton-circular',
          'aria-label': indice === 0 ? 'Cerrar' : 'Atrás',
          onclick: () => ir(-1),
        }, icono(indice === 0 ? 'cerrar' : 'atras')),
        h('span', { class: `pildora-tipo ${flujo.clase}` }, flujo.etiqueta),
        h(
          'div',
          {
            class: 'progreso', role: 'progressbar', 'aria-label': 'Paso',
            'aria-valuemin': 1, 'aria-valuemax': total, 'aria-valuenow': indice + 1,
          },
          flujo.pasos.map((_, i) => h('span', { class: i <= indice ? 'hecho' : '' })),
        ),
      ),
      h('div', { class: `hoja-cuerpo paso-${hacia}` }, contenidoPaso()),
      paso() !== 'monto' && paso() !== 'final' && h('p', { class: 'pista-paso' }, `Paso ${indice + 1} de ${total} · ${flujo.pistas[indice]}`),
    );
  }

  pintar();
}
