# Operación De Datos

## Objetivo

Esta guía resume el flujo recomendado para respaldar, sincronizar y restaurar
los archivos JSON operativos del proyecto usando `Upstash`.

## Requisitos

- Tener `UPSTASH_REDIS_REST_URL` en `.env.local`
- Tener `UPSTASH_REDIS_REST_TOKEN` en `.env.local`
- Ejecutar los comandos desde la raíz del proyecto

## Storage De Imágenes En Producción

Las fotos subidas por usuarios no deben depender del filesystem de `Vercel`.
Para habilitar reseñas con imagen en producción, conecta un store de `Vercel Blob`
al proyecto `malo-fragances`. Al hacerlo, `Vercel` agregará la variable
`BLOB_READ_WRITE_TOKEN` al proyecto.

Flujo recomendado:

1. En `Vercel`, abre el proyecto `malo-fragances`.
2. Entra a `Storage`.
3. Crea un store de tipo `Blob` para `Preview` y `Production`.
4. Verifica que aparezca `BLOB_READ_WRITE_TOKEN` en las variables del proyecto.
5. Si quieres probarlo en local, ejecuta `vercel env pull .env.local`.

Con esta configuración:

- `Upstash` seguirá cubriendo `data/*.json`
- `Vercel Blob` cubrirá `uploads/*`
- La app volverá a habilitar automáticamente las fotos en reseñas en producción

## Datos Cubiertos

El script `scripts/maintenance.mjs` contempla estos archivos:

- `data/perfumes.json`
- `data/customers.json`
- `data/orders.json`
- `data/checkout-orders.json`
- `data/reviews.json`
- `data/suggestions.json`
- `data/sales.json`

## Atajos Con Npm

También puedes usar estos atajos desde `package.json`:

```bash
npm run data:status
```

```bash
npm run data:sync
```

```bash
npm run data:pull
```

```bash
npm run data:backup-sync
```

## Flujo Recomendado

### 1. Revisar Estado

Usa este comando para comparar si cada archivo existe en local y en `Upstash`:

```bash
npm run data:status
```

### 2. Crear Respaldo Y Sincronizar

Este es el flujo recomendado para mantenimiento normal. Primero crea un respaldo
local en `backups/` y después sincroniza los JSON a `Upstash`.

```bash
npm run data:backup-sync
```

Para sincronizar solo un archivo:

```bash
npm run data:backup-sync -- --file customers.json
```

Para incluir `public/uploads/` solo en el respaldo:

```bash
npm run data:backup-sync -- --uploads
```

### 3. Descargar Desde Upstash

Si necesitas reconstruir tu carpeta `data/` desde el estado remoto:

```bash
npm run data:pull
```

Para descargar solo un archivo:

```bash
npm run data:pull -- --file customers.json
```

## Respaldo Y Restauración Local

Crear respaldo manual:

```bash
node scripts/maintenance.mjs backup
```

Crear respaldo manual incluyendo uploads:

```bash
node scripts/maintenance.mjs backup --uploads
```

Restaurar desde un respaldo:

```bash
node scripts/maintenance.mjs restore --from backups/AAAA-MM-DD_HHMMSS
```

Restaurar incluyendo uploads:

```bash
node scripts/maintenance.mjs restore --from backups/AAAA-MM-DD_HHMMSS --uploads
```

## Política Recomendada

- Mantener `data/perfumes.json` versionado en Git como catálogo base.
- Mantener fuera de Git los datos operativos o sensibles.
- Sincronizar a `Upstash` después de cambios relevantes en clientes, pedidos,
  reseñas, ventas o sugerencias.
- Usar `backup-sync-upstash` como rutina normal antes de cambios manuales.
- Usar `pull-upstash` cuando necesites reconstruir un entorno local o validar
  el estado remoto.

## Casos Típicos

### Subir El Estado Actual A Producción

```bash
npm run data:backup-sync
```

### Verificar Si Falta Un Archivo En Remoto

```bash
npm run data:status
```

### Recuperar Solo Clientes Desde Remoto

```bash
npm run data:pull -- --file customers.json
```

## Nota

`Upstash` en este flujo cubre `data/*.json`. Las imágenes en `public/uploads/`
no se sincronizan a `Upstash`. En producción, la opción recomendada es usar
`Vercel Blob` para `uploads/*`. Los respaldos locales con `--uploads` siguen
siendo útiles para el entorno local o para activos guardados fuera del store
remoto.
