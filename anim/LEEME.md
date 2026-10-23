# Animaciones de los ejercicios

Cada archivo `<id>.jpg` es una tira con las dos fotos de un ejercicio (posición inicial
arriba y final abajo), sacadas de [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
que es de dominio público (Unlicense). La app alterna las dos fotos y, debajo, muestra el paso
de la técnica que corresponde a cada una, sincronizado con la imagen. La plancha, la caminata,
la elíptica y la bicicleta tienen una sola foto.

Dentro de `rutina_arnold.html`:

- `ANIM`: tamaño de cada tira y cuántas fotos tiene.
- `PASOS`: el texto de cada foto (el 1 va con la de arriba y el 2 con la de abajo).
- `GIFS`, `REEMPLAZO` y `CASA_GIFS`: qué animación lleva cada ejercicio de la rutina, su
  reemplazo en el gym y su versión en casa.

Para agregar una: busca el ejercicio en la carpeta `exercises/` de free-exercise-db, apila sus
fotos `0.jpg` y `1.jpg` en una sola imagen de unos 360 px de ancho, súbela aquí y agrégala a
`ANIM` y `PASOS`.
