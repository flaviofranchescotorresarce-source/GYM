# Gifs de los ejercicios

Cada gif alterna las dos fotos (posición inicial y final) de un ejercicio de
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), que es de dominio
público (Unlicense). En la app se ven al tocar el nombre de un ejercicio.

Dentro de `rutina_arnold.html` hay tres tablas que unen cada ejercicio de la rutina
con su gif:

- `GIFS`: el ejercicio de la rutina.
- `REEMPLAZO`: la segunda opción en el gym por si la máquina está ocupada (nombre,
  técnica y gif).
- `CASA_GIFS`: la versión en casa, sin equipo (el texto está en `CASA`).

Si cambias un ejercicio de la rutina, agrégalo en las tres: busca el ejercicio en la
carpeta `exercises/` de free-exercise-db, junta sus fotos `0.jpg` y `1.jpg` en un gif
de unos 280 px de ancho y súbelo a esta carpeta.
