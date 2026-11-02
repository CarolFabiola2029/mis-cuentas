# Mis Cuentas

App para llevar el control de gastos personales en iPhone. Funciona sin internet y todos los datos se guardan solo en el teléfono: no hay servidor ni cuentas de usuario, y nada de la información de gastos llega a GitHub.

## Instalar en el iPhone

Hace falta iOS 16 o superior.

1. Abre **Safari** (tiene que ser Safari) y entra al enlace de la app.
2. Toca el botón **Compartir** (el cuadrado con una flecha hacia arriba).
3. Baja y toca **Agregar a inicio**, y luego **Agregar**.
4. Abre la app **desde el nuevo ícono** de la pantalla de inicio.
5. En "Hola, Carol", escribe cuánto tienes hoy en cada cuenta y toca **Empezar**.

> **Importante:** Safari y el ícono guardan datos por separado. Si registras algo en Safari, no aparecerá en el ícono. Usa siempre el ícono.

## Copias de seguridad

Los datos viven solo en el teléfono, así que la copia es la única protección si el teléfono se pierde o se cambia.

**Hacer una copia**
1. Ve a **Ajustes → Copia de seguridad → Hacer copia de seguridad**.
2. En el menú que aparece, elige **Guardar en Archivos** (mejor en iCloud Drive) o envíatela por WhatsApp.

Si pasan más de 7 días sin copia, el Resumen muestra un aviso con un botón para hacerla.

**Restaurar una copia (por ejemplo, en un celular nuevo)**
1. Instala la app como se explica arriba.
2. En la pantalla de bienvenida toca **Ya tengo una copia de seguridad**. Si ya estás dentro de la app, ve a **Ajustes → Restaurar una copia**.
3. Elige el archivo `mis-cuentas-copia-….json` y confirma. Esto reemplaza todos los datos actuales de la app.

**Qué borra los datos**
- Eliminar el ícono de la app de la pantalla de inicio.
- En el iPhone: Ajustes → Safari → Borrar historial y datos de sitios web.

Antes de hacer cualquiera de las dos cosas, haz una copia.

## Límites de gasto

Sirven para ponerle un tope a una categoría, por ejemplo **S/ 10.00 al mes en Dulces**.

1. Ve a **Ajustes → Límites de gasto → + Agregar límite**.
2. Elige la categoría, escribe el monto y elige el periodo: **Día**, **Semana** (de lunes a domingo) o **Mes**.
3. Toca **Guardar**.

- Cuando un gasto hace que la categoría **pase** el límite, aparece un anuncio. Con un límite de S/ 10.00, llegar justo a S/ 10.00 no avisa; llegar a S/ 10.10 sí.
- En el Resumen, la sección **Mis límites** muestra cuánto llevas de cada límite; la barra se pone roja si te pasaste.
- Para cambiar o quitar un límite, tócalo en Ajustes.
- Los límites también se guardan en la copia de seguridad.

## Frases del corazón

Al tocar el corazón junto a "Hola, Carol" aparece la frase del día, firmada por Andrés. Es una frase por día: se elige la primera vez que se toca el corazón y se mantiene igual hasta la medianoche (hora de Lima).

- Unas 2 de cada 3 veces sale una frase del día de la semana; las demás, una general.
- Nunca se repite la del día anterior, y se evita repetir las de los últimos 7 días.
- Si ese día hay una fecha especial, sale esa frase.

### Cómo agregar o cambiar frases
1. Abre `js/frases.js` con el **Bloc de notas** (clic derecho → Abrir con → Bloc de notas).
2. Cada frase va en su propia línea, **entre comillas simples y con una coma al final**:
   ```
   'Te amo más de lo que esta app puede contar, mi pinteta 💖',
   ```
3. Para agregar una frase, copia una línea completa, pégala debajo y cambia solo el texto de adentro.
4. No uses la comilla simple `'` dentro de una frase, porque la corta. Si necesitas un apóstrofo, usa `’`.
5. Guarda con **Archivo → Guardar**.

### Cómo agregar fechas especiales (cumpleaños, aniversario…)
En la parte de abajo de `js/frases.js` está `fechasEspeciales`. Agrega una línea por fecha, con **mes y día de dos cifras**:
```
export const fechasEspeciales = {
  '08-25': '¡Feliz cumpleaños, mi niña! Hoy el mundo celebra que existes 🎂💖',
  '03-14': 'Feliz aniversario, mi amor. Gracias por cada día ❤️',
};
```
Las líneas que empiezan con `//` son ejemplos y no se usan: puedes borrarlas o dejarlas.

### Revisar y publicar
1. Haz doble clic en `servir.bat`, abre <http://localhost:8000> y toca el corazón. Si la app no carga, revisa que no falte una comilla o una coma.
2. Haz doble clic en `publicar.bat`.

## Exportar a Excel

Ve a **Ajustes → Exportar a Excel**. Se crea un archivo con las hojas **Movimientos** y **Saldos**, que puedes guardar en Archivos o enviar por WhatsApp. El Excel sirve para revisar los datos; para restaurar la app se usa la copia `.json`.

## Probar en la laptop

No hay que instalar nada más: solo se necesita Python, que ya está en esta laptop.

1. Haz doble clic en `servir.bat`.
2. Abre <http://localhost:8000> en Chrome o Edge.
3. Para ver las pruebas automáticas, abre <http://localhost:8000/tests/>. Debe decir que todas pasaron.

Para cerrar el servidor, cierra su ventana negra.

## Ver la app desde el iPhone por wifi

Sirve para mirar cómo se ve antes de publicar.

1. Conecta la laptop y el iPhone a la misma wifi.
2. Haz doble clic en `servir.bat`. Si Windows pregunta por el firewall, permite el acceso en redes **privadas**.
3. En la ventana negra busca la línea **Dirección IPv4** que empiece con `192.168.`.
4. En Safari del iPhone abre `http://ESA-IP:8000` (por ejemplo, `http://192.168.1.41:8000`).

Si no carga, desactiva NordVPN mientras pruebas o activa su opción de ver dispositivos en la red local.

Por esta vía la dirección es `http`, no `https`, así que el iPhone no activa el modo sin internet ni el menú de compartir archivos. Eso es normal: todo funciona con normalidad una vez publicada en GitHub Pages. No uses esta vía para guardar datos reales.

## Publicar en GitHub Pages por primera vez

1. Crea una cuenta gratis en <https://github.com/signup>.
2. Crea un repositorio en <https://github.com/new>:
   - **Repository name:** `mis-cuentas`
   - Visibilidad: **Public** (GitHub Pages gratis lo exige; el código queda público, los gastos no porque nunca salen del teléfono)
   - No marques ninguna casilla de agregar archivos.
3. Haz doble clic en `publicar.bat`. Te pedirá tu nombre, tu correo de GitHub y la dirección del repositorio (`https://github.com/TU-USUARIO/mis-cuentas.git`). La primera vez se abrirá una ventana para iniciar sesión en GitHub.
4. En GitHub entra al repositorio → **Settings → Pages**. En **Branch** elige `main` y `/ (root)`, y toca **Save**.
5. Después de 1 o 2 minutos, la app estará en `https://TU-USUARIO.github.io/mis-cuentas/`.

Elige bien el nombre de usuario y del repositorio antes de instalar la app: el iPhone guarda los datos ligados a esa dirección. Si la dirección cambia, instala la app de nuevo y restaura una copia.

## Actualizar la app sin borrar los datos

1. Haz los cambios en los archivos de esta carpeta.
2. Haz doble clic en `publicar.bat`.
3. Espera 1 o 2 minutos, abre la app en el iPhone con internet y toca el aviso **Hay una versión nueva**. Si no aparece, ciérrala y ábrela otra vez.

Los datos no se tocan: la actualización solo cambia los archivos de la app. De todos modos, haz una copia de seguridad antes de cambios grandes.

Usa siempre `publicar.bat`: además de subir los cambios, cambia el número de versión en `sw.js`, que es lo que hace que el iPhone se entere. Si agregas un archivo nuevo a la app, agrégalo también a la lista `ARCHIVOS` de `sw.js`; si no, no estará disponible sin internet.

## Cómo está organizada

| Ruta | Contenido |
|---|---|
| `index.html`, `css/estilos.css` | Estructura y diseño |
| `js/calculos.js`, `js/dinero.js`, `js/fechas.js` | Reglas de saldos, montos y fechas |
| `js/datos.js` | Guardado en el teléfono (IndexedDB) |
| `js/registro.js`, `js/editar.js` | Registro rápido y edición |
| `js/resumen.js`, `js/evolucion.js`, `js/ajustes.js`, `js/bienvenida.js` | Pantallas |
| `js/graficos.js` | Gráficos SVG |
| `js/frases.js` | Las frases del corazón y las fechas especiales (para editar) |
| `js/frase.js` | Cómo se elige la frase del día |
| `js/limites.js` | Límites de gasto: ajustes, anuncio y barras del Resumen |
| `js/iconos.js`, `js/paleta.js` | Íconos de línea y colores de cuentas y categorías |
| `fonts/` | Playfair Display y Nunito Sans (incluidas para funcionar sin internet) |
| `js/respaldo.js` | Copia de seguridad y Excel |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación y modo sin internet |
| `vendor/` | Librerías incluidas: idb 8.0.3 y SheetJS 0.20.3 |
| `tests/` | Pruebas automáticas |
