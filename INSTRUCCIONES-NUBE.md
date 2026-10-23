# Rutina Arnold — app + guardado en la nube (todo con Google Apps Script)

Con este método, Google Apps Script hace **dos cosas a la vez**: guarda tu progreso en una hoja de cálculo **y** sirve la app. Así tienes una sola URL `https://script.google.com/.../exec` que abres en el PC o en el iPhone (se puede añadir a la pantalla de inicio como si fuera una app). No necesitas ningún otro servicio.

Sigue estos pasos **una sola vez**:

## 1. Crear la hoja de cálculo
1. Entra a [sheets.new](https://sheets.new) con tu cuenta de Google **personal** (Gmail). Una cuenta corporativa puede bloquear el paso 4.
2. Ponle un nombre, por ejemplo: `Rutina Arnold — datos`.

## 2. Pegar el código (archivo Code.gs)
1. En la hoja, ve a **Extensiones → Apps Script**.
2. En el archivo `Code.gs` (el que aparece por defecto), borra todo y pega el contenido completo de [google-apps-script.gs](google-apps-script.gs).
3. Guarda (Ctrl+S).

## 3. Pegar la app (archivo Index.html) — ESTE ES EL PASO NUEVO
1. En el editor de Apps Script, a la izquierda pulsa el **+** junto a "Archivos" → **HTML**.
2. Ponle exactamente el nombre `Index` (Apps Script le añade `.html` solo; debe quedar `Index.html`).
3. Borra el contenido de ejemplo y pega **todo** el contenido de `rutina_arnold.html`
   (ábrelo en el PC, selecciona todo con Ctrl+A, copia con Ctrl+C y pega aquí).
4. Guarda (Ctrl+S).

## 4. Publicar como aplicación web

### Si YA habías desplegado antes (tu caso) — actualiza, NO crees una nueva
Para que la URL `/exec` siga siendo la misma (la que ya está en el HTML), actualiza la implementación que ya tienes:
1. Arriba a la derecha: **Implementar → Administrar implementaciones**.
2. En tu implementación activa, pulsa el **lápiz** (editar).
3. En **Versión** elige **Nueva versión** y pulsa **Implementar**.
4. La URL `/exec` no cambia. **Esa URL ES tu app.**

### Si es la primera vez
1. **Implementar → Nueva implementación**.
2. En el engranaje ⚙️ elige tipo: **Aplicación web**.
3. Configura:
   - **Ejecutar como:** Yo (tu correo)
   - **Quién tiene acceso:** Cualquier usuario
4. Pulsa **Implementar** y autoriza los permisos (puede avisar que la app "no está verificada": pulsa *Configuración avanzada → Ir al proyecto*).
5. Copia la **URL de la aplicación web** (termina en `/exec`). **Esa URL ES tu app.**
6. Como esa URL es nueva, pégala también en el HTML: busca `const CLOUD_URL = '...'` y reemplázala; luego vuelve a pegar el HTML en `Index.html` y repite el paso 4 (nueva versión).

## 5. Usarla
- **En el PC:** abre esa URL `/exec` en el navegador. Deberías ver la app y abajo *"Sincronizado con la nube."*
- **En el iPhone:** abre esa misma URL en **Safari** → botón **Compartir** (cuadrito con flecha ↑) → **Añadir a pantalla de inicio**. Te queda un ícono que abre la app a pantalla completa.
- **En Android:** ábrela en Chrome → menú **⋮** → **Agregar a pantalla de inicio**.

Todos los dispositivos ven el mismo progreso porque todos usan la misma hoja de Google.

---

## Cuando cambies algo en la app (actualizar)
1. Actualiza el archivo `Index.html` en Apps Script (pega la versión nueva de `rutina_arnold.html`).
2. **Implementar → Administrar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar.**
   > Importante: usa **"editar la implementación existente"**, NO "Nueva implementación". Así la URL `/exec` sigue siendo la misma y no tienes que reconfigurar nada.

---

## Análisis de comida por foto (IA gratis)
La pestaña Nutrición tiene un botón **"📷 Analizar foto de comida"** que usa la API gratuita de Google Gemini. La clave ya está puesta dentro del HTML (`const GEMINI_KEY = '...'`), así que funciona sin configurar nada. Si algún día quieres cambiarla, créala en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) y pégala en esa línea.

Las estimaciones de la IA son aproximadas: revisa los alimentos detectados (puedes quitar los que no correspondan con ✕) antes de pulsar "Agregar al dia".

## Conectar el Apple Watch (datos de Salud)

Una página web **no puede** leer la app Salud: Apple no lo permite. El puente es un **Atajo** del iPhone que lee los datos y los envía a la misma URL `/exec`. Es gratis, nativo y una vez montado funciona solo.

Los datos de salud se guardan en la celda **A3** de la hoja, separados de tu progreso (A1), así que nunca se pisan entre ellos.

### 1. Actualiza el backend (una sola vez)
Pega de nuevo el contenido de [google-apps-script.gs](google-apps-script.gs) en `Code.gs` y vuelve a implementar (**Nueva versión**). Sin este paso el Atajo no tiene dónde guardar.

> ⚠️ **Hazlo en el proyecto correcto:** ábrelo **desde la hoja de cálculo** (Extensiones → Apps Script). Si creas un proyecto nuevo desde script.google.com, ese proyecto no está unido a ninguna hoja y todo falla con *"Cannot read properties of null (reading 'getSheetByName')"*. Si aun así necesitas usar un proyecto independiente, rellena la constante `SHEET_ID` al inicio del código con el ID de tu hoja.

### 2. Comprueba primero que el backend graba (30 segundos, sin Atajos)
Pega esta URL en Safari, cambiando el principio por tu `/exec`:

```
TU_URL/exec?token=arnold-2026-fxt-7391&activas=500&peso=69.5
```

Debe responder `{"ok":true,"dia":"..."}`. Mira la hoja: la celda **B3** dirá *"Último dato del Watch: ..."*. Si esto funciona, el resto es solo automatizarlo.

> No hace falta mandar la fecha: el servidor usa el día de hoy. Si la mandas y no viene exactamente como `2026-07-26`, la ignora y usa la del servidor (Atajos la envía en formato español).

### 3. Crea el Atajo — empieza con UN dato
Monta primero solo la energía activa. Cuando lo veas funcionando, añades el resto.

> Nombres en **inglés** (iOS 26 en inglés). En el buscador de acciones escribe `Health` o `URL` para encontrarlas.

App **Shortcuts** → **+** → **Add Action** → añade en este orden:

1. **Find Health Samples**
   - Type: **Active Calories**
   - **Group by: Day**  ← que Salud sume el dia por ti
   - **Fill Missing: OFF**  ← critico, ver abajo
   - Sort by: **Start Date** · Order: **Latest First**
   - **Limit: ON → 1**
2. **Get Value from Health Samples**
3. **Set Variable** → nombre: `activas`

   > **La clave es que Salud entregue UN solo numero.** Con *Group by: Day* + *Limit 1* +
   > *Latest First* sale el total de hoy y ya esta. Ni siquiera hace falta filtro de fecha.
   >
   > **No uses *Combine Text*, *Calculate Statistics* ni *Round*.** Los tres fallaron en
   > pruebas reales: o devolvian vacio, o numeros absurdos de 16-18 digitos.
   >
   > ⚠️ **Fill Missing debe estar APAGADO.** Rellena con ceros los dias sin datos, asi que
   > en vez de un dia devuelve una lista de muchos; al meterse en la URL se pegan todos
   > sin separador y sale algo como `1320000000000000`, que el servidor rechaza por absurdo.
   >
   > Nombra las variables con *Set Variable*: con varias metricas tendras varias acciones
   > llamadas igual y elegir la correcta se vuelve una loteria.
4. **Get Contents of URL** — **sin tocar Method ni Request Body**. En el campo de la URL escribe:

   ```
   TU_URL/exec?token=arnold-2026-fxt-7391&activas=
   ```

   y **arrastra la variable del paso 3 justo después del `=` final**.

Pulsa ▶ para probarlo. Debe responder `{"ok":true,"dia":"..."}`.

> **Todo va en la URL, no en un JSON.** Construir el cuerpo JSON en Shortcuts obliga a añadir campos uno a uno y es fácil equivocarse: si el cuerpo va vacío, el servidor responde *"token invalido"*. Con la URL basta escribir y arrastrar.
>
> ⚠️ **"This action is trying to share N health items, which is not allowed".** iOS no deja enviar fuera del teléfono muchos registros de salud de golpe (un día tiene ~100 muestras de energía activa). Dos soluciones, y conviene aplicar ambas:
>
> **Activa el permiso:** Ajustes → **Shortcuts** → **Advanced** → **Allow Sharing Large Amounts of Data**. Es imprescindible: se manda la lista completa de muestras del día. Ojo: es un interruptor **global** para todos tus Atajos — es la protección de Apple contra que un atajo saque tu historial de salud en bloque. Con atajos escritos por ti el riesgo es bajo, pero tenlo presente si instalas atajos de terceros.

### 4. Añade los demás datos
Repite los pasos 1–3 por cada dato y alarga la URL del paso 4 con `&campo=`⟨variable⟩. Ejemplo con tres datos:

```
TU_URL/exec?token=arnold-2026-fxt-7391&activas=⟨var⟩&peso=⟨var⟩&fcReposo=⟨var⟩
```

Mismo patrón siempre — 3 acciones por dato: **Find Health Samples → Get Value (o Duration) → Set Variable**. Al final, una única acción *Get Contents of URL* con todos los campos.

**Añádelos de uno en uno y prueba cada vez.** Empieza por los de la primera tabla, que mandan un solo valor y no pueden romperse:

| Dato | Type (Find Health Samples) | Ajustes | Campo | El servidor hace |
|---|---|---|---|---|
| Peso | **Weight** | Latest First · Limit **1** | `peso` | el último |
| Pulso en reposo | **Resting Heart Rate** | Latest First · Limit **1** | `fcReposo` | media |
| Variabilidad | **Heart Rate Variability** | Latest First · Limit **1** | `vfc` | media |

Y cuando eso funcione, los de lista (cientos de muestras al día — aquí es donde aparecían los números monstruosos, así que ve con cuidado):

| Dato | Type | Ajustes | Detail | Campo | El servidor hace |
|---|---|---|---|---|---|
| Energía activa | **Active Calories** | Start Date *is today* · sin límite | Value | `activas` | suma |
| Pasos | **Step Count** | Start Date *is today* · sin límite | Value | `pasos` | suma |
| Pulso máx. cardio | **Heart Rate** | Start Date *is today* · sin límite | Value | `fcCardioMax` | máximo |
| Pulso medio cardio | *(la misma lectura de arriba)* | — | Value | `fcCardioMedia` | media |
| Sueño | **Sleep Analysis** | **End Date** *is today* | **Duration** | `sueno` | suma |

> **El sueño filtra por *End Date*, no Start Date:** anoche empezaste a dormir *ayer* (11 pm). Con Start Date *is today* el Atajo no encontraría nada. Con End Date entra todo lo que terminó esta mañana.
>
> **Pulso máx. y medio usan la MISMA lista:** puedes leer Heart Rate una sola vez, combinar el texto, y arrastrar esa misma variable a `fcCardioMax` y `fcCardioMedia` — el servidor saca el máximo de una y la media de la otra.

No pasa nada si algún dato falta o llega vacío: el servidor lo ignora y conserva lo que ya tenía de ese día. Tampoco importa el formato: acepta unidades (`620 kcal`), coma decimal (`69,2`), y el sueño lo entiende en horas, minutos o segundos (lo detecta por el tamaño del número).

### 5. Automatízalo
Shortcuts → pestaña **Automation** → **+** → **Time of Day** → una hora de la noche (ej. 22:00) → **Daily** → elige tu Atajo → desactiva **Ask Before Running**.

> ⚠️ **Limitación de iOS que hay que conocer:** los datos de Salud están cifrados mientras el iPhone está bloqueado, así que **si el teléfono está bloqueado a esa hora, el Atajo falla**. Elige una hora en la que sueles estar usando el móvil (ej. 22:00 en la cama, no las 3 de la madrugada).
>
> Si un día falla no pasa nada: la app tolera huecos. Para recuperarlo, ejecuta el Atajo a mano — añádelo a la pantalla de inicio o dile a Siri el nombre del Atajo y listo.

### 6. Compruébalo en la app
Abre la app → pestaña **Progreso** → tarjeta **Apple Watch · Salud**. Y en Entrenamiento, el panel de recuperación mostrará **"Tu cuerpo hoy"**.

### Qué hace la app con esto
- **Energía activa** → muestra tu gasto real del día (basal 1456 + activas) y el déficit verdadero. **La meta sigue fija en 1800 kcal**: el Watch sobreestima el gasto y "comerse" las calorías del ejercicio es la forma clásica de estancar un déficit.
- **Peso** → entra solo al registro y a la gráfica, sin teclearlo. Nunca pisa un peso que hayas escrito tú a mano ese día.
- **Sueño** → lo compara con las 7 h que indicó la nutricionista.
- **Pulso en reposo + variabilidad** → el panel de recuperación deja de contar días y te dice cómo viene tu cuerpo hoy comparado con **tu propia media** de 14 días.
- **Pulso del cardio** → indica si tus picos de HIIT llegan a tu techo habitual (usa tu propio máximo, no fórmulas por edad).

## Notas
- ⚠️ **Para quien edite el HTML:** al servir la página, Apps Script recorta todo lo que sigue a `//` dentro del JavaScript, **incluso dentro de textos entre comillas**. Por eso todas las URLs del código van partidas como `'https:/'+'/dominio...'` (nunca `//` juntos dentro de una cadena). Si se rompe esta regla, la app desplegada muestra `SyntaxError: Invalid or unexpected token` aunque el archivo local funcione perfecto.
- El token `arnold-2026-fxt-7391` protege tus datos; está en el HTML (`CLOUD_TOKEN`) y en el script (`TOKEN`). Si cambias uno, cambia el otro.
- La `CLOUD_URL` dentro del HTML debe ser tu URL `/exec`. Ya está puesta; solo cámbiala si algún día creas una implementación nueva con otra URL.
- Tus datos quedan en la celda A1 de la pestaña `datos`; en B1 verás la fecha de la última sincronización.
- La URL `/exec` es pública (quien la tenga puede abrir la app). Como es larga y aleatoria, el riesgo es bajo — no la compartas. Si quieres, se le puede poner una contraseña sencilla.
