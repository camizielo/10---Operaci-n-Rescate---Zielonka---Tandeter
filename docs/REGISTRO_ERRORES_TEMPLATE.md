# Informe de Errores — Operación Rescate II

## Registro de errores

| N° | Archivo | Problema encontrado | Cómo lo detectaron | Solución aplicada |
|----|---------|---------------------|---------------------|--------------------|
| 1 | src/app.js | Faltaba `app.use(express.json())`. `req.body` llegaba `undefined` en cualquier POST/PUT | Se probó `POST /register` con Postman/curl y tiró 500: *"Cannot destructure property 'name' of 'req.body'"* | Se agregó `app.use(express.json())` antes de montar las rutas |

| 2 | src/app.js | La ruta de auth estaba montada como `/api/loginn` (typo) | Se leyó el código y se probó la ruta documentada, daba 404 | Se corrigió a `/api/auth` |

| 3 | src/app.js | `adminRoutes` estaba montado en `/api/users` (mismo prefijo que `userRoutes`), mezclando endpoints de usuario normal con los de admin | Revisión de rutas: quedaba `/api/users/all` en vez de algo propio de admin | Se montó en su propio prefijo `/api/admin` |

| 4 | src/utils/token.js | `module.export = {...}` (sin la "s" final). CommonJS no reconoce esa propiedad, así que `signToken` se exportaba como `undefined` | Al intentar loguear/registrar, Node tiraba `TypeError: signToken is not a function` | Se corrigió a `module.exports` |

| 5 | src/utils/token.js | La variable de entorno se leía como `process.env.JWT_SECRETT` (con doble T), no coincidía con `JWT_SECRET` del `.env` | Comparando `.env` contra el código | Se corrigió el nombre de la variable |

| 6 | src/utils/token.js | El token expiraba en `"2s"` (2 segundos) | Se generaba un token y a los pocos segundos las rutas protegidas ya lo rechazaban como expirado | Se cambió a `"2h"` |

| 7 | src/utils/token.js | El payload del JWT solo llevaba `role`, sin `id` de usuario | `getProfile` buscaba `users.find(u => u.id === req.user.id)` y siempre daba `undefined` porque `req.user.id` no existía | Se agregó `id: user.id` al payload |

| 8 | src/middleware/authMiddleware.js | Se usaba `jwt.decode(token)` en vez de `jwt.verify(token, secret)`. `decode` NO valida la firma, solo lee el contenido | Se armó un token con `role: "admin"` firmado con cualquier clave (o sin firma válida) y el middleware lo aceptaba igual | Se reemplazó por `jwt.verify()` dentro de un `try/catch` |

| 9 | src/middleware/authMiddleware.js | La condición `if (!token \|\| decoded)` estaba invertida: si NO había token, dejaba pasar como `"guest"` en vez de rechazar | Se pidió una ruta protegida sin header `Authorization` y respondía 200 en vez de 401 | Se reescribió la lógica: sin token → 401; token inválido → 403 (catch de `jwt.verify`) |

| 10 | src/routes/userRoutes.js | En `GET /me` el middleware estaba después del controller: `router.get("/me", getProfile, authMiddleware)` | `getProfile` se ejecutaba primero y crasheaba leyendo `req.user.id` porque `req.user` todavía no existía | Se invirtió el orden: `router.get("/me", authMiddleware, getProfile)` |

| 11 | src/routes/adminRoutes.js | `GET /all` no tenía ningún middleware de autenticación ni de rol. Cualquiera podía listar todos los usuarios | Se llamó a la ruta sin token y devolvía la lista igual | Se agregó `authMiddleware` + un middleware `isAdmin` que verifica `req.user.role === "admin"` |

| 12 | src/controllers/userController.js | `updateMe` tomaba el id a modificar de `req.body.userId` si venía, en vez de usar siempre `req.user.id` (falla de autorización tipo IDOR: un usuario podía editar el perfil de cualquier otro solo mandando su id) | Se logueó como usuario común y se mandó `{ "userId": "1", "name": "hackeado" }`, y modificaba al usuario 1 (admin) | Se eliminó la lectura de `req.body.userId`; ahora siempre se usa `req.user.id` |

| 13 | src/controllers/authController.js (`register`) | Faltaba `return` después de responder 400 por datos faltantes, así que el código seguía ejecutándose después de haber respondido | Con datos incompletos, a veces el server tiraba error de "headers already sent" | Se agregó `return` en la respuesta 400 |

| 14 | src/controllers/authController.js (`register`) | Cuando el email ya existía, respondía `200` en vez de un código de error | Se registró dos veces el mismo email y el status era 200 (éxito), poco claro para el cliente | Se cambió a `409 Conflict` |

| 15 | src/controllers/authController.js (`login`) | Faltaba `return` cuando el usuario no existía; el código seguía y llamaba `bcrypt.compare(user.password, ...)` con `user` en `undefined`, lo cual crashea | Login con un email inexistente tiraba 500 | Se agregó `return` después de la respuesta cuando `!user` |

| 16 | src/controllers/authController.js (`login`) | `bcrypt.compare(user.password, password)` tenía los argumentos invertidos. La firma correcta es `compare(textoPlano, hash)` | Con la 
contraseña correcta, el login igual fallaba (`match` siempre `false`) | Se invirtieron los argumentos: `bcrypt.compare(password, user.password)` |

| 17 | src/controllers/authController.js (`login`) | Faltaba `return` tras la respuesta 401 por contraseña incorrecta, y además el caso de usuario inexistente respondía `200` en vez de `401` | Se probaron credenciales inválidas y el status/código de respuesta era inconsistente | Se agregó `return` y se unificaron ambos casos en `401 Unauthorized` |

| 18 | authController, userController, adminController | Todas las respuestas (`register`, `login`, `getProfile`, `updateMe`, `listUsers`) devolvían el objeto de usuario completo, incluyendo el **hash de la contraseña** | Se inspeccionó el JSON de respuesta de cada endpoint y aparecía el campo `password` con el hash bcrypt | Se excluye `password` del objeto antes de responder (`const { password, ...safeUser } = user`) en cada controller |

## Explicación técnica y validación

### 1. Body parser ausente (#1)
**Qué ocurría:** cualquier `POST`/`PUT` con JSON llegaba con `req.body === undefined`.
**Por qué:** Express no parsea el body automáticamente; hace falta el middleware `express.json()`.
**Solución:** se agregó antes de las rutas.
**Validación:** `POST /api/auth/register` con body JSON ahora responde `201` con el usuario creado.

### 2-3. Rutas mal montadas (#2, #3)
**Qué ocurría:** `/api/loginn` era inaccesible desde el nombre esperado, y las rutas de admin quedaban mezcladas con las de usuario.
**Por qué:** error de tipeo y mal criterio de organización de rutas.
**Solución:** `/api/auth` para login/registro, `/api/admin` para administración.
**Validación:** `curl -i http://localhost:3000/api/auth/login` responde (antes daba 404).

### 4-7. Generación del JWT rota (#4, #5, #6, #7)
**Qué ocurría:** el archivo `token.js` en la práctica no exportaba nada usable, usaba una variable de entorno con nombre erróneo, generaba tokens que expiraban en 2 segundos y no incluía el `id` del usuario en el payload.
**Por qué:** eran varios errores de tipeo apilados uno sobre otro (`module.export`, `JWT_SECRETT`) más dos decisiones de diseño incorrectas (expiración de 2s, payload incompleto).
**Solución:** se corrigieron los typos, se subió la expiración a 2h y se agregó `id` al payload.
**Validación:** se decodificó el JWT devuelto por `/login` y contiene `{ id, role, iat, exp }` correctos; sigue siendo válido varios minutos después.

### 8-9. Middleware de autenticación no validaba nada (#8, #9)
**Qué ocurría:** esto era el error más serio del proyecto. `jwt.decode()` solo *lee* el contenido de un token sin chequear la firma — es como leer el nombre en un carnet sin fijarse si el carnet es trucho. Además, la condición estaba invertida: si no mandabas ningún token, el middleware te dejaba pasar igual como invitado.
**Por qué:** confusión entre `jwt.decode` (no verifica) y `jwt.verify` (sí verifica), más un error de lógica en el `if`.
**Solución:** se usa `jwt.verify(token, secret)` dentro de un `try/catch`; sin token → 401, token con firma inválida → 403.
**Validación:** se armó a mano un JWT con `role: "admin"` pero sin la firma correcta, y ahora `GET /api/admin/all` lo rechaza con 403. Antes de la corrección, ese mismo token forjado daba acceso.

### 10-12. Rutas y autorización (#10, #11, #12)
**Qué ocurría:** el middleware de auth corría después del controller en `/me` (no servía de nada), la ruta de admin no pedía ni token ni rol, y cualquier usuario logueado podía editar el perfil de otro pasando su `id` por body.
**Por qué:** orden incorrecto de argumentos en `router.get`, falta de middleware en `adminRoutes`, y uso de un dato controlado por el cliente (`req.body.userId`) para decidir qué registro modificar en vez de confiar solo en el usuario autenticado (`req.user.id`).
**Solución:** se reordenó el middleware, se protegió `/api/admin/all` con `authMiddleware` + chequeo de rol, y `updateMe` ignora cualquier `userId` del body.
**Validación:** un usuario común probó mandar `{ "userId": "1", ... }` y solo se modificó su propio perfil (id 2), nunca el del admin (id 1).

### 13-17. Control de flujo y códigos HTTP en authController (#13-#17)
**Qué ocurría:** faltaban varios `return` después de enviar una respuesta, lo que hacía que el código siguiera ejecutándose (causando crashes o respuestas duplicadas), los argumentos de `bcrypt.compare` estaban invertidos (por lo que el login nunca funcionaba aunque la contraseña fuera correcta), y algunos casos de error devolvían `200` en vez de `400`/`401`/`409`.
**Por qué:** son errores clásicos de no cortar la ejecución de la función después de un `res.json(...)`, y de invertir el orden de los parámetros de `bcrypt.compare(datoPlano, hash)`.
**Solución:** se agregaron los `return` faltantes, se corrigió el orden de argumentos de `bcrypt.compare`, y se ajustaron los códigos HTTP.
**Validación:** login con contraseña correcta → 200 y token válido; con contraseña incorrecta → 401 sin crash; registro con datos faltantes → 400; registro de email repetido → 409.

### 18. Exposición del hash de contraseña (#18)
**Qué ocurría:** cada endpoint que devolvía un usuario incluía también el hash bcrypt de su contraseña en el JSON.
**Por qué:** los controllers devolvían el objeto `user` completo tal cual estaba guardado en la "base de datos", sin filtrar campos sensibles.
**Solución:** se excluye el campo `password` antes de responder en todos los controllers.
**Validación:** se inspeccionaron las respuestas de `/register`, `/login`, `/me` (GET y PUT) y `/api/admin/all`; ninguna incluye ya el campo `password`.

## Cómo se probó el proyecto completo

Se levantó el servidor y se probó con `curl` (equivalente a Postman) la secuencia completa:

1. `POST /api/auth/register` con datos válidos → `201`
2. `POST /api/auth/register` con datos incompletos → `400`
3. `POST /api/auth/login` con credenciales correctas → `200` + token
4. `POST /api/auth/login` con contraseña incorrecta → `401`
5. `GET /api/users/me` sin token → `401`
6. `GET /api/users/me` con token válido → `200` con el perfil (sin password)
7. `GET /api/admin/all` con token de usuario común → `403`
8. `GET /api/admin/all` con un token forjado con `role: admin` pero sin firma válida → `403`
9. `PUT /api/users/me` intentando mandar `userId` de otro usuario en el body → solo modifica el perfil propio

Los ocho puntos requeridos por la consigna (registro, login, JWT válido, acceso solo con token válido, rechazo sin token, rechazo de token inválido, códigos HTTP correctos) quedaron verificados.
