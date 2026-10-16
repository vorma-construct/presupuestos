# Revisión del dictado — punto de continuación

Rama: `revision-dictado` (main = versión publicada; no se ha publicado nada de esta revisión).

## Qué hay
- `pendientes.js`: lo no dicho queda pendiente (preguntas sin contestar, metros no dichos, metros calculados,
  partidas sin precio, partidas supuestas, estancias nombradas sin decir «entero»). Con pendientes no sale el PDF
  ni se manda a firmar; se puede guardar el borrador.
- `entiende.js`: motor del dictado (segmentador de dictado sin comas, listas de metros, correcciones…).
- `tools/banco_pruebas.py`: bancos de frases; clasifica fallos (inventado, omitido, cantidad inventada, cantidad,
  precio, pendiente, documento, etiqueta).
- `tools/bancos/frases_*.json`: bancos de desarrollo. `tools/bancos/reservado/frases_L.json`: banco RESERVADO,
  escrito a ciegas, no se ha mirado ni usado para desarrollar; solo para la medición final.
- `tools/pruebas/`: recorrido completo (recorrido.py), micrófono simulado (micro.py, micro2.py), cálculo (calc.py).
  Necesitan las librerías de rutas.py (pdf.js, html2canvas, jspdf de npm) en disco.

## Cómo medir
    python3 tools/banco_pruebas.py tools/bancos/frases_K.json vorma --hilos 8
    python3 tools/pruebas/recorrido.py . vorma salida "<dictado>"

## Cambios de resultados esperados (justificados)
- frases_J: quitado «pit» de no_debe cuando hay baño/cocina entera (el paquete pinta su techo); quitado «piso: 70» del
  dictado de Cruces (no se dijo reforma entera); quitado «pub» de sin_lugar en Muskiz (la puerta nueva del hueco de la
  habitación sí es de esa habitación); quitado «pit» de no_debe en «nada de pintura» con baño entero (techo del baño).
