// Colores pastel (fondo y texto) de los cuadrados de cuentas y categorías.
export const COLORES = {
  lila: { fondo: '#EEDFF7', texto: '#6B3FA0' },
  durazno: { fondo: '#FCE5D6', texto: '#9A4E24' },
  azul: { fondo: '#DEE9F8', texto: '#2F5C94' },
  celeste: { fondo: '#DAEFF4', texto: '#1F6577' },
  verde: { fondo: '#E1F1E6', texto: '#2D6E4D' },
  arena: { fondo: '#F6ECD4', texto: '#7D5E16' },
  rosa: { fondo: '#F9D9E4', texto: '#A02D57' },
};

export const ORDEN_COLORES = Object.keys(COLORES);

export const colorDe = (clave) => COLORES[clave] ?? COLORES.rosa;

// Color para un elemento nuevo: el siguiente de la lista, según cuántos hay.
export const colorSiguiente = (cantidad) => ORDEN_COLORES[cantidad % ORDEN_COLORES.length];
