// Arranque y navegación.
import { pantallaAjustes } from './ajustes.js';
import { pantallaBienvenida } from './bienvenida.js';
import { alCambiar, E, iniciarDatos } from './datos.js';
import { pantallaEvolucion } from './evolucion.js';
import { abrirRegistro } from './registro.js';
import { pantallaResumen } from './resumen.js';
import { ajustarTextos, aviso, fijarCambioPestana, h, icono, vigilarTeclado } from './ui.js';

const PANTALLAS = {
  resumen: () => pantallaResumen(pintar),
  evolucion: () => pantallaEvolucion(pintar),
  ajustes: () => pantallaAjustes(pintar),
};

let pestana = 'resumen';
const principal = document.getElementById('principal');
const contenedor = document.getElementById('pantalla');

function pintar() {
  if (!E.ajustes.bienvenidaHecha) return;
  contenedor.replaceChildren(...[PANTALLAS[pestana]()].flat(Infinity).filter(Boolean));
  ajustarTextos(contenedor);
}

function cambiarPestana(nueva) {
  if (nueva === pestana) return;
  pestana = nueva;
  pintar();
  window.scrollTo(0, 0);
}

function mostrarApp() {
  document.getElementById('bienvenida').replaceChildren();
  principal.hidden = false;
  pintar();
}

// --- Service worker y actualizaciones ---

function ofrecerActualizacion(trabajador) {
  if (document.querySelector('.barra-version')) return;
  document.body.append(h(
    'button',
    {
      type: 'button',
      class: 'barra-version',
      onclick: () => trabajador.postMessage('activar'),
    },
    'Hay una versión nueva. Toca para actualizar.',
  ));
}

async function registrarTrabajador() {
  // Sin https (por ejemplo, viéndola por wifi desde el iPhone) no hay service worker.
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  const registro = await navigator.serviceWorker.register('sw.js');
  const yaControlada = Boolean(navigator.serviceWorker.controller);
  const vigilarInstalacion = () => {
    const nuevo = registro.installing;
    nuevo?.addEventListener('statechange', () => {
      if (nuevo.state === 'installed' && navigator.serviceWorker.controller) ofrecerActualizacion(nuevo);
    });
  };
  if (registro.waiting && yaControlada) ofrecerActualizacion(registro.waiting);
  vigilarInstalacion();
  registro.addEventListener('updatefound', vigilarInstalacion);
  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (yaControlada && !recargando) {
      recargando = true;
      window.location.reload();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') registro.update().catch(() => {});
  });
}

async function iniciar() {
  fijarCambioPestana(cambiarPestana);
  const ICONOS_REGISTRO = { GASTO: 'menos', INGRESO: 'mas', TRANSFERENCIA: 'flechas' };
  document.querySelectorAll('[data-registro]').forEach((b) => {
    b.prepend(icono(ICONOS_REGISTRO[b.dataset.registro], { tamano: 20 }));
    b.addEventListener('click', () => abrirRegistro(b.dataset.registro));
  });
  vigilarTeclado();
  window.addEventListener('resize', () => ajustarTextos(contenedor));
  document.fonts?.ready.then(() => ajustarTextos(contenedor));
  alCambiar(pintar);
  // Si la app queda abierta de un día para otro, "Hoy" debe cambiar.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') pintar();
  });

  navigator.storage?.persist?.().catch(() => {});
  registrarTrabajador().catch(() => {});

  try {
    await iniciarDatos();
  } catch {
    aviso('No se pudieron abrir los datos. Cierra y abre la app.', 'fallo');
    return;
  }
  document.getElementById('cargando').remove();
  if (E.ajustes.bienvenidaHecha) mostrarApp();
  else document.getElementById('bienvenida').append(pantallaBienvenida(mostrarApp));
}

iniciar();
