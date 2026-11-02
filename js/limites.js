// Límites de gasto por categoría: ajustes, aviso al pasarse y barras del Resumen.
import {
  estadoLimites, limitesPasadosPor, PERIODOS, PERIODOS_FRASE,
} from './calculos.js';
import { E, guardarLimites, limites, nuevoId } from './datos.js';
import { aCentimos, aTexto, formatoSoles } from './dinero.js';
import { fechaHoy } from './fechas.js';
import {
  abrirCapa, aviso, campo, campoMonto, confirmar, cuadroIcono, h, icono, informar, monto,
  opcionesSelect, seccion, vibrar,
} from './ui.js';

const categoriaDe = (id) => E.categorias.find((c) => c.id === id);

// --- Aviso al guardar un gasto ---

export async function revisarLimites(movimiento) {
  const pasados = limitesPasadosPor(movimiento, limites(), E.movimientos);
  if (pasados.length === 0) return;
  vibrar();
  for (const { limite, gastado, exceso } of pasados) {
    const nombre = categoriaDe(limite.categoriaId)?.nombre ?? 'esta categoría';
    // Se muestran los montos aunque estén ocultos: es la respuesta a lo que ella acaba de registrar.
    await informar(`Te pasaste del límite de ${nombre}`, [
      `Llevas ${formatoSoles(gastado)} en ${nombre} ${PERIODOS_FRASE[limite.periodo]}.`,
      `Tu límite es ${formatoSoles(limite.monto)}: te pasaste por ${formatoSoles(exceso)}.`,
    ]);
  }
}

// --- Barras en el Resumen ---

function filaEstado({ limite, gastado, excedido, exceso, porcentaje }) {
  const categoria = categoriaDe(limite.categoriaId);
  return h(
    'li',
    { class: `limite ${excedido ? 'excedido' : ''}` },
    h(
      'div',
      { class: 'limite-fila' },
      cuadroIcono(categoria?.icono ?? 'puntos', categoria?.color, 34),
      h(
        'div',
        { class: 'limite-texto' },
        h('strong', {}, categoria?.nombre ?? 'Categoría eliminada'),
        h('small', { class: 'cifra' }, `${monto(gastado)} de ${monto(limite.monto)} · ${PERIODOS_FRASE[limite.periodo]}`),
      ),
      excedido && h('span', { class: 'pildora-limite' }, 'Te pasaste'),
    ),
    h(
      'div',
      {
        class: 'pista', role: 'img',
        'aria-label': E.ajustes.ocultarMontos ? `Límite de ${categoria?.nombre}` : `${Math.round(porcentaje)} % del límite`,
      },
      h('div', { class: 'relleno', style: `width:${Math.min(100, porcentaje)}%` }),
    ),
    excedido && h('small', { class: 'limite-exceso cifra' }, `Te pasaste por ${monto(exceso)}`),
  );
}

export function bloqueLimitesResumen() {
  const lista = limites().filter((l) => categoriaDe(l.categoriaId));
  if (lista.length === 0) return null;
  const estados = estadoLimites(lista, E.movimientos, fechaHoy());
  return seccion('Mis límites', h('ul', { class: 'tarjeta limites' }, estados.map(filaEstado)));
}

// --- Ajustes ---

function abrirFormularioLimite(limite) {
  const nuevo = !limite;
  const b = {
    categoriaId: limite?.categoriaId ?? '',
    montoTexto: limite ? aTexto(limite.monto) : '',
    periodo: limite?.periodo ?? 'MES',
  };
  const { panel, cerrar } = abrirCapa({ etiqueta: nuevo ? 'Agregar límite' : 'Editar límite' });

  async function guardar(error) {
    const montoLimite = aCentimos(b.montoTexto);
    if (!b.categoriaId) { error.textContent = 'Elige una categoría.'; return; }
    if (!montoLimite) { error.textContent = 'Escribe un límite mayor a cero.'; return; }
    const repetido = limites().some((l) => l.id !== limite?.id && l.categoriaId === b.categoriaId && l.periodo === b.periodo);
    if (repetido) { error.textContent = 'Esa categoría ya tiene un límite para ese periodo.'; return; }
    const registro = { id: limite?.id ?? nuevoId(), categoriaId: b.categoriaId, monto: montoLimite, periodo: b.periodo };
    try {
      await guardarLimites(nuevo ? [...limites(), registro] : limites().map((l) => (l.id === registro.id ? registro : l)));
      cerrar();
      aviso(nuevo ? 'Límite agregado' : 'Límite actualizado', 'exito');
    } catch {
      error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
    }
  }

  async function eliminar() {
    const nombre = categoriaDe(limite.categoriaId)?.nombre ?? 'esta categoría';
    if (!await confirmar(`¿Eliminar el límite de ${nombre}?`, 'Tus gastos no se borran.', 'Eliminar', 'peligro')) return;
    await guardarLimites(limites().filter((l) => l.id !== limite.id));
    cerrar();
    aviso('Límite eliminado', 'exito');
  }

  function pintar() {
    const categorias = E.categorias
      .filter((c) => c.tipo === 'GASTO' && (!c.archivada || c.id === b.categoriaId))
      .map((c) => ({ valor: c.id, texto: c.archivada ? `${c.nombre} (archivada)` : c.nombre }));
    const error = h('p', { class: 'error', role: 'alert' });
    panel.replaceChildren(
      h(
        'header',
        { class: 'hoja-cabecera' },
        h('span', { class: 'boton-icono' }),
        h('strong', {}, nuevo ? 'Agregar límite' : 'Editar límite'),
        h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Cerrar', onclick: cerrar }, icono('cerrar')),
      ),
      h(
        'div',
        { class: 'hoja-cuerpo' },
        h('p', { class: 'nota' }, 'Te avisaremos cuando el gasto de esta categoría pase el límite.'),
        campo('Categoría', h('select', {
          onchange: (e) => { b.categoriaId = e.target.value; },
        }, opcionesSelect(categorias, b.categoriaId, 'Elige una categoría'))),
        campo('Límite (S/)', campoMonto({ value: b.montoTexto, oninput: (e) => { b.montoTexto = e.target.value; } })),
        h('span', { class: 'campo-titulo' }, 'Periodo'),
        h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Periodo' }, Object.entries(PERIODOS).map(([valor, texto]) => h('button', {
          type: 'button',
          class: b.periodo === valor ? 'activo' : '',
          'aria-pressed': String(b.periodo === valor),
          onclick: () => { b.periodo = valor; pintar(); },
        }, texto.replace('Por ', '')))),
        error,
        h('button', { type: 'button', class: 'boton primario', onclick: () => guardar(error) }, 'Guardar'),
        h('button', { type: 'button', class: 'boton suave', onclick: cerrar }, 'Cancelar'),
        !nuevo && h('button', { type: 'button', class: 'boton peligro-suave', onclick: eliminar }, 'Eliminar límite'),
      ),
    );
  }

  pintar();
}

export function seccionLimitesAjustes() {
  const lista = limites();
  return seccion('Límites de gasto', h(
    'div',
    { class: 'tarjeta' },
    lista.length === 0
      ? h('p', { class: 'nota' }, 'Pon un tope a una categoría, por ejemplo S/ 10.00 al mes en Dulces, y te avisaremos si te pasas.')
      : h('ul', { class: 'lista-ajustes' }, lista.map((l) => {
        const categoria = categoriaDe(l.categoriaId);
        return h('li', {}, h(
          'button',
          { type: 'button', class: 'fila-ajuste', onclick: () => abrirFormularioLimite(l) },
          cuadroIcono(categoria?.icono ?? 'puntos', categoria?.color),
          h(
            'span',
            { class: 'fila-texto' },
            h('strong', {}, categoria?.nombre ?? 'Categoría eliminada'),
            h('small', {}, `${PERIODOS[l.periodo]} · `, h('span', { class: 'cifra' }, monto(l.monto))),
          ),
        ));
      })),
    h('button', { type: 'button', class: 'boton suave', onclick: () => abrirFormularioLimite(null) }, '+ Agregar límite'),
  ));
}
