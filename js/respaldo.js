// Copia de seguridad (.json) y exportación a Excel (.xlsx).
import { aFavorTarjeta, deudaTarjeta, esTarjeta, saldosPorCuenta, totalDisponible, validarCopia } from './calculos.js';
import { armarCopia, E, ponerAjuste, restaurarCopia } from './datos.js';
import { fechaHoy, serieExcel } from './fechas.js';
import { aviso, confirmar, informar, preguntar } from './ui.js';

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function descargar(archivo) {
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.name;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// Devuelve true si el archivo salió del teléfono; false si la usuaria canceló.
async function compartir(archivo) {
  if (!navigator.canShare?.({ files: [archivo] })) {
    descargar(archivo);
    return true;
  }
  try {
    await navigator.share({ files: [archivo], title: archivo.name });
    return true;
  } catch (error) {
    if (error.name === 'AbortError') return false;
    if (error.name !== 'NotAllowedError') throw error;
  }
  // Safari exige un toque reciente: se pide uno nuevo para compartir.
  const seguir = await preguntar({
    titulo: 'Tu archivo está listo',
    mensaje: archivo.name,
    acciones: [{ texto: 'Compartir', valor: true, estilo: 'primario' }, { texto: 'Cancelar', valor: false }],
  });
  return seguir ? compartir(archivo) : false;
}

export async function hacerCopia() {
  const texto = JSON.stringify(armarCopia(), null, 2);
  const archivo = new File([texto], `mis-cuentas-copia-${fechaHoy()}.json`, { type: 'application/json' });
  try {
    if (!await compartir(archivo)) return;
    await ponerAjuste('ultimaCopia', new Date().toISOString());
    aviso('Copia de seguridad lista', 'exito');
  } catch {
    aviso('No se pudo crear la copia', 'fallo');
  }
}

// Lee el archivo elegido, lo revisa y pide confirmación antes de reemplazar los datos.
export async function restaurarDesdeArchivo(archivo) {
  let copia = null;
  try {
    copia = JSON.parse(await archivo.text());
  } catch {
    copia = null;
  }
  const problema = validarCopia(copia);
  if (problema) {
    await informar('No se pudo leer el archivo', problema);
    return false;
  }
  const fecha = copia.exportadoEn ? new Date(copia.exportadoEn).toLocaleDateString('es-PE') : 'sin fecha';
  const seguir = await confirmar(
    '¿Restaurar esta copia?',
    [
      `Copia del ${fecha}: ${copia.cuentas.length} cuentas y ${copia.movimientos.length} movimientos.`,
      'Reemplazará todos los datos actuales de la app. Esto no se puede deshacer.',
    ],
    'Reemplazar mis datos',
    'peligro',
  );
  if (!seguir) return false;
  try {
    await restaurarCopia(copia);
    aviso('Copia restaurada', 'exito');
    return true;
  } catch {
    await informar('No se pudo restaurar', 'Tus datos anteriores siguen intactos.');
    return false;
  }
}

let cargaXlsx = null;

// SheetJS pesa bastante: se carga cuando se abre Ajustes, no en cada arranque.
export function cargarXlsx() {
  cargaXlsx ??= new Promise((resolver, rechazar) => {
    const script = document.createElement('script');
    script.src = 'vendor/xlsx.mini.min.js';
    script.onload = () => resolver(window.XLSX);
    script.onerror = () => {
      cargaXlsx = null;
      rechazar(new Error('No se pudo cargar SheetJS'));
    };
    document.head.append(script);
  });
  return cargaXlsx;
}

const TIPOS_MOV = { GASTO: 'Gasto', INGRESO: 'Ingreso', TRANSFERENCIA: 'Transferencia' };
const TIPOS_CTA = { BANCO: 'Banco', EFECTIVO: 'Efectivo', TARJETA_CREDITO: 'Tarjeta de crédito' };
const FORMATO_SOLES = '#,##0.00';

const celdaFecha = (iso) => ({ t: 'n', v: serieExcel(iso), z: 'dd/mm/yyyy' });
const celdaSoles = (centimos) => ({ t: 'n', v: centimos / 100, z: FORMATO_SOLES });

function hojaMovimientos(XLSX) {
  const cuenta = (id) => E.cuentas.find((c) => c.id === id)?.nombre ?? '';
  const categoria = (id) => E.categorias.find((c) => c.id === id)?.nombre ?? '';
  const filas = E.movimientos.map((m) => [
    celdaFecha(m.fecha), m.hora, TIPOS_MOV[m.tipo], celdaSoles(m.monto), categoria(m.categoriaId),
    cuenta(m.cuentaId), cuenta(m.cuentaDestinoId), m.descripcion,
  ]);
  const hoja = XLSX.utils.aoa_to_sheet([
    ['Fecha', 'Hora', 'Tipo', 'Monto (S/)', 'Categoría', 'Cuenta', 'Cuenta destino', 'Descripción'],
    ...filas,
  ]);
  hoja['!cols'] = [12, 7, 14, 12, 16, 22, 22, 36].map((wch) => ({ wch }));
  return hoja;
}

function hojaSaldos(XLSX) {
  const saldos = saldosPorCuenta(E.cuentas, E.movimientos);
  const filas = E.cuentas.map((c) => {
    const saldo = saldos.get(c.id);
    const tarjeta = esTarjeta(c);
    const suma = !tarjeta && !c.noSumarAlDisponible;
    return [
      c.nombre, TIPOS_CTA[c.tipo], c.archivada ? 'Archivada' : 'Activa', celdaSoles(saldo),
      tarjeta ? celdaSoles(c.lineaCredito) : '',
      tarjeta ? celdaSoles(deudaTarjeta(c, saldo) || -aFavorTarjeta(c, saldo)) : '',
      suma ? 'Sí' : 'No',
    ];
  });
  const hoja = XLSX.utils.aoa_to_sheet([
    ['Cuenta', 'Tipo', 'Estado', 'Saldo (S/)', 'Línea de crédito (S/)', 'Deuda (S/)', 'Suma al disponible'],
    ...filas,
    [],
    ['Total disponible', '', '', celdaSoles(totalDisponible(E.cuentas, saldos))],
  ]);
  hoja['!cols'] = [24, 18, 10, 14, 20, 12, 18].map((wch) => ({ wch }));
  return hoja;
}

export async function exportarExcel() {
  try {
    const XLSX = await cargarXlsx();
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaMovimientos(XLSX), 'Movimientos');
    XLSX.utils.book_append_sheet(libro, hojaSaldos(XLSX), 'Saldos');
    const datos = XLSX.write(libro, { type: 'array', bookType: 'xlsx' });
    const archivo = new File([datos], `mis-cuentas-${fechaHoy()}.xlsx`, { type: TIPO_XLSX });
    if (await compartir(archivo)) aviso('Excel listo', 'exito');
  } catch {
    aviso('No se pudo crear el Excel', 'fallo');
  }
}
