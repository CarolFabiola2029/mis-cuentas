// Pantalla "Editar movimiento".
import { normalizarMovimiento, validarMovimiento } from './calculos.js';
import { E, eliminarMovimiento, guardarMovimiento } from './datos.js';
import { aCentimos, aTexto } from './dinero.js';
import { fechaHoy } from './fechas.js';
import { revisarLimites } from './limites.js';
import {
  abrirCapa, aviso, campo, campoMonto, confirmar, h, icono, opcionesSelect, vibrar,
} from './ui.js';

const TIPOS = [['GASTO', 'Gasto'], ['INGRESO', 'Ingreso'], ['TRANSFERENCIA', 'Transferencia']];

const opcionCuenta = (c) => ({ valor: c.id, texto: c.archivada ? `${c.nombre} (archivada)` : c.nombre });

export function abrirEdicion(original) {
  const b = { ...original, montoTexto: aTexto(original.monto) };
  const { panel, cerrar } = abrirCapa({ etiqueta: 'Editar movimiento' });
  let guardando = false;

  // Las cuentas y categorías archivadas solo se ofrecen si el movimiento ya las usa.
  const cuentasPara = (actual) => E.cuentas.filter((c) => !c.archivada || c.id === actual).map(opcionCuenta);
  const categoriasPara = (tipo, actual) => E.categorias
    .filter((c) => c.tipo === tipo && (!c.archivada || c.id === actual))
    .map((c) => ({ valor: c.id, texto: c.nombre }));

  function cambiarTipo(tipo) {
    if (tipo === b.tipo) return;
    b.tipo = tipo;
    b.categoriaId = '';
    if (tipo !== 'TRANSFERENCIA') b.cuentaDestinoId = '';
    pintar();
  }

  async function guardar(botonGuardar, error) {
    if (guardando) return;
    const { montoTexto, ...datos } = b;
    const m = normalizarMovimiento({ ...datos, monto: aCentimos(montoTexto) ?? 0, editadoEn: new Date().toISOString() });
    const problema = validarMovimiento(m, fechaHoy());
    if (problema) { error.textContent = problema; return; }
    guardando = true;
    botonGuardar.disabled = true;
    try {
      await guardarMovimiento(m);
      cerrar();
      vibrar();
      aviso('Movimiento actualizado', 'exito');
      revisarLimites(m);
    } catch {
      guardando = false;
      botonGuardar.disabled = false;
      error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
    }
  }

  async function eliminar() {
    if (!await confirmar('¿Eliminar este movimiento?', 'Los saldos se recalcularán. Esto no se puede deshacer.', 'Eliminar', 'peligro')) return;
    await eliminarMovimiento(original.id);
    cerrar();
    aviso('Movimiento eliminado', 'exito');
  }

  function pintar() {
    const transferencia = b.tipo === 'TRANSFERENCIA';
    const error = h('p', { class: 'error', role: 'alert' });
    const botonGuardar = h('button', {
      type: 'button', class: 'boton primario', onclick: () => guardar(botonGuardar, error),
    }, 'Guardar cambios');

    panel.replaceChildren(
      h(
        'header',
        { class: 'hoja-cabecera' },
        h('span', { class: 'boton-icono' }),
        h('strong', {}, 'Editar movimiento'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar')),
      ),
      h(
        'div',
        { class: 'hoja-cuerpo' },
        h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tipo' }, TIPOS.map(([valor, texto]) => h('button', {
          type: 'button',
          class: b.tipo === valor ? 'activo' : '',
          'aria-pressed': String(b.tipo === valor),
          onclick: () => cambiarTipo(valor),
        }, texto))),
        campo('Monto (S/)', campoMonto({ value: b.montoTexto, oninput: (e) => { b.montoTexto = e.target.value; } })),
        !transferencia && campo('Categoría', h('select', {
          onchange: (e) => { b.categoriaId = e.target.value; },
        }, opcionesSelect(categoriasPara(b.tipo, b.categoriaId), b.categoriaId, 'Elige una categoría'))),
        campo(
          { GASTO: 'Pagado con', INGRESO: 'Entró a', TRANSFERENCIA: 'Cuenta de origen' }[b.tipo],
          h('select', { onchange: (e) => { b.cuentaId = e.target.value; } }, opcionesSelect(cuentasPara(b.cuentaId), b.cuentaId, 'Elige una cuenta')),
        ),
        transferencia && campo('Cuenta de destino', h('select', {
          onchange: (e) => { b.cuentaDestinoId = e.target.value; },
        }, opcionesSelect(cuentasPara(b.cuentaDestinoId), b.cuentaDestinoId, 'Elige una cuenta'))),
        campo('Descripción (opcional)', h('input', {
          type: 'text', maxlength: 80, value: b.descripcion, oninput: (e) => { b.descripcion = e.target.value; },
        })),
        h(
          'div',
          { class: 'fila-campos' },
          campo('Fecha', h('input', { type: 'date', value: b.fecha, max: fechaHoy(), oninput: (e) => { b.fecha = e.target.value; } })),
          campo('Hora', h('input', { type: 'time', value: b.hora, oninput: (e) => { b.hora = e.target.value; } })),
        ),
        error,
        botonGuardar,
        h('button', { type: 'button', class: 'boton suave', onclick: cerrar }, 'Cancelar'),
        h('button', { type: 'button', class: 'boton peligro-suave', onclick: eliminar }, 'Eliminar movimiento'),
      ),
    );
  }

  pintar();
}
