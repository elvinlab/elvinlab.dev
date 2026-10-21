# Tareas frecuentes: paso a paso

Hoja de recetas para lo que se hace a mano y se suele olvidar. Cada receta es copiar y pegar; al final de cada una dice dónde está la guía completa. Todos los comandos corren desde la raíz del repositorio y con `mise exec --`. Versión en inglés: [HOW-TO.en.md](HOW-TO.en.md).

Regla de oro: **nada llega a producción sin un release** (un push a `main`, ver la receta 9) y **ningún cambio visible se publica sin su entrada en el changelog** (receta 8).

## Qué se actualiza y con qué frecuencia

| Qué | Dónde | Cuándo | Receta |
| --- | --- | --- | --- |
| Una nota nueva | `apps/web/src/content/drafts/` → `notes/` | Cada vez que publicás | 1 |
| Aviso por correo de esa nota o de un proyecto nuevo | `pnpm notify:note <slug>` / `pnpm notify:project <clave>` | Después de publicar y liberar | 2 |
| Notas de «Empieza aquí» | `startHere` en el frontmatter de 3 notas | Cuando cambia lo que querés destacar | 3 |
| Ranking «más activas» de `/notes/` | `pnpm pulse:snapshot` | Antes de cada release | 4 |
| Tarjeta «Ahora» de la portada | bloque `now` de `site.config.ts` (y `updatedAt`) | Cuando cambia tu foco | 5 |
| Proyectos (experimentos), sus imágenes y datos | `content/experiments.json` + `assets/experiments/<clave>/` | Cuando hay un proyecto nuevo o cambia | 6 |
| CV, estado de disponibilidad, experiencia, certificados, stack | `site.config.ts`, `experience.json`, `credentials.json` | Cuando cambia tu situación | 7 |
| Changelog | `content/changelog.json` | En cada cambio visible | 8 |
| Release | push a `main` | Cuando hay algo para publicar | 9 |
| Fechas legales | `legal.privacyUpdated` / `termsUpdated` | Solo si cambia el texto legal | ver `CONFIGURATION.md` 6.8 |
| Secretos (formulario, avisos) | Cloudflare + `.dev.vars` | Al rotarlos | ver `CONFIGURATION.md` 6.7 y `SUBSCRIPTION.md` |
| Dependencias y herramientas | `.mise.toml`, `package.json` | Cuando toca | ver `CONFIGURATION.md` 6.11 |

El mapa completo de «qué cambio y dónde» está en [`CONFIGURATION.md`](CONFIGURATION.md), sección 1.

## 1. Escribir y publicar una nota

```bash
mise exec -- pnpm new-post "Título de la nota"        # crea el borrador (no entra en git)
mise exec -- pnpm --filter web dev                    # verla en http://localhost:4321/notes/<slug>/
```

1. Completá el frontmatter y el registro de decisión (`decision:`) en `apps/web/src/content/drafts/<slug>/index.mdx`.
2. Revisión editorial obligatoria ([`NOTES.md`](NOTES.md), secciones 1.1, 1.2 y 11): el narrador es quien firma, nunca el asistente; verificá cada dato contra su fuente; leé el texto completo.
3. Ensayo y publicación (desde `develop` y con el árbol limpio):

```bash
mise exec -- pnpm publish-note <slug> --dry-run       # muestra qué haría
mise exec -- pnpm publish-note <slug>                 # mueve, fecha, changelog, build, commit, push y release
gh run watch                                          # la vía rápida de solo notas tarda 2-3 min
```

4. Comprobá en producción que la tarjeta y los comentarios aparecen.

Detalle: [`NOTES.md`](NOTES.md) (receta rápida y paso a paso).

## 2. Avisar por correo de una nota

Es manual a propósito. Solo después de que la nota esté en producción.

```bash
export SUBSCRIBE_ADMIN_TOKEN="$(cat ~/.config/elvinlab/subscribe-admin-token)"
mise exec -- pnpm notify:note <slug>                  # ensayo: cuenta destinatarios, no envía
mise exec -- pnpm notify:note <slug> --send           # envío real
```

- Cada persona recibe el aviso en su idioma; solo viaja el slug; no hay duplicados si repetís.
- Si el resultado dice `remaining` mayor que 0 (límite diario), repetí el comando al día siguiente.
- El token va solo por variable de entorno, nunca en un archivo del repositorio. Para rotarlo: [`SUBSCRIPTION.md`](SUBSCRIPTION.md), sección 6.

**Avisar de un proyecto nuevo** (después de liberarlo, receta 6 y 9): mismo flujo con `notify:project` y la clave de `experiments.json`.

```bash
mise exec -- pnpm notify:project <clave>              # ensayo (con SUBSCRIBE_ADMIN_TOKEN exportado)
mise exec -- pnpm notify:project <clave> --send       # envío real
```

El correo sale del propio experimento (título, descripción y enlace a su página) en los dos idiomas, cada suscriptor en el suyo; el tope diario es uno solo y repetir no duplica. Un proyecto sin nota propia no necesita una: no hace falta escribir nada más.

## 3. Cambiar «Empieza aquí»

Se marca en el frontmatter de las notas, no en la configuración.

1. En la nota que sale: quitá `startHere` y `startHereNote`.
2. En la nota que entra: agregá `startHere: 1` (o 2 o 3, único por idioma) y `startHereNote: "Por qué empezar por acá"` (obligatorio, máximo 120 caracteres).
3. `mise exec -- pnpm --filter web build` falla si hay duplicados, falta la razón o el número está fuera de rango.
4. Si marcás menos de 3, el resto se completa con las notas más recientes.

Detalle: [`NOTES.md`](NOTES.md), sección 3.1.

## 4. Actualizar el ranking de notas «más activas»

Lee las huellas de producción (un `SELECT` de solo lectura en D1 vía `wrangler`, con sesión iniciada) y las visitas de 30 días (consulta de solo lectura a Web Analytics). Corré esto **antes de cada release** y commiteá el resultado.

```bash
export CLOUDFLARE_ANALYTICS_TOKEN=...     # token «Account Analytics: Read»; solo en la shell, nunca en el repo
export CLOUDFLARE_ACCOUNT_ID=...          # o pasá --account <id>
mise exec -- pnpm pulse:snapshot --dry-run    # imprime sin escribir
mise exec -- pnpm pulse:snapshot              # reescribe apps/web/src/features/notes/lib/pulse-snapshot.ts
```

Sin token el comando se detiene a propósito; `--marks-only` lo salta y usa solo las huellas. Las visitas son estimaciones (Cloudflare muestrea).

## 5. Actualizar la tarjeta «Ahora» de la portada

En `apps/web/src/site.config.ts`, bloque `now`: editá `items` (1 a 3 filas, `kind` es `focus`, `building`, `exploring` o `learning`, texto en `es` y `en`, máximo 120 caracteres) y **subí `updatedAt`** a la fecha de hoy (`YYYY-MM-DD`). Sin `updatedAt` actualizado la tarjeta muestra una fecha vieja.

## 6. Agregar o editar un proyecto (experimento), con sus imágenes y datos

1. Datos: `apps/web/src/content/experiments.json`, una clave por proyecto. Solo `title`, `description` y `year` son obligatorios; el resto (`subtitle`, `problem`, `contribution`, `result`, `tags`, `publishedAt`, `status`, `url`, `repo`, `note`, `images`) es opcional.
2. Imágenes: capturas propias de 1280×800 (16:10) en `apps/web/src/assets/experiments/<clave>/`, nunca en `public/`, cada una con su `alt`.
3. Privacidad: no nombres ni enlaces repositorios privados; no anuncies proyectos que no existen.
4. Verificá: `mise exec -- pnpm test` · `pnpm typecheck` · `pnpm lint` · `pnpm verify`. Si cambiaste un esquema: `pnpm docs:config`.
5. Changelog (receta 8) y release (receta 9).

Detalle: [`PORTFOLIO.md`](PORTFOLIO.md), secciones 1, 3 y 7.

## 7. Actualizar el CV, la disponibilidad, la experiencia, los certificados y el stack

| Qué | Dónde |
| --- | --- |
| Enlaces al CV (uno por idioma), estado, «qué busco» | `site.config.ts` → `recruiter.cvUrl`, `recruiter.status`, `recruiter.lookingFor` (`available`, `openToWork`) |
| Titular, pitch, datos, zona horaria, idiomas, stack de `/me` | `site.config.ts` → `me.*` |
| Nombre, bio, rol, redes | `site.config.ts` → `identity` |
| Foto y avatar | archivos en `apps/web/src/assets/` (`photo.jpg`, `avatar.png`); en `site.config.ts` van solo los nombres de archivo |
| Experiencia laboral | `content/experience.json`: una clave por trabajo; sin `end` significa «actual» |
| Certificados y estudios | `content/credentials.json`: obligatorios `title`, `issuer`, `kind`, `year`; opcionales `month`, `url`, `credentialId`, `order`, `learnings`, `image` |

Si subís un CV nuevo, reemplazá el enlace de Drive en `cvUrl` (uno por idioma). Un valor inválido rompe el build y lista todos los problemas.

Detalle: [`PORTFOLIO.md`](PORTFOLIO.md) y [`CONFIGURATION.md`](CONFIGURATION.md), secciones 3, 4 y 6.

## 8. Anotar el cambio en el changelog

Cada cambio visible para quien visita o para quien desarrolla lleva una entrada, en inglés, **en el mismo trabajo que lo entrega**. En `apps/web/src/content/changelog.json` agregá una clave nueva:

```json
"clave-unica": {
  "date": "2026-10-21",
  "category": "added",
  "title": "Qué cambió, en una línea",
  "description": "Una o dos frases con el porqué y el efecto."
}
```

`category` es `added`, `changed`, `removed` o `fixed`. Antes de un release: `mise exec -- pnpm changelog:audit` (falla si un `feat`, `fix` o `perf` no la tiene) y `mise exec -- pnpm changelog:stamp` (fecha las entradas con el día del release). Las notas publicadas con `publish-note` ya la agregan solas.

## 9. Liberar a producción

Es una decisión tuya cada vez: un push a `main` despliega. `main` y `develop` tienen historias distintas, así que no se hace `git merge`:

```bash
git commit-tree 'develop^{tree}' -p origin/main -m "release: ..."   # commit con el árbol de develop
# adelantá main a ese commit, comprobá que `git diff main develop` esté vacío y empujá
gh run list --branch main --limit 1                                   # el CI corre una sola vez y despliega
curl -s https://elvinlab.dev/version.txt                              # debe mostrar el nuevo commit
```

Pasos exactos y cómo revertir: [`CONFIGURATION.md`](CONFIGURATION.md), sección 7. Antes: receta 4 (ranking) y receta 8 (auditoría del changelog).
