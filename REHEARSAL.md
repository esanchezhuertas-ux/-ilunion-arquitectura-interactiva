# ILUNION · navegación y presentación v68

## Resultado

La arquitectura conserva sus 294 páginas, URLs, anotaciones, colores por negocio y posición de Retail. Añade navegación por áreas con URL compartible, ruta contextual, índice navegable y un recorrido guiado de cinco pasos. La vista general abre el primer nivel para mejorar la legibilidad. Cada área muestra sus hijos directos y permite desplegar el resto.

## Aplicación de StageShow

Referencias: `hero-demo`, `choreography`, `references/craft.md` y `references/motion.md` de StageShow (Benji Taylor).

Se aplican el encuadre estable, la transición motivada por una acción, la entrada escalonada y la composición específica para formatos pequeños. Los nodos existentes mantienen su continuidad visual y las conexiones siguen sus posiciones durante el cambio. El recorrido conserva el mapa real, admite avance manual y reproducción opcional, y restaura la vista previa al cerrarse. La preferencia de movimiento reducido desactiva las animaciones.

Se adapta este criterio al motor JavaScript existente. No se incorpora el kit React de interfaces simuladas ni se sustituye contenido real por placeholders.

## Verificación

- `node --check app.js` y `node --check explorer.js`.
- `node tests/architecture.test.cjs`: 294 páginas conservadas, 14 ámbitos, geometría finita en escritorio y móvil, búsquedas globales y posición de Retail.
- Navegador: vista general, Retail, apertura de Comercialización, ruta contextual, cambio de área y recorrido guiado.
- Vista móvil de 390 × 844 mediante iframe: índice inicial, menú de áreas, búsqueda de Fisioterapia, foco del resultado, avance y cierre del recorrido con restauración del área.
- Se mantienen destinos con `noopener noreferrer` y controles etiquetados para teclado y lectores de pantalla.

Límites: revisión visual por estados en el navegador, sin grabación automatizada fotograma a fotograma. No constituye una auditoría completa WCAG ni validación en dispositivos físicos.
