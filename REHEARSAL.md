# ILUNION · navegación y presentación v69

## Resultado

La arquitectura conserva sus 294 páginas, URLs, anotaciones, identificación por negocio y posición de Retail. Añade navegación por áreas con URL compartible, ruta contextual, índice navegable y un recorrido guiado de cinco pasos. La vista general abre el primer nivel; cada área muestra sus hijos directos y permite desplegar el resto.

El menú lateral comienza cerrado. Su botón está junto a la cabecera lateral al abrirse y en la fila contextual al cerrarse. En móvil se presenta como un panel superpuesto, con cierre mediante Escape y estado accesible.

Los colores de las ramas son más vivos. Las tarjetas mantienen su borde y fondo, sin franja superior. Las conexiones de 4,4 px incluyen puntos neón redondos de 5,8 px (5,2 px en detalle). La preferencia de movimiento reducido desactiva las animaciones.

El minimapa tiene fondo blanco, sin separación entre lienzo y controles. Proyecta las cajas y conexiones reales, incluidos los 297 nodos del árbol completo (294 páginas y 3 anotaciones), sin tamaños mínimos que provoquen solapamientos. Cada eje aprovecha el espacio disponible. En la vista inicial, el conjunto aparece compacto y centrado, con la tarjeta raíz de unos 44 px. El marco de zoom y la navegación utilizan la misma conversión de coordenadas.

## Aplicación de StageShow

Referencias: `hero-demo`, `choreography`, `references/craft.md` y `references/motion.md` de StageShow (Benji Taylor).

Se aplican el encuadre estable, las transiciones motivadas por acciones, la entrada escalonada y la composición para formatos pequeños al motor JavaScript existente. Los nodos conservan su continuidad visual y las conexiones siguen sus posiciones. El recorrido admite avance manual y reproducción opcional, y restaura la vista anterior al cerrarse.

## Verificación

- `node --check app.js` y `node --check explorer.js`.
- `node tests/architecture.test.cjs`: 294 páginas, posición de Retail, 14 ámbitos, geometría en escritorio y móvil, búsquedas globales, escala inicial del minimapa y proyección sin solapamientos de los 297 nodos.
- Navegador a 1363 × 936, 1024 × 768 y 390 × 844 (los dos últimos mediante iframe): apertura y cierre del menú, navegación por áreas, índice, búsqueda, recorrido, zoom y controles del minimapa sin recorte.
- Comprobación visual del minimapa con todas las ramas desplegadas y de la animación de flujo activa.
- Enlaces externos con `noopener noreferrer` y controles etiquetados para teclado y lectores de pantalla.

La revisión se realiza por estados en el navegador; no incluye una auditoría completa WCAG ni pruebas en dispositivos físicos.
