// Pantalla Ajustes: cuentas, categorías, copia de seguridad y Excel.
import { esTarjeta, movimientosDeCuenta, saldosPorCuenta } from './calculos.js';
import {
  archivarCuenta, E, eliminarCategoria, eliminarCuenta, fijarArchivoCategoria, guardarCategoria, guardarCuenta,
  mover, nuevoId, ordenNuevaCategoria, ordenNuevaCuenta, restaurarCuenta,
} from './datos.js';
import { aCentimos, aTexto, formatoSoles } from './dinero.js';
import { cargarXlsx, exportarExcel, hacerCopia, restaurarDesdeArchivo } from './respaldo.js';
import {
  abrirCapa, aviso, campo, campoMonto, confirmar, h, iconos, informar, monto, preguntar, tarjeta,
} from './ui.js';

const TIPOS_CUENTA = [['BANCO', 'Banco'], ['EFECTIVO', 'Efectivo'], ['TARJETA_CREDITO', 'Tarjeta']];
const EMOJIS = ['🍽️', '🛒', '☕', '🚌', '🚕', '⛽', '🎉', '🎬', '👗', '💄', '💊', '🏥', '🏠', '💡', '📱', '🎁', '✈️', '🐶', '📚', '💳', '💼', '💰', '➕', '❓'];
const NOMBRES_TIPO = { BANCO: 'Banco', EFECTIVO: 'Efectivo', TARJETA_CREDITO: 'Tarjeta de crédito' };

let tipoCategoria = 'GASTO';

const cabeceraHoja = (titulo, cerrar) => h(
  'header',
  { class: 'hoja-cabecera' },
  h('span', { class: 'boton-icono' }),
  h('strong', {}, titulo),
  h('button', { type: 'button', class: 'boton-icono', 'aria-label': 'Cerrar', onclick: cerrar }, iconos.cerrar()),
);

const flechas = (nombre, lista, almacen, indice, id) => h(
  'div',
  { class: 'flechas' },
  h('button', {
    type: 'button', class: 'boton-icono', 'aria-label': `Subir ${nombre}`,
    disabled: indice === 0, onclick: () => mover(almacen, lista, id, -1),
  }, iconos.subir()),
  h('button', {
    type: 'button', class: 'boton-icono', 'aria-label': `Bajar ${nombre}`,
    disabled: indice === lista.length - 1, onclick: () => mover(almacen, lista, id, 1),
  }, iconos.bajar()),
);

// --- Cuentas ---

function abrirFormularioCuenta(cuenta) {
  const nueva = !cuenta;
  const b = {
    nombre: cuenta?.nombre ?? '',
    tipo: cuenta?.tipo ?? 'BANCO',
    saldoTexto: cuenta ? aTexto(cuenta.saldoInicial) : '',
    lineaTexto: cuenta?.lineaCredito ? aTexto(cuenta.lineaCredito) : '',
    noSumar: cuenta?.noSumarAlDisponible ?? false,
  };
  const { panel, cerrar } = abrirCapa({ etiqueta: nueva ? 'Agregar cuenta' : 'Editar cuenta' });

  async function guardar(error) {
    const nombre = b.nombre.trim();
    const saldoInicial = b.saldoTexto.trim() === '' ? 0 : aCentimos(b.saldoTexto);
    const tarjetaElegida = b.tipo === 'TARJETA_CREDITO';
    const lineaCredito = !tarjetaElegida || b.lineaTexto.trim() === '' ? 0 : aCentimos(b.lineaTexto);
    if (!nombre) { error.textContent = 'Escribe el nombre de la cuenta.'; return; }
    if (saldoInicial === null) { error.textContent = 'Revisa el saldo inicial.'; return; }
    if (lineaCredito === null) { error.textContent = 'Revisa la línea de crédito.'; return; }
    try {
      await guardarCuenta({
        ...(cuenta ?? { id: nuevoId(), orden: ordenNuevaCuenta(), archivada: false, archivadaEn: '' }),
        nombre,
        tipo: b.tipo,
        saldoInicial,
        lineaCredito,
        noSumarAlDisponible: !tarjetaElegida && b.noSumar,
      });
      cerrar();
      aviso(nueva ? 'Cuenta agregada' : 'Cuenta actualizada', 'exito');
    } catch {
      error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
    }
  }

  async function eliminar() {
    const movimientos = movimientosDeCuenta(E.movimientos, cuenta.id);
    if (movimientos.length === 0) {
      if (!await confirmar(`¿Eliminar ${cuenta.nombre}?`, 'Esta cuenta no tiene movimientos.', 'Eliminar', 'peligro')) return;
      await eliminarCuenta(cuenta.id);
      cerrar();
      aviso('Cuenta eliminada', 'exito');
      return;
    }
    const n = movimientos.length;
    const eleccion = await preguntar({
      titulo: `${cuenta.nombre} tiene ${n} ${n === 1 ? 'movimiento' : 'movimientos'}`,
      mensaje: 'Archivar la oculta, pero conserva sus movimientos en el historial y los gráficos.',
      acciones: [
        { texto: 'Archivar (recomendado)', valor: 'archivar', estilo: 'primario' },
        { texto: 'Eliminar todo', valor: 'eliminar', estilo: 'peligro-suave' },
        { texto: 'Cancelar', valor: null },
      ],
    });
    if (eleccion === 'archivar') {
      await archivarCuenta(cuenta);
      cerrar();
      aviso('Cuenta archivada', 'exito');
    } else if (eleccion === 'eliminar') {
      const total = movimientos.reduce((suma, m) => suma + m.monto, 0);
      const transferencias = movimientos.filter((m) => m.tipo === 'TRANSFERENCIA').length;
      const seguro = await confirmar(
        '¿Eliminar todo?',
        [
          `Se borrarán ${n} ${n === 1 ? 'movimiento' : 'movimientos'} por ${formatoSoles(total)} en total, junto con la cuenta.`,
          transferencias > 0 && `Incluye ${transferencias} ${transferencias === 1 ? 'transferencia' : 'transferencias'} con otras cuentas: sus saldos también cambiarán.`,
          'Esto no se puede deshacer.',
        ],
        'Sí, eliminar todo',
        'peligro',
      );
      if (!seguro) return;
      await eliminarCuenta(cuenta.id);
      cerrar();
      aviso('Cuenta y movimientos eliminados', 'exito');
    }
  }

  function pintar() {
    const esTarjetaElegida = b.tipo === 'TARJETA_CREDITO';
    const error = h('p', { class: 'error', role: 'alert' });
    panel.replaceChildren(
      cabeceraHoja(nueva ? 'Agregar cuenta' : 'Editar cuenta', cerrar),
      h(
        'div',
        { class: 'hoja-cuerpo' },
        campo('Nombre', h('input', { type: 'text', maxlength: 40, value: b.nombre, oninput: (e) => { b.nombre = e.target.value; } })),
        h('span', { class: 'campo-titulo' }, 'Tipo'),
        h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tipo' }, TIPOS_CUENTA.map(([valor, texto]) => h('button', {
          type: 'button',
          class: b.tipo === valor ? 'activo' : '',
          'aria-pressed': String(b.tipo === valor),
          onclick: () => { b.tipo = valor; pintar(); },
        }, texto))),
        esTarjetaElegida && campo('Línea de crédito total (S/)', campoMonto({
          value: b.lineaTexto, oninput: (e) => { b.lineaTexto = e.target.value; },
        })),
        campo(esTarjetaElegida ? 'Línea disponible inicial (S/)' : 'Saldo inicial (S/)', campoMonto({
          value: b.saldoTexto, oninput: (e) => { b.saldoTexto = e.target.value; },
        })),
        !esTarjetaElegida && h(
          'label',
          { class: 'interruptor' },
          h('span', {}, 'No sumar al disponible', h('small', {}, 'Para dinero que no puedes usar libremente, como la CTS.')),
          h('input', { type: 'checkbox', checked: b.noSumar, onchange: (e) => { b.noSumar = e.target.checked; } }),
        ),
        error,
        h('button', { type: 'button', class: 'boton primario', onclick: () => guardar(error) }, 'Guardar'),
        h('button', { type: 'button', class: 'boton suave', onclick: cerrar }, 'Cancelar'),
        !nueva && h('button', { type: 'button', class: 'boton peligro-suave', onclick: eliminar }, 'Eliminar cuenta'),
      ),
    );
  }

  pintar();
}

function seccionCuentas() {
  const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
  const activas = E.cuentas.filter((c) => !c.archivada);
  const archivadas = E.cuentas.filter((c) => c.archivada);
  return tarjeta(
    'Mis cuentas',
    h('ul', { class: 'lista-ajustes' }, activas.map((c, i) => h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'fila-ajuste', onclick: () => abrirFormularioCuenta(c) },
        h('span', {}, h('strong', {}, c.nombre), h('small', {}, NOMBRES_TIPO[c.tipo], c.noSumarAlDisponible && ' · No suma')),
        h('span', { class: 'cifra' }, monto(saldos.get(c.id))),
      ),
      flechas(c.nombre, activas, 'cuentas', i, c.id),
    ))),
    h('button', { type: 'button', class: 'boton suave', onclick: () => abrirFormularioCuenta(null) }, '+ Agregar cuenta'),
    archivadas.length > 0 && [
      h('h3', {}, 'Archivadas'),
      h('ul', { class: 'lista-ajustes' }, archivadas.map((c) => h(
        'li',
        {},
        h('span', { class: 'fila-ajuste' }, h('span', {}, h('strong', {}, c.nombre), h('small', {}, NOMBRES_TIPO[c.tipo]))),
        h('button', { type: 'button', class: 'boton-chico', onclick: () => restaurarCuenta(c).then(() => aviso('Cuenta restaurada', 'exito')) }, 'Restaurar'),
      ))),
    ],
  );
}

// --- Categorías ---

const primerGrafema = (texto) => {
  const limpio = texto.trim();
  return limpio ? [...new Intl.Segmenter('es').segment(limpio)][0].segment : '';
};

function abrirFormularioCategoria(categoria, tipo) {
  const nueva = !categoria;
  const b = { nombre: categoria?.nombre ?? '', emoji: categoria?.emoji ?? '' };
  const { panel, cerrar } = abrirCapa({ etiqueta: nueva ? 'Agregar categoría' : 'Editar categoría' });

  async function guardar(error) {
    const nombre = b.nombre.trim();
    const emoji = primerGrafema(b.emoji);
    if (!nombre) { error.textContent = 'Escribe el nombre de la categoría.'; return; }
    if (!emoji) { error.textContent = 'Elige un emoji.'; return; }
    try {
      await guardarCategoria({
        ...(categoria ?? { id: nuevoId(), tipo, orden: ordenNuevaCategoria(), archivada: false }),
        nombre,
        emoji,
      });
      cerrar();
      aviso(nueva ? 'Categoría agregada' : 'Categoría actualizada', 'exito');
    } catch {
      error.textContent = 'No se pudo guardar. Inténtalo otra vez.';
    }
  }

  async function pasarAOtra(usadas) {
    const otras = E.categorias.filter((c) => c.tipo === categoria.tipo && !c.archivada && c.id !== categoria.id);
    if (otras.length === 0) {
      await informar('No hay otra categoría', `Crea otra categoría de ${categoria.tipo === 'GASTO' ? 'gasto' : 'ingreso'} primero, o archiva esta.`);
      return;
    }
    const destino = await preguntar({
      titulo: `¿A qué categoría pasan los ${usadas}?`,
      mensaje: `Luego se eliminará ${categoria.nombre}.`,
      acciones: [
        ...otras.map((c) => ({ texto: `${c.emoji} ${c.nombre}`, valor: c.id })),
        { texto: 'Cancelar', valor: null },
      ],
    });
    if (!destino) return;
    await eliminarCategoria(categoria.id, destino);
    cerrar();
    aviso('Movimientos pasados y categoría eliminada', 'exito');
  }

  async function eliminar() {
    const usos = E.movimientos.filter((m) => m.categoriaId === categoria.id).length;
    if (usos === 0) {
      if (!await confirmar(`¿Eliminar ${categoria.nombre}?`, 'Esta categoría no tiene movimientos.', 'Eliminar', 'peligro')) return;
      await eliminarCategoria(categoria.id);
      cerrar();
      aviso('Categoría eliminada', 'exito');
      return;
    }
    const texto = `${usos} ${usos === 1 ? 'movimiento' : 'movimientos'}`;
    const eleccion = await preguntar({
      titulo: `${categoria.nombre} tiene ${texto}`,
      mensaje: 'No se puede eliminar directamente. Puedes archivarla o pasar sus movimientos a otra categoría.',
      acciones: [
        { texto: 'Archivar', valor: 'archivar', estilo: 'primario' },
        { texto: 'Pasar a otra categoría', valor: 'pasar' },
        { texto: 'Cancelar', valor: null },
      ],
    });
    if (eleccion === 'archivar') {
      await fijarArchivoCategoria(categoria, true);
      cerrar();
      aviso('Categoría archivada', 'exito');
    } else if (eleccion === 'pasar') {
      await pasarAOtra(texto);
    }
  }

  const error = h('p', { class: 'error', role: 'alert' });
  const entradaEmoji = h('input', {
    type: 'text', value: b.emoji, class: 'entrada-emoji', 'aria-label': 'Emoji',
    oninput: (e) => { b.emoji = e.target.value; },
  });
  panel.replaceChildren(
    cabeceraHoja(nueva ? 'Agregar categoría' : 'Editar categoría', cerrar),
    h(
      'div',
      { class: 'hoja-cuerpo' },
      campo('Nombre', h('input', { type: 'text', maxlength: 30, value: b.nombre, oninput: (e) => { b.nombre = e.target.value; } })),
      campo('Emoji', entradaEmoji),
      h('div', { class: 'rejilla-emojis' }, EMOJIS.map((emoji) => h('button', {
        type: 'button',
        class: 'tecla-emoji',
        onclick: () => { b.emoji = emoji; entradaEmoji.value = emoji; },
      }, emoji))),
      error,
      h('button', { type: 'button', class: 'boton primario', onclick: () => guardar(error) }, 'Guardar'),
      h('button', { type: 'button', class: 'boton suave', onclick: cerrar }, 'Cancelar'),
      !nueva && h('button', { type: 'button', class: 'boton peligro-suave', onclick: eliminar }, 'Eliminar categoría'),
    ),
  );
}

function seccionCategorias(repintar) {
  const delTipo = E.categorias.filter((c) => c.tipo === tipoCategoria);
  const activas = delTipo.filter((c) => !c.archivada);
  const archivadas = delTipo.filter((c) => c.archivada);
  return tarjeta(
    'Categorías',
    h('div', { class: 'segmentos', role: 'group', 'aria-label': 'Tipo de categoría' }, [['GASTO', 'Gasto'], ['INGRESO', 'Ingreso']].map(([valor, texto]) => h('button', {
      type: 'button',
      class: tipoCategoria === valor ? 'activo' : '',
      'aria-pressed': String(tipoCategoria === valor),
      onclick: () => { tipoCategoria = valor; repintar(); },
    }, texto))),
    h('ul', { class: 'lista-ajustes' }, activas.map((c, i) => h(
      'li',
      {},
      h(
        'button',
        { type: 'button', class: 'fila-ajuste', onclick: () => abrirFormularioCategoria(c, c.tipo) },
        h('span', {}, h('strong', {}, `${c.emoji} ${c.nombre}`)),
      ),
      flechas(c.nombre, activas, 'categorias', i, c.id),
    ))),
    h('button', { type: 'button', class: 'boton suave', onclick: () => abrirFormularioCategoria(null, tipoCategoria) }, '+ Agregar categoría'),
    archivadas.length > 0 && [
      h('h3', {}, 'Archivadas'),
      h('ul', { class: 'lista-ajustes' }, archivadas.map((c) => h(
        'li',
        {},
        h('span', { class: 'fila-ajuste' }, h('span', {}, h('strong', {}, `${c.emoji} ${c.nombre}`))),
        h('button', { type: 'button', class: 'boton-chico', onclick: () => fijarArchivoCategoria(c, false).then(() => aviso('Categoría restaurada', 'exito')) }, 'Restaurar'),
      ))),
    ],
  );
}

// --- Copia de seguridad y Excel ---

// El botón de restaurar es una etiqueta sobre un input de archivo: así iOS abre Archivos.
export const botonRestaurar = (texto, clase, alTerminar) => h(
  'label',
  { class: clase },
  texto,
  h('input', {
    type: 'file',
    accept: '.json,application/json',
    class: 'oculto',
    onchange: async (e) => {
      const archivo = e.target.files[0];
      e.target.value = '';
      if (archivo && await restaurarDesdeArchivo(archivo)) alTerminar?.();
    },
  }),
);

function seccionRespaldo() {
  const ultima = E.ajustes.ultimaCopia;
  return tarjeta(
    'Copia de seguridad',
    h('p', { class: 'nota' }, ultima
      ? `Última copia: ${new Date(ultima).toLocaleDateString('es-PE')}`
      : 'Aún no has hecho ninguna copia.'),
    h('button', { type: 'button', class: 'boton primario', onclick: hacerCopia }, 'Hacer copia de seguridad'),
    botonRestaurar('Restaurar una copia', 'boton suave'),
  );
}

function seccionExcel() {
  return tarjeta(
    'Exportar a Excel',
    h('p', { class: 'nota' }, 'Crea un archivo con las hojas Movimientos y Saldos para guardarlo o enviarlo.'),
    h('button', { type: 'button', class: 'boton suave', onclick: exportarExcel }, 'Exportar a Excel'),
  );
}

export function pantallaAjustes(repintar) {
  cargarXlsx().catch(() => {});
  return [seccionCuentas(), seccionCategorias(repintar), seccionRespaldo(), seccionExcel()];
}
