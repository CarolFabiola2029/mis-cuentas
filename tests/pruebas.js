// Pruebas automáticas de dinero, fechas y saldos. Se ejecutan abriendo tests/index.html.
import { aCentimos, aTexto, formatoCorto, formatoSoles, teclear } from '../js/dinero.js';
import {
  claveDiaSemana, etiquetaDia, fechaHoy, fechaSaludo, finDeMes, hora12, lunesDe, mesAnterior, serieExcel, sumarDias,
} from '../js/fechas.js';
import { fraseDelDia } from '../js/frase.js';
import { frasesPorDia, generales } from '../js/frases.js';
import { siglasCuentas } from '../js/ui.js';
import {
  agruparPorDia, deudaTarjeta, deudaTarjetas, estadoLimites, gastoPorCategoria, gastosHoySemanaMes, limitesPasadosPor,
  normalizarMovimiento, rangoPeriodo,
  ordenarMovimientos, primerMes, saldosPorCuenta, serieMes, totalDisponible, totalEnFecha,
  ultimos7Dias, validarCopia, validarMovimiento,
} from '../js/calculos.js';

const resultados = [];
function igual(nombre, obtenido, esperado) {
  const a = JSON.stringify(obtenido);
  const b = JSON.stringify(esperado);
  resultados.push({ nombre, ok: a === b, detalle: a === b ? '' : `obtuvo ${a}, esperaba ${b}` });
}

const banco = (id, saldoInicial, extra = {}) => ({
  id, nombre: id, tipo: 'BANCO', saldoInicial, lineaCredito: 0, noSumarAlDisponible: false, orden: 0, archivada: false, ...extra,
});
const tarjeta = (id, disponible, linea) => banco(id, disponible, { tipo: 'TARJETA_CREDITO', lineaCredito: linea });
let n = 0;
const mov = (tipo, monto, fecha, cuentaId, extra = {}) => ({
  id: `m${++n}`, tipo, monto, fecha, hora: '12:00', cuentaId, categoriaId: 'c', cuentaDestinoId: '',
  descripcion: '', creadoEn: `2026-01-01T00:00:0${n % 10}Z`, ...extra,
});

// --- Dinero ---
igual('formato con miles', formatoSoles(123456), 'S/ 1,234.56');
igual('formato millones', formatoSoles(123456789), 'S/ 1,234,567.89');
igual('formato céntimos', formatoSoles(5), 'S/ 0.05');
igual('formato negativo', formatoSoles(-1050), '−S/ 10.50');
igual('corto bajo 100 con decimales', formatoCorto(4550), '45.5');
igual('corto bajo 100 exacto', formatoCorto(1800), '18');
igual('corto 99.99', formatoCorto(9999), '99.99');
igual('corto 10 no pierde el cero entero', formatoCorto(1000), '10');
igual('corto desde 100 sin decimales', formatoCorto(10000), '100');
igual('corto con miles', formatoCorto(123460), '1,235');
igual('corto cero', formatoCorto(0), '0');
igual('leer entero', aCentimos('1234'), 123400);
igual('leer con punto', aCentimos('1234.5'), 123450);
igual('leer con coma decimal', aCentimos('12,5'), 1250);
igual('leer miles y decimales', aCentimos('1,234.56'), 123456);
igual('leer formato europeo', aCentimos('1.234,56'), 123456);
igual('leer miles con coma', aCentimos('1,234'), 123400);
igual('leer con S/', aCentimos('S/ 20.10'), 2010);
igual('sin error de redondeo 19.99', aCentimos('19.99'), 1999);
igual('sin error de redondeo 1.15', aCentimos('1.15'), 115);
igual('leer .5', aCentimos('.5'), 50);
igual('leer "5."', aCentimos('5.'), 500);
igual('vacío es null', aCentimos(''), null);
igual('tres decimales es null', aCentimos('12.345'), null);
igual('letras es null', aCentimos('abc'), null);
igual('solo punto es null', aCentimos('.'), null);
igual('negativo es null', aCentimos('-5'), null);
igual('exceso es null', aCentimos('99999999'), null);
igual('a texto', aTexto(123405), '1234.05');
igual('tecla primer dígito', teclear('', '5'), '5');
igual('tecla reemplaza cero', teclear('0', '5'), '5');
igual('tecla punto inicial', teclear('', '.'), '0.');
igual('tecla segundo punto', teclear('1.5', '.'), '1.5');
igual('máximo 2 decimales', teclear('1.55', '9'), '1.55');
igual('tecla borrar', teclear('12', 'borrar'), '1');
igual('máximo de cifras', teclear('9999999', '9'), '9999999');

// --- Fechas ---
igual('hoy es local, no UTC', fechaHoy(new Date(2026, 10, 1, 23, 30)), '2026-11-01');
igual('sumar cruza mes', sumarDias('2026-10-31', 1), '2026-11-01');
igual('sumar cruza año', sumarDias('2026-01-01', -1), '2025-12-31');
igual('lunes desde domingo', lunesDe('2026-11-01'), '2026-10-26');
igual('lunes desde lunes', lunesDe('2026-11-02'), '2026-11-02');
igual('lunes desde miércoles', lunesDe('2026-11-04'), '2026-11-02');
igual('fin de febrero bisiesto', finDeMes('2028-02-10'), '2028-02-29');
igual('mes anterior cruza año', mesAnterior('2026-01-15'), '2025-12-01');
igual('etiqueta hoy', etiquetaDia('2026-11-01', '2026-11-01'), 'Hoy');
igual('etiqueta ayer', etiquetaDia('2026-10-31', '2026-11-01'), 'Ayer');
igual('etiqueta fecha', etiquetaDia('2026-10-30', '2026-11-01'), 'Viernes 30 de octubre');
igual('hora de la tarde', hora12('13:05'), '1:05 p. m.');
igual('medianoche', hora12('00:10'), '12:10 a. m.');
igual('mediodía', hora12('12:00'), '12:00 p. m.');
igual('serie Excel', serieExcel('2026-11-01'), 46327);

// --- Saldos ---
{
  const cuentas = [banco('a', 10000), banco('b', 5000), tarjeta('t', 80000, 100000)];
  const movs = [
    mov('GASTO', 2500, '2026-11-01', 'a'),
    mov('INGRESO', 1000, '2026-11-01', 'b'),
    mov('TRANSFERENCIA', 3000, '2026-11-01', 'a', { cuentaDestinoId: 't', categoriaId: '' }),
    mov('GASTO', 4000, '2026-11-01', 't'),
  ];
  const s = saldosPorCuenta(cuentas, movs);
  igual('gasto y transferencia restan de A', s.get('a'), 4500);
  igual('ingreso suma a B', s.get('b'), 6000);
  igual('gasto resta y pago suma a tarjeta', s.get('t'), 79000);
  igual('deuda = línea − disponible', deudaTarjeta(cuentas[2], s.get('t')), 21000);
  igual('deuda nunca negativa', deudaTarjeta(cuentas[2], 120000), 0);
  igual('la tarjeta no suma al disponible', totalDisponible(cuentas, s), 10500);
  igual('deuda total de tarjetas', deudaTarjetas(cuentas, s), 21000);
  igual('contando crédito resta la deuda', totalDisponible(cuentas, s) - deudaTarjetas(cuentas, s), -10500);
  igual('tarjeta archivada no cuenta en la deuda', deudaTarjetas(cuentas.map((c) => ({ ...c, archivada: true })), s), 0);
}
{
  const cuentas = [banco('a', 10000), banco('cts', 90000, { noSumarAlDisponible: true }), banco('ar', 500, { archivada: true, archivadaEn: '2026-10-15' })];
  const s = saldosPorCuenta(cuentas, []);
  igual('CTS y archivadas no suman', totalDisponible(cuentas, s), 10000);
  igual('archivada cuenta antes de archivarse', totalEnFecha(cuentas, [], '2026-10-14'), 10500);
  igual('archivada no cuenta desde su archivo', totalEnFecha(cuentas, [], '2026-10-15'), 10000);
  const conNoSumar = banco('x', 100, { tipo: 'TARJETA_CREDITO', noSumarAlDisponible: false });
  igual('efectivo suma', totalDisponible([banco('e', 700, { tipo: 'EFECTIVO' }), conNoSumar], new Map([['e', 700], ['x', 100]])), 700);
}
{
  const movs = [
    mov('GASTO', 100, '2026-11-01', 'a'),
    mov('GASTO', 200, '2026-10-30', 'a'),
    mov('GASTO', 400, '2026-10-25', 'a'), // domingo anterior: fuera de la semana
    mov('GASTO', 800, '2026-10-02', 'a'),
    mov('INGRESO', 9999, '2026-11-01', 'a'),
    mov('TRANSFERENCIA', 9999, '2026-11-01', 'a', { cuentaDestinoId: 'b', categoriaId: '' }),
  ];
  igual('hoy/semana/mes ignora ingresos y transferencias', gastosHoySemanaMes(movs, '2026-11-01'), { hoy: 100, semana: 300, mes: 100 });
  const barras = ultimos7Dias(movs, '2026-11-01');
  igual('7 días', barras.length, 7);
  igual('7 días empieza hace 6', barras[0].fecha, '2026-10-26');
  igual('7 días monto', barras.map((b) => b.monto), [0, 0, 0, 0, 200, 0, 100]);
}
{
  const cats = [{ id: 'x', nombre: 'Comida', emoji: '🍽️' }, { id: 'y', nombre: 'Taxi', emoji: '🚕' }];
  const movs = [
    mov('GASTO', 300, '2026-11-01', 'a', { categoriaId: 'x' }),
    mov('GASTO', 100, '2026-11-02', 'a', { categoriaId: 'y' }),
    mov('INGRESO', 900, '2026-11-02', 'a', { categoriaId: 'x' }),
  ];
  const r = gastoPorCategoria(movs, cats, '2026-11-01', '2026-11-30');
  igual('categorías de mayor a menor', r.map((c) => [c.nombre, c.monto, c.porcentaje]), [['Comida', 300, 75], ['Taxi', 100, 25]]);
}
{
  const cuentas = [banco('a', 10000), banco('cts', 50000, { noSumarAlDisponible: true })];
  const movs = [
    mov('GASTO', 1000, '2026-10-20', 'a'),
    mov('GASTO', 500, '2026-11-02', 'a'),
    mov('INGRESO', 3000, '2026-11-03', 'a'),
    mov('TRANSFERENCIA', 700, '2026-11-03', 'cts', { cuentaDestinoId: 'a', categoriaId: '' }),
  ];
  const s = serieMes(cuentas, movs, '2026-11-01', '2026-11-04');
  igual('evolución: inicio del mes', s.inicio, 9000);
  igual('evolución: día a día hasta hoy', s.dias.map((d) => d.saldo), [9000, 8500, 12200, 12200]);
  igual('evolución: variación', s.variacion, 3200);
  igual('evolución: transferencia no es ingreso', s.ingresos, 3000);
  igual('evolución: promedio por día', s.promedioDiario, 125);
  const pasado = serieMes(cuentas, movs, '2026-10-01', '2026-11-04');
  igual('evolución: mes pasado completo', pasado.dias.length, 31);
  igual('evolución: saldo final del mes pasado', pasado.final, 9000);
  const actual = saldosPorCuenta(cuentas, movs);
  igual('saldo actual coincide con total disponible', s.final, totalDisponible(cuentas, actual));
  igual('primer mes', primerMes(movs, '2026-11-01', '2026-11-04'), '2026-10-01');
}
{
  const a = mov('GASTO', 1, '2026-11-01', 'a', { hora: '08:00' });
  const b = mov('GASTO', 1, '2026-11-01', 'a', { hora: '20:00' });
  const c = mov('GASTO', 1, '2026-10-31', 'a', { hora: '23:00' });
  const orden = ordenarMovimientos([c, a, b]);
  igual('orden más reciente primero', orden.map((m) => m.id), [b.id, a.id, c.id]);
  igual('agrupar por día', agruparPorDia(orden).map((g) => [g.fecha, g.movimientos.length]), [['2026-11-01', 2], ['2026-10-31', 1]]);
}

// --- Validaciones ---
{
  const base = mov('GASTO', 100, '2026-11-01', 'a');
  igual('movimiento válido', validarMovimiento(base, '2026-11-01'), null);
  igual('monto cero', validarMovimiento({ ...base, monto: 0 }, '2026-11-01'), 'Escribe un monto mayor a cero.');
  igual('sin categoría', validarMovimiento({ ...base, categoriaId: '' }, '2026-11-01'), 'Elige una categoría.');
  igual('fecha futura', validarMovimiento({ ...base, fecha: '2026-11-02' }, '2026-11-01'), 'La fecha no puede ser futura.');
  const t = normalizarMovimiento({ ...base, tipo: 'TRANSFERENCIA', cuentaDestinoId: 'a' });
  igual('transferencia pierde categoría', t.categoriaId, '');
  igual('misma cuenta rechazada', validarMovimiento(t, '2026-11-01'), 'El origen y el destino deben ser cuentas distintas.');
  igual('gasto pierde destino', normalizarMovimiento({ ...t, tipo: 'GASTO' }).cuentaDestinoId, '');
}
{
  const buena = {
    app: 'mis-cuentas', version: 1, cuentas: [banco('a', 0)],
    categorias: [{ id: 'c', nombre: 'x', emoji: '❓', tipo: 'GASTO', orden: 0 }],
    movimientos: [mov('GASTO', 100, '2026-11-01', 'a')],
  };
  igual('copia válida', validarCopia(buena), null);
  igual('copia ajena', validarCopia({ hola: 1 }) !== null, true);
  igual('copia nula', validarCopia(null) !== null, true);
  igual('copia con monto decimal', validarCopia({ ...buena, movimientos: [{ ...buena.movimientos[0], monto: 10.5 }] }) !== null, true);
  igual('copia con cuenta inexistente', validarCopia({ ...buena, movimientos: [{ ...buena.movimientos[0], cuentaId: 'zzz' }] }) !== null, true);
}

// --- Frase del día ---
{
  const banco = { frasesPorDia, generales, fechasEspeciales: { '02-14': 'Especial' } };
  let semilla = 7;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
  const primera = fraseDelDia('2026-11-02', [], banco, azar);
  const otraVez = fraseDelDia('2026-11-02', primera.historial, banco, azar);
  igual('misma fecha = misma frase', otraVez.texto, primera.texto);
  igual('no duplica el historial', otraVez.historial.length, 1);

  let historial = [];
  let fecha = '2026-01-01';
  let anterior = null;
  let repetidaAyer = 0;
  let repetidaSemana = 0;
  let especial = '';
  let fueraDeDia = 0;
  const todasDelDia = new Set(Object.values(frasesPorDia).flat());
  for (let i = 0; i < 400; i += 1) {
    const r = fraseDelDia(fecha, historial, banco, azar);
    if (r.texto === anterior) repetidaAyer += 1;
    const semana = historial.filter((h) => h.fecha >= sumarDias(fecha, -7)).map((h) => h.texto);
    if (semana.includes(r.texto)) repetidaSemana += 1;
    if (fecha.endsWith('02-14')) especial = r.texto;
    else if (todasDelDia.has(r.texto) && !frasesPorDia[claveDiaSemana(fecha)].includes(r.texto)) fueraDeDia += 1;
    historial = r.historial;
    anterior = r.texto;
    fecha = sumarDias(fecha, 1);
  }
  igual('día siguiente = frase distinta', repetidaAyer, 0);
  igual('sin repetir en 7 días', repetidaSemana, 0);
  igual('fecha especial tiene prioridad', especial, 'Especial');
  igual('frase de día correcto', fueraDeDia, 0);
  igual('historial limitado', historial.length <= 31, true);
  igual('clave miércoles sin tilde', claveDiaSemana('2026-11-04'), 'miercoles');
  igual('clave sábado sin tilde', claveDiaSemana('2026-11-07'), 'sabado');
  igual('saludo con fecha', fechaSaludo('2026-11-02'), 'Lunes, 2 de noviembre');
}
{
  const nueva = {
    app: 'mis-cuentas', version: 1, cuentas: [banco('a', 0, { color: 'lila' })],
    categorias: [{ id: 'c', nombre: 'x', icono: 'comida', color: 'rosa', tipo: 'GASTO', orden: 0 }],
    movimientos: [],
  };
  igual('copia con íconos válida', validarCopia(nueva), null);
  igual('copia sin ícono ni emoji', validarCopia({ ...nueva, categorias: [{ id: 'c', nombre: 'x', tipo: 'GASTO', orden: 0 }] }) !== null, true);
}

{
  const nombres = ['Yape', 'Ahorros', 'Sueldo BCP', 'Sueldo BBVA', 'Independencia BBVA', 'CTS BBVA', 'Ñ'];
  const siglas = siglasCuentas(nombres.map((nombre, i) => ({ id: String(i), nombre })));
  igual('siglas como el diseño', [...siglas.values()], ['YA', 'AH', 'SB', 'SV', 'IN', 'CT', 'Ñ']);
}

// --- Límites de gasto ---
{
  const dulce = (monto, fecha, extra = {}) => mov('GASTO', monto, fecha, 'a', { categoriaId: 'dulces', ...extra });
  const limite = { id: 'l1', categoriaId: 'dulces', monto: 1000, periodo: 'MES' };
  const justo = [dulce(600, '2026-11-02'), dulce(400, '2026-11-05')];
  igual('S/ 10.00 exacto no se pasa', estadoLimites([limite], justo, '2026-11-05')[0].excedido, false);
  const pasado = [...justo, dulce(10, '2026-11-06')];
  const e = estadoLimites([limite], pasado, '2026-11-06')[0];
  igual('S/ 10.10 sí se pasa', [e.excedido, e.gastado, e.exceso], [true, 1010, 10]);
  igual('mes anterior no cuenta', estadoLimites([limite], [dulce(5000, '2026-10-31'), ...justo], '2026-11-05')[0].excedido, false);
  igual('otra categoría no cuenta', estadoLimites([limite], [...justo, mov('GASTO', 500, '2026-11-05', 'a', { categoriaId: 'comida' })], '2026-11-05')[0].gastado, 1000);
  igual('ingreso en la categoría no cuenta', estadoLimites([limite], [...justo, mov('INGRESO', 500, '2026-11-05', 'a', { categoriaId: 'dulces' })], '2026-11-05')[0].excedido, false);
  igual('rango semana lunes a domingo', rangoPeriodo('SEMANA', '2026-11-04'), { desde: '2026-11-02', hasta: '2026-11-08' });
  igual('rango día', rangoPeriodo('DIA', '2026-11-04'), { desde: '2026-11-04', hasta: '2026-11-04' });
  igual('rango mes', rangoPeriodo('MES', '2026-02-10'), { desde: '2026-02-01', hasta: '2026-02-28' });
  const ultimo = dulce(10, '2026-11-06');
  igual('aviso al guardar el gasto que lo pasa', limitesPasadosPor(ultimo, [limite], [...justo, ultimo]).length, 1);
  igual('sin aviso para otra categoría', limitesPasadosPor(mov('GASTO', 9999, '2026-11-06', 'a', { categoriaId: 'comida' }), [limite], pasado).length, 0);
  const diario = { ...limite, periodo: 'DIA' };
  igual('límite diario se reinicia cada día', estadoLimites([diario], pasado, '2026-11-07')[0].gastado, 0);
  const copia = {
    app: 'mis-cuentas', version: 1, cuentas: [banco('a', 0)], movimientos: [],
    categorias: [{ id: 'dulces', nombre: 'Dulces', icono: 'dulce', tipo: 'GASTO', orden: 0 }],
  };
  igual('copia con límites válida', validarCopia({ ...copia, limites: [limite] }), null);
  igual('copia con límite decimal inválida', validarCopia({ ...copia, limites: [{ ...limite, monto: 10.5 }] }) !== null, true);
}

const fallidas = resultados.filter((r) => !r.ok);
window.resultadoPruebas = { total: resultados.length, fallidas };
const resumen = document.getElementById('resumen');
resumen.textContent = fallidas.length
  ? `${fallidas.length} de ${resultados.length} pruebas FALLARON`
  : `Las ${resultados.length} pruebas pasaron`;
resumen.style.color = fallidas.length ? '#D9485F' : '#3E9B72';
document.getElementById('lista').append(...[...fallidas, ...resultados.filter((r) => r.ok)].map((r) => {
  const li = document.createElement('li');
  li.textContent = `${r.ok ? '✓' : '✗'} ${r.nombre} ${r.detalle}`;
  return li;
}));
