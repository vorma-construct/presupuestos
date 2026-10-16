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

- frases_I: quitado «mco» de no_debe en «los muebles los trae su hijo que trabaja en una tienda»: «los trae» no dice
  quién los monta; ahora la app deja el montaje como pregunta pendiente (punto 3: con dos lecturas posibles, preguntar).

- frases_O (escrito a ciegas): quitado «alsm» donde solo se dice el formato 30x90: en la tarifa «alsm» es alicatado SIN material
  (lo pone el cliente); con material es «alc». Quitado «pit» de sin_medida en baños/cocinas enteros con sus metros dichos: el techo
  de esa estancia son los metros del suelo, que sí se dijeron.

## Medición final (16-oct-2026, rama revision-dictado, sin publicar)
Banco reservado L (120 frases, escrito a ciegas, medido UNA vez al final, ya no es reservado): 34 con fallos (versión publicada 302bae1: 43).
Por clase (frases): etiqueta 16, inventado 10, cantidad 11, cantidad sin decir 5, omitido 8. De los «inventados», 6 son la reforma
integral que mete baño y cocina enteros por defecto: salen como PREGUNTA pendiente (no sale el PDF hasta confirmarlo); decidir con Asier.
Bancos ciegos de después (N 150, O 120) usados ya para desarrollar: N 43→17, O 53→31 (versión publicada: N 43, O 61).
Bancos de siempre: AB 0, CD 0, E 0, F 0, G 0, H 1, I 1, J 1, K 1, JKs 15, M 0 (vorma y lucas iguales; ninguna frase que iba bien se rompe).
Recorridos completos (recorrido.py, micro.py, micro2.py, calc.py) en Vorma y en Lucas recién construido: bien. PDF real mirado.
Revisión independiente hecha: 3 fallos encontrados y arreglados (quitado de repetidas, «las paredes las pinta el cliente», «puertas…, tres»).

## Qué queda
- Fallos de L sin tocar (para no gastarlo como banco): dos baños «Baño 1: 5,5 m²… Baño 2: 3 m²», «tres baños completos (5, 4 y 3 m²)»,
  «quitar 2 puertas y recolocarlas, cambiar las otras 4», «pintar paredes 90 m² y techos sesenta», «papel nuevo… 12,5 m²», «porcelánico… no, mejor
  flotante», tabiquería por metro (tabm), «sin obra de baño ni cocina».
- Etiquetas de estancia (la línea dice «— salón» y falta «y pasillo», etc.): no cambian el dinero.
- Audio real del micrófono en el móvil: SIN PROBAR (solo simulado). Lo tiene que probar Asier.
- Publicar: NO, hasta decidir con Asier (quedan fallos conocidos que cambian partidas o cantidades).

## Medición (vorma y lucas, con la escena v2)
Fallos por banco, antes de la escena → ahora: AB 0→0, CD 0→0, E 0→0, F 0→0, G 1→1, H 15→15, I 13→12, J 6→4,
K 30→18, JKs 54→48. Lucas igual. Ninguna frase que iba bien se ha roto (se compara con `cmpbase.py`, y en Lucas
con `run_lucas.sh` contra la versión 302bae1 en un worktree).

## Siguiente
- Seguir con los fallos de K y JKs que cambian alcance o dinero (inventado, omitido, cantidad), luego etiquetas.
- Luego: medición final con el banco reservado L (una sola vez), revisión independiente, recorridos completos
  (recorrido.py, micro.py, calc.py) en las dos apps, y el informe.
