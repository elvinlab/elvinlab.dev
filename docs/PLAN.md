# Proyecto: Blog + Portafolio elvinlab

Contexto para Claude Code. Este documento resume decisiones ya tomadas — no son sugerencias a validar, son el punto de partida.

## Visión

Es el primer proyecto de la marca **elvinlab** (elvinlab.dev, nickname "elvinlab" en GitHub, dominio en Porkbun). Combina dos cosas: sección "about me" que funciona como portafolio, y un blog donde se documenta el proceso de construir los demás proyectos de elvinlab (razonamiento de decisiones, no tutoriales genéricos).

No es solo un rediseño: es también el terreno donde nace y se prueba `packages/core`, la base de diseño compartida que van a usar los demás proyectos (guías de juegos clásicos de PC, emulador J2ME con logros).

## Por qué desde cero (y no editar el sitio actual)

El sitio actual (elvinlab.dev, Astro) sigue funcionando y no está mal — se reconstruye a propósito para adquirir el hábito de preguntar, componente por componente: **¿esto es del blog o es de la base compartida?** Ese hábito no se adquiere retrofitteando código viejo.

## Qué se reutiliza del sitio actual

- **Contenido:** bio, descripciones de experiencia y proyectos, textos bilingües.
- **Setup de i18n** (la lógica bilingüe, reimplementada dentro de `core`).

Se descarta: la capa visual completa y la arquitectura de componentes actual.

## Deuda a corregir de una vez (aprovechando el rebuild)

- Acentos faltantes en textos viejos del portafolio.
- "Más de 3 años de experiencia" está desactualizado — la línea de tiempo arranca en 2020 y trabaja en BUO desde 2022. Actualizar al número real.
- Imágenes de stock/terceros usadas como portada de proyectos (ej. Discovering Owls, Eli Recomienda) — reemplazar por capturas propias del proyecto real.

## Estructura: monorepo

```
apps/web/       → el blog/portafolio
packages/core/  → base de diseño compartida
```

Sin publicar a npm, sin versionado semántico, sin changelog. Es un paquete interno del monorepo: un cambio en `core` se ve al instante en `apps/web`, sin proceso de release.

**Regla de construcción: nace en el proyecto, se mueve a `core` cuando se repite.** No diseñar el core por adelantado imaginando qué se va a necesitar — eso ya se decidió que es el error a evitar.

## Qué va en `core` desde el día uno (y nada más, por ahora)

1. **Tokens de diseño** — colores, tipografía, escala de espaciado, radios, sombras. Como variables CSS. Definir esto ANTES de escribir el primer componente — es el único punto donde sí conviene decidir por adelantado, porque es la identidad visual.
2. **Sistema de temas dark/light** — sobre esas mismas variables CSS, sin lógica de negocio.
3. **Infraestructura de i18n.**

Todo lo demás (navbar, tarjetas, tipografía de componentes, comentarios visuales, etc.) nace dentro de `apps/web`. Se mueve a `core` solo el día que un segundo proyecto real (guías de PC o el emulador J2ME) también lo necesite.

## Regla dura para `core`: presentación, nunca persistencia

Ningún componente de `core` hace `fetch` a un endpoint. Recibe datos por props y emite eventos — así ningún proyecto que use `core` queda casado a un backend concreto.

Ejemplo aplicado: si algún día se comparte un componente de comentarios, en `core` va solo el hilo visual y la caja de texto. Guardar, moderar y notificar es responsabilidad del proyecto (o del futuro hub de identidad), nunca de `core`.

## Contenido del blog

Los primeros posts son el propio proceso de decisión de qué construir: por qué se descartó el descargador de YouTube a MP3, por qué los blogs de micronicho con afiliados ya no rentan, cómo se aterrizó el sistema de logros del emulador J2ME. Es razonamiento de decisiones documentado, no tutoriales paso a paso.

- **Cadencia sostenible:** cada dos semanas. Semanal no se sostiene.
- **Extensión:** preferir posts cortos (~500 palabras) sobre una decisión concreta, en vez de piezas largas que nunca se terminan.

## Meta / condición de éxito

**Blog publicado con 3 posts en 6 semanas.**

Señal de alerta: si a las 6 semanas se sigue puliendo `core` sin nada publicado, es exactamente el riesgo que se identificó — quedarse atrapado en la arquitectura en vez de publicar.

## Qué viene después (no ahora, no es parte de este alcance)

- **Template del blog**, como subproducto: consume `core` como dependencia (nunca lo copia). Un solo template, no una colección. Sale de este mismo código una vez que ya demostró que funciona en producción.
- **Fin de semana de extracción**, después de publicar el blog: sacar `core` a su propio repo, con landing, documentación y el ritual completo de publicación (versionado, changelog, releases) que aquí adentro no aplica.
- **Posible versión comercial** del starter/generador con marca para agencias o freelancers — evaluar mucho más adelante, cuando `core` ya esté probado en 2-3 proyectos propios, no antes.

## Explícitamente fuera de alcance aquí

- Sistema de comentarios con backend/moderación — es del futuro hub de identidad compartido, no de este proyecto.
- Librería de componentes publicada de forma independiente — se extrae después de probada, no se diseña de antemano.
- Cualquier feature de los otros proyectos de elvinlab (presencia de Spotify, emulador, directorio de herramientas).

## Stack — resuelto (ver [ADR 0001](adr/0001-astro-tailwind-pnpm-monorepo.md) y `apps/web`)

> Histórico: así estaba planteado antes de confirmarse. Astro + React solo en islas + Tailwind v4 quedó fijado y el monorepo ya existe.

El sitio actual está en Astro. Por consistencia con el resto de elvinlab (el sitio de guías de PC también usa Astro + React solo en islas interactivas + Tailwind, con Vue evitado a propósito como quiebre del stack de trabajo diario en BUO), lo lógico es mantener esa misma combinación — pero no quedó fijado explícitamente para este rebuild. Confirmar antes de generar el andamiaje del monorepo.

---

## Decisiones agregadas (2026-09-27)

- **Nombre del blog:** Lab Notes — *by an eternal junior*. Ver [`BRAND.md`](BRAND.md#blog).
- **Rutas:** `elvinlab.dev` es el portafolio (muestra los últimos 3 posts), `elvinlab.dev/notes` el blog, `elvinlab.dev/notes/<slug>` cada post y `elvinlab.dev/devlog` queda reservado para un devlog futuro. Ruta en lugar de subdominio por SEO y un solo deploy.
- **Nombre del repo:** `elvinlab.dev`. El repo es del sitio; `core` solo vive aquí hasta su extracción.
- **Nombre del paquete:** `@elvinlab/core` desde el día uno, aunque no se publique. Los imports de `apps/web` no cambian el día que `core` se extraiga a su propio repo; el nombre de producto del repo futuro se decide en la extracción.
- **Propósito de `core`:** que otras personas puedan crear un blog o una landing con este estilo.
- **Distribución:** por GitHub, no por el registro público de npm. Se decide el mecanismo en la extracción (ver preguntas abiertas).
- **Regla de temas:** los tokens de [`BRAND.md`](BRAND.md#tokens-de-diseño) son el tema por defecto `theme-elvinlab`, no constantes. Marca, colores y tipografías se reemplazan en un solo archivo. Los componentes solo leen variables semánticas (`var(--brand-primary)`, `var(--surface)`), nunca un hex directo. Se comparte el lenguaje visual; la identidad cambia.
- **Coherencia con GitHub:** el perfil de GitHub y este sitio consumen la misma base de marca. `packages/core/src/tokens/tokens.json` es la única fuente de verdad para los tokens (`tokens.css` se genera con `packages/core/scripts/build-tokens.ts`).

## Preguntas abiertas

- [x] ¿Los posts se escriben en un solo idioma o se traducen todos? → Resuelto: un idioma por nota (ver "Decisiones 2026-09-30").
- [x] Confirmar el stack → Resuelto: [ADR 0001](adr/0001-astro-tailwind-pnpm-monorepo.md).
- [ ] Confirmar la escala de espaciado propuesta en `BRAND.md`.
- [ ] Mecanismo de distribución por GitHub al extraer `core`: dependencia git con tags (`github:elvinlab/<repo>#v1.0.0`, sin autenticación en repos públicos), GitHub Packages (requiere token incluso para paquetes públicos) o repositorio plantilla ("Use this template") para el starter.
- [x] Evaluar arrancar con una sola app y una carpeta `src/core/` en lugar del monorepo completo → Resuelto: se construyó el monorepo (`apps/web` + `packages/core`, [ADR 0003](adr/0003-screaming-architecture-and-core-boundary.md)).

## Decisiones 2026-09-30

- Orden de notas: la Nota 003 ("Why I rebuilt my site from scratch") se adelanta y se escribe en paralelo a la infra restante (T18, T19 UI, T20, T21); cadencia de una nota cada ~2 semanas desde ya.
- Definición de "live": exige cutover DNS (T22) a elvinlab.dev, hecho después de publicada la primera nota y con un mapa de redirects de las URLs viejas relevantes (hoy T22 no lo tiene).
- Congelamiento: hasta tener 3 posts publicados se congela el trabajo decorativo y de tooling (selector de fondos #41, shaders adicionales, gates de calidad nuevos, mirror .astro); solo se toca si rompe CI o bloquea una nota. El backlog queda etiquetado post-launch.
- Idioma de posts: un idioma por nota (ES por defecto); la traducción es opcional vía translationOf y nunca bloquea publicar.
