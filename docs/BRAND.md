# elvinlab — Base de marca

Versión aprobada de la base de marca. El borrador editable vive en un documento de Claude; cuando cambie, se actualiza este archivo.

## Propósito

Este documento es la única fuente de verdad de la marca elvinlab: qué se dice y cómo se ve. El perfil de GitHub, elvinlab.dev y LinkedIn consumen de aquí, nunca al revés.

El sistema visual no se inventa: se formaliza el que ya existe en el perfil de GitHub (banner, tarjetas, línea de tiempo). Cuando exista `packages/core`, las secciones de tokens se convierten en `tokens.json` y dejan de mantenerse a mano.

Regla de cambio: primero se edita este documento, después se aplica a cada superficie.

## Narrativa

La línea de posicionamiento es una sola y se usa igual en todas partes: **Full-stack engineer building with AI agents.** El resto de los textos la desarrollan, nunca la contradicen.

| Pieza | Texto canónico (en inglés) | Dónde se usa |
| --- | --- | --- |
| Posicionamiento | Full-stack engineer building with AI agents. | Titular del README, hero del sitio, titular de LinkedIn |
| Sublínea | Clean architecture · Fast systems · Production-ready cloud | Bajo el titular |
| Bio corta (máx. 160 caracteres) | Full-stack Software Engineer · AI agents & workflows · Clean architecture · Performance. Writing at elvinlab.dev | Bio de GitHub, X |
| Roles rotativos | Full-Stack Engineering · AI Agents & Workflows · Software Architecture · Performance & Optimization | Banner animado, hero del sitio |

### Los cuatro pilares

1. **AI Agents & Workflows** — orquestación multi-agente, routing de modelos, memoria persistente. Prueba: [`agentic-dev-setup`](https://github.com/elvinlab/agentic-dev-setup).
2. **Software Architecture** — límites claros, dominios desacoplados, código predecible.
3. **Full-Stack Engineering** — de punta a punta y sin casarse con un framework.
4. **Performance & Optimization** — profiling, cuellos de botella, sistemas rápidos y baratos de operar.

### Voz

- Primera persona, directa y concreta. Números y nombres, no adjetivos.
- El blog documenta decisiones y su razonamiento, no tutoriales genéricos.
- Atemporal: nada que dependa de "en qué estoy trabajando este mes". Única excepción: la sección **Ahora** del inicio (decidida 2026-10-02, a pedido del dueño). Es la única superficie con actividad fechada: muestra siempre su fecha real de actualización, lleva como máximo tres entradas y se oculta entera si no hay contenido vigente. Identidad, bio, notas y proyectos siguen siendo atemporales.
- Sin frameworks como identidad: se nombran como herramientas, no como etiqueta profesional.
- Humor con medida: el abanico y el footer retro son la firma; no compiten con el contenido.
- Nunca anunciar proyectos que no existen todavía.

### Datos duros

| Dato | Valor |
| --- | --- |
| Nombre | Elvin González (elvinlab) |
| Experiencia | Desde 2020: el sitio calcula los años a partir de ese año (mismo punto de partida en GitHub y LinkedIn) |
| Ubicación | Costa Rica |
| Sitio | [elvinlab.dev](https://elvinlab.dev) |
| GitHub | [github.com/elvinlab](https://github.com/elvinlab) |
| LinkedIn | [linkedin.com/in/elvinlab](https://www.linkedin.com/in/elvinlab) |
| X | [@elvinlabweb](https://x.com/elvinlabweb) |
| Contacto | Formulario en [elvinlab.dev/contact](https://elvinlab.dev/contact); el correo nunca se publica en texto plano |

### Blog

El blog se llama **Lab Notes**, con el subtítulo *by an eternal junior*, y vive en `elvinlab.dev/notes`. La home (`elvinlab.dev`) es el portafolio y muestra los últimos 3 posts.

| Ruta | Contenido |
| --- | --- |
| `elvinlab.dev` | Portafolio: quién soy, proyectos destacados, últimos 3 posts |
| `elvinlab.dev/notes` | Lab Notes — by an eternal junior: todos los posts |
| `elvinlab.dev/notes/<slug>` | Cada post |
| `elvinlab.dev/en/notes/<slug>` | Detalle de una nota escrita en inglés; no hay índice en inglés |
| `elvinlab.dev/devlog` | Reservado a futuro: devlog numerado de proyectos (guides, emulador J2ME) |

Contenido del blog: experiencia con tecnología, proyectos, aprendizajes, cómo me siento y cómo me adapto, consejos, razonamiento de decisiones. Se prefirió una ruta sobre un subdominio: un subdominio divide la autoridad SEO y exige otro deploy.

### Idioma

La interfaz del sitio es bilingüe (inglés y español). El README de GitHub y los textos canónicos van en inglés.

- [x] ¿Los posts del blog se escriben en un solo idioma o se traducen todos? → Resuelto: un idioma por nota, ES por defecto; la traducción es opcional vía `translationOf` (ver [`PLAN.md`](PLAN.md#decisiones-2026-09-30)).

## Tokens de diseño

Los valores salen tal cual de los generadores del perfil (`tools/banner.py` y `tools/sections.py` en [elvinlab/elvinlab](https://github.com/elvinlab/elvinlab)). Lo marcado como **propuesto** todavía no existe en GitHub y se decide aquí.

### Regla de temas

Estos valores son el tema por defecto, `theme-elvinlab`, no constantes. `@elvinlab/core` se usará para que otros creen blogs y landings con este estilo, así que marca, colores y tipografías deben poder reemplazarse en un solo archivo.

- Los componentes solo leen variables semánticas (`var(--brand-primary)`, `var(--surface)`), nunca un hex directo.
- Lo que se comparte es el lenguaje visual (grilla, pulsos, bordes con luz, resplandores); lo que cambia es la identidad (colores, fuentes, logo).

### Color de marca

| Token | Valor | Uso |
| --- | --- | --- |
| `brand.violet` | `#8b5cf6` | Color primario, inicio del gradiente |
| `brand.cyan` | `#06b6d4` | Acento, prompts, pulsos de datos |
| `brand.pink` | `#ec4899` | Acento de énfasis: cursor, "ahora", modelo local |
| `gradient.brand` | violeta → cian (55 %) → rosa | Nombre, títulos destacados, bordes, barra inferior |

### Superficies por tema

| Token | Oscuro | Claro |
| --- | --- | --- |
| `bg.start` | `#07070f` | `#fbfbff` |
| `bg.end` | `#0f0b1f` | `#eef0ff` |
| `surface.start` | `#0f0b1f` | `#faf8ff` |
| `surface.end` | `#0a1220` | `#f2fbfe` |
| `text.primary` | `#e6edf3` | `#0d1117` |
| `text.muted` | `#8b949e` | `#57606a` |
| `border` | `#30284d` | `#c9c3ee` |

Inconsistencia a resolver: en modo claro el banner usa `#c9c3ee` como borde y las tarjetas `#d8d0f5`. Propuesta: unificar en `#c9c3ee`.

### Tipografía

| Rol | Familia | Pesos | Tamaños en uso |
| --- | --- | --- | --- |
| Display (títulos de nota y de tarjeta) | Space Grotesk | 700 | 24–27 px títulos; 58–64 px nombre en los banners |
| Texto | Space Grotesk | 400, 500 | 16–18 px |
| Mono (números de nota, prompts, código) | JetBrains Mono | 400, 600, 700 | 12–16 px; en el sitio no se usa para etiquetas en mayúsculas |
| Display pixelado (titular del hero, títulos de sección) | Pixelify Sans | 600 (variable) | Según el preset `appearance`: `minimal` hero 32 px en teléfono y 44 px desde `md`, títulos de sección 20 px; `full` (el de este sitio desde 2026-10-02, escala reducida y aprobada ese día) hero 32 px en teléfono y 52 px desde `md`, títulos de sección 22 px |
| Favicon | Terminal de Linux pixelada (ventana gris azulado con tres puntos, prompt `>` cian y cursor rosa), 16×16 píxeles, sin el violeta saturado | Pestaña del navegador (`favicon.svg` y `favicon.ico`) |
| Banda de suscripción | Formulario de correo con borde punteado de 1 px (como las líneas divisorias), sobre pixelado rosa (9×7) como único acento, etiqueta visible y botón violeta que se hunde 1 px al pulsar; el sobre da un salto de dos pasos solo al pasar el cursor o enfocar | Footer de todas las páginas cuando la suscripción está activa, salvo `/subscribe/*` y `/me`; es el único lugar de la suscripción; sin sombras duras, sin bucle, quieta con `prefers-reduced-motion` |
| Página de suscripción | Primera impresión de quien recibe el enlace: sobre pixelado rosa (9×7) como único acento, eyebrow mono en gris, titular corto en la fuente de pantalla (el uso permitido: texto corto y grande), subtítulo en la fuente de texto, el mismo formulario de la banda en una tarjeta de borde punteado de 1 px, tres puntos de valor con viñetas cuadradas grises (no una cuadrícula de tarjetas) y la última nota publicada en su idioma; sin imágenes de stock, cifras que caduquen, testimonios ni urgencia | `/subscribe/` y `/en/subscribe/`; la banda del footer no aparece aquí; indexable y en el sitemap; el sobre salta dos pasos solo al pasar el cursor o enfocar; sin sombras duras, sin bucle, quieta con `prefers-reduced-motion` |
| Páginas de confirmar y darse de baja | Comparten el aspecto de la banda: tarjeta centrada con borde punteado de 1 px, un icono pixelado rosa como único acento (sobre mientras espera, check al terminar, exclamación si el enlace no es válido o no está disponible), título en la fuente de pantalla, botón violeta y enlace discreto a las notas; el sobre da el mismo salto de dos pasos | `/subscribe/confirm/` y `/subscribe/unsubscribe/` (es y en); sin sombras duras ni gradientes, sin bucle, quieta con `prefers-reduced-motion` |
| Botón de volver arriba | Cuadrado de 44 px, borde discontinuo de 1 px como la banda de suscripción, fondo de tarjeta y una flecha pixelada rosa (rejilla de 9x9 celdas a 2 px, el único acento), sin sombras duras | Todas las páginas, abajo a la derecha con 16 px de margen; solo aparece pasados unos 800 px al subir (misma lógica que la barra) y se oculta al bajar o arriba del todo; sobre el pie de página nunca tapa un control; la flecha salta dos pasos hacia arriba al pasar el cursor o enfocar (por pasos, sin bucle) y aparece y desaparece por pasos; sin movimiento con `prefers-reduced-motion`; oculto al imprimir; se esconde solo unos 2,5 s después de dejar de hacer scroll (salvo si está en uso o al final de la página, sobre el footer) |
| Firma retro | Press Start 2P | 400 | Wordmark del navbar, firma del footer y página 404 |

Todas desde [Fontsource](https://fontsource.org), autoalojadas; nunca desde un CDN en tiempo de ejecución.

**Cara pixelada de display (decisión del 2026-10-01).** Pixelify Sans es una segunda cara pixelada, más legible que Press Start 2P, que se probó en pantalla y el propietario del sitio decidió conservar, titular del hero incluido. Se expone como el token de fuente `pixel` del tema por defecto (`font-pixel`), nunca como una familia escrita en un componente.

- **Dónde va:** el titular del hero de la home y los títulos de sección con barra de acento (también los de `/me`).
- **Dónde nunca va:** párrafos, prosa de las notas, títulos de nota, navbar, formularios ni código. Regla general: las caras pixeladas son solo para texto corto y grande.
- **Press Start 2P** sigue siendo la marca (wordmark del navbar, firma del footer, 404); Space Grotesk sigue siendo el texto y la interfaz; JetBrains Mono, el código y los números de nota.
- **Límite conocido:** la `e` pixelada pierde legibilidad en tamaños grandes. Con la escala `minimal` (hero de 32 y 44 px) se juzgó aceptable en una revisión visual; en `full` (36 y 60 px) el límite sigue vigente.

### Variantes accesibles

Los colores de marca se mantienen, pero el texto y los rellenos usan estas variantes para cumplir WCAG AA. Las reglas de aplicación están en [DESIGN.md](DESIGN.md).

| Uso | Oscuro | Claro | Motivo |
| --- | --- | --- | --- |
| Botón con texto blanco | `#7c3aed` | `#7c3aed` | 5.7:1; `#8b5cf6` falla AA (4.2:1) |
| Primario (enlaces, íconos) | `#a78bfa` | `#6d28d9` | Contraste sobre tarjeta |
| Cian (texto) | `#22d3ee` | `#155e75` | `#06b6d4` y `#0e7490` fallan sobre banner claro (AA 4.5:1) |
| Rosa (texto, cursor) | `#ec4899` | `#be185d` | Contraste sobre fondo claro |
| Texto secundario | `#c3c9d4` | `#30363d` | Jerarquía legible |
| Silenciado | `#8b949e` | `#57606a` | ≥4.5:1 sobre tarjeta |
| Tarjeta | `#121022` | `#ffffff` | Superficie sin bordes |
| Página | `#07070f` | `#eef0ff` | Fondo |

### Forma, espacio y movimiento

| Token | Valor | Estado |
| --- | --- | --- |
| `radius.lg` | 18 px (banner, tarjetas) | En uso |
| `radius.md` | 14 px (cajas de íconos) | En uso |
| `radius.pill` | 9999 px (pastillas, badges) | En uso |
| `space.*` | Base 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 | Propuesto (24 y 32 ya se usan) |
| `grid.size` | 32 px, línea 0.5 px al 35 % | En uso |
| `glow.opacity` | 0.16–0.28 (gradiente radial, sin sombras duras) | En uso |
| `motion.pulse` | 4 s lineal, infinito | En uso |
| `motion.border` | 7 s lineal (luz que recorre el borde) | En uso |
| `motion.blink` | 1 s por pasos (cursor) | Sin uso visible; los acentos de cursor son estáticos en todas las páginas |
| `motion.reduce` | Todas las animaciones se detienen con `prefers-reduced-motion` | Obligatorio |

## Motivos visuales y reglas de uso

La identidad es "laboratorio de IA sobre fondo oscuro": pocos elementos, siempre los mismos, con movimiento sutil.

| Motivo | Qué es | Dónde va |
| --- | --- | --- |
| Gradiente de marca | Violeta → cian → rosa | Nombre, años de la línea de tiempo, bordes activos, barra de 4 px al pie de los banners |
| Grilla de fondo | Cuadrícula de 32 px, casi invisible | Fondos de banners y hero |
| Red de nodos con pulsos | Nodos conectados; los datos viajan por las líneas | Banner principal, diagramas de arquitectura |
| Borde con luz | Un tramo de gradiente recorre el borde de la tarjeta | Tarjetas destacadas (máx. una fila por página) |
| Resplandor | Gradiente radial en una esquina | Tarjetas y hero; nunca sombras duras |
| Prompt de terminal | `// comentario`, `>` y cursor rosa estático | Saludo y títulos técnicos; el acento es discreto y no parpadea |
| Icono de marca | La terminal pixelada del favicon, 32 px en la barra y 16 px en el footer (cada celda de la cuadrícula de 16 mide un número entero de píxeles), junto al nombre | Barra de navegación y footer; estático en reposo (el parpadeo se descartó porque robaba el foco), y solo al pasar el cursor o enfocar se inclina unos grados; sin movimiento con `prefers-reduced-motion`. El corazón 8-bit rosa queda solo en el botón de huella, cuyas animaciones avanzan por pasos |
| Firma retro | Abanico arriba y GIFs de los 90 al pie | Solo README de GitHub y footer del sitio |

### Sí

- Un solo acento dominante por bloque; el gradiente completo solo en piezas protagonistas.
- Mismo componente en oscuro y claro, cambiando solo tokens de superficie y texto.
- Etiquetas en JetBrains Mono y mayúsculas; títulos de nota y de tarjeta en Space Grotesk; titular del hero y títulos de sección en Pixelify Sans.
- Capturas propias de los proyectos, nunca imágenes de stock.

### No

- Nada de badges genéricos mezclados con piezas propias (se ve a plantilla).
- Nada de tablas con bordes grises como elemento de diseño.
- Nada de estadísticas automáticas de terceros que puedan congelarse o caerse.
- Nada de animaciones que no respeten `prefers-reduced-motion`.

## Plan de sincronización

Un solo archivo, `packages/core/tokens.json`, alimenta las dos superficies: el sitio lo convierte en variables CSS y los generadores del README lo leen antes de dibujar los SVG.

1. **Sitio (elvinlab.dev):** un script de build genera `tokens.css` con variables por tema (`:root` y `[data-theme="light"]`).
2. **README de GitHub:** `tools/build.sh` del repo `elvinlab` descarga `tokens.json` desde la rama `main` de este repo y reemplaza las constantes hardcodeadas de `banner.py` y `sections.py`.
3. **Textos:** la tabla de narrativa se copia a `packages/core/i18n` como strings canónicos; bio de GitHub y LinkedIn se actualizan a mano desde ahí.

### Antes de arrancar el sitio

- [ ] Aprobar este documento (narrativa y tokens).
- [ ] Unificar el borde claro en `#c9c3ee` en los generadores del perfil y regenerar los SVG.
- [x] Decidir el idioma de los posts → resuelto en [`PLAN.md`](PLAN.md#decisiones-2026-09-30).
- [ ] Confirmar la escala de espaciado propuesta.

### Cuando exista `packages/core`

- [ ] Crear `tokens.json` con estos valores.
- [ ] Hacer que los generadores del perfil lean ese archivo en lugar de constantes.
- [ ] Revisar GitHub, sitio y LinkedIn contra la tabla de narrativa.
