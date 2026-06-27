# Operación De Datos

## Objetivo

Esta guía resume el flujo recomendado para respaldar, sincronizar y restaurar
los archivos JSON operativos del proyecto usando `Upstash`.

## Requisitos

- Tener `UPSTASH_REDIS_REST_URL` en `.env.local`
- Tener `UPSTASH_REDIS_REST_TOKEN` en `.env.local`
- Ejecutar los comandos desde la raíz del proyecto

## Datos Cubiertos

El script `scripts/maintenance.mjs` contempla estos archivos:

- `data/perfumes.json`
- `data/customers.json`
- `data/orders.json`
- `data/checkout-orders.json`
- `data/reviews.json`
- `data/suggestions.json`
- `data/sales.json`

## Flujo Recomendado

### 1. Revisar Estado

Usa este comando para comparar si cada archivo existe en local y en `Upstash`:

```bash
node --env-file=.env.local scripts/maintenance.mjs status-upstash
```

### 2. Crear Respaldo Y Sincronizar

Este es el flujo recomendado para mantenimiento normal. Primero crea un respaldo
local en `backups/` y después sincroniza los JSON a `Upstash`.

```bash
node --env-file=.env.local scripts/maintenance.mjs backup-sync-upstash
```

Para sincronizar solo un archivo:

```bash
node --env-file=.env.local scripts/maintenance.mjs backup-sync-upstash --file customers.json
```

Para incluir `public/uploads/` solo en el respaldo:

```bash
node --env-file=.env.local scripts/maintenance.mjs backup-sync-upstash --uploads
```

### 3. Descargar Desde Upstash

Si necesitas reconstruir tu carpeta `data/` desde el estado remoto:

```bash
node --env-file=.env.local scripts/maintenance.mjs pull-upstash
```

Para descargar solo un archivo:

```bash
node --env-file=.env.local scripts/maintenance.mjs pull-upstash --file customers.json
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

## Politica Recomendada

- Mantener `data/perfumes.json` versionado en Git como catálogo base.
- Mantener fuera de Git los datos operativos o sensibles.
- Sincronizar a `Upstash` después de cambios relevantes en clientes, pedidos,
  reseñas, ventas o sugerencias.
- Usar `backup-sync-upstash` como rutina normal antes de cambios manuales.
- Usar `pull-upstash` cuando necesites reconstruir un entorno local o validar
  el estado remoto.

## Casos Tipicos

### Subir El Estado Actual A Producción

```bash
node --env-file=.env.local scripts/maintenance.mjs backup-sync-upstash
```

### Verificar Si Falta Un Archivo En Remoto

```bash
node --env-file=.env.local scripts/maintenance.mjs status-upstash
```

### Recuperar Solo Clientes Desde Remoto

```bash
node --env-file=.env.local scripts/maintenance.mjs pull-upstash --file customers.json
```

## Nota

`Upstash` en este flujo cubre `data/*.json`. Las imágenes en `public/uploads/`
no se sincronizan a `Upstash`; solo pueden incluirse en respaldos locales.
