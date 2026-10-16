# Revisión del dictado — punto de continuación

Rama: `revision-dictado` (main = versión publicada; no se ha publicado nada de esta revisión).

## Qué hay
- `pendientes.js`: lo no dicho queda pendiente (preguntas sin contestar, metros no dichos, metros calculados,
  partidas sin precio, partidas supuestas, estancias nombradas sin decir «entero»). Con pendientes no sale el PDF
  ni se manda a firmar; se puede guardar el borrador.
- `entiende.js`: motor del dictado (segmentador de dictado sin comas, listas de metros, correcciones…).
- `escena.js` (nuevo, la causa común de los fallos de dictados nuevos): el intérprete iba frase a frase reescribiendo
  texto, sin saber QUÉ ESTANCIAS había ni a cuáles iba cada trabajo; «en los tres», «el principal», «esas mismas»,
  «en el salón y en el pasillo, …» se perdían. La escena lee el dictado como piezas (estancias con sus metros,
  trabajos de pintar/suelos, medidas, «el salón no», y lo demás que no toca), engancha cada grupo de estancias al
  trabajo de detrás o de delante y lo vuelve a escribir una frase por estancia. Se llama dentro de `analizar()`
  justo después de partir el dictado. `window.__sinEscena=true` (o `SIN_ESCENA=1` en el banco) la apaga para
  comparar; la versión anterior está en `tools/historial/escena_v1.js` y en git.
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

## Medición (vorma y lucas, con la escena v2)
Fallos por banco, antes de la escena → ahora: AB 0→0, CD 0→0, E 0→0, F 0→0, G 1→1, H 15→15, I 13→12, J 6→4,
K 30→18, JKs 54→48. Lucas igual. Ninguna frase que iba bien se ha roto (se compara con `cmpbase.py`, y en Lucas
con `run_lucas.sh` contra la versión 302bae1 en un worktree).

## Siguiente
- Seguir con los fallos de K y JKs que cambian alcance o dinero (inventado, omitido, cantidad), luego etiquetas.
- Luego: medición final con el banco reservado L (una sola vez), revisión independiente, recorridos completos
  (recorrido.py, micro.py, calc.py) en las dos apps, y el informe.
