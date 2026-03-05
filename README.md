# FiveM Profiler Analyzer

Una herramienta web para analizar profiler files de servidores FiveM e identificar scripts que causan hitches y lag.

## Características

- **Profiler Analyzer** — Sube y analiza archivos JSON del profiler de FiveM. Visualiza la timeline de ticks, top offenders (CPU HOG, SPIKE, HITCH DRIVER) y una tabla completa de scripts.
- **Crash Analyzer** — Analiza crash ZIP files de FiveM para identificar el módulo y tipo de excepción.
- **Top Script Offenders** — Agregado de todos los profiles guardados localmente. Muestra los scripts más problemáticos en tus servidores.
- **Top Crash Offenders** — Agregado de todos los crash reports guardados.
- **Base de datos local** — Todo se almacena en IndexedDB (en tu navegador) — no se envía nada a servidores externos.

## Tech Stack

| Rol | Tecnología |
|-----|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 5 |
| Estilos | Tailwind CSS |
| Base de datos local | Dexie.js (IndexedDB) |
| Archivos ZIP | JSZip |
| Íconos | Lucide React |
| Deploy | GitHub Pages (GitHub Actions) |

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Dev server con hot reload
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview
```

## Deploy a GitHub Pages

El deploy es automático al hacer push a la rama `main`. El workflow de GitHub Actions:
1. Instala dependencias
2. Construye el proyecto con el base URL correcto (`/<nombre-del-repo>/`)
3. Despliega a GitHub Pages

### Configuración necesaria en GitHub

1. Ve a tu repositorio → **Settings** → **Pages**
2. En **Source**, selecciona **GitHub Actions**
3. Haz push a `main` — el deploy se ejecuta automáticamente

## Cómo grabar un profile

1. En tu consola txAdmin, ejecuta: `profiler record 300`
2. Espera ~15 segundos a que termine
3. Ejecuta: `profiler saveJSON myprofile`
4. Descarga el archivo desde `resources/` de tu servidor
5. Súbelo en la pestaña **Profiler Analyzer**

> Graba mientras hay jugadores online para obtener resultados precisos.

## Privacidad

Toda la información se almacena **únicamente en tu navegador** (IndexedDB). Ningún archivo ni dato es enviado a servidores externos.
