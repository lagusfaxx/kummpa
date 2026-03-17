# Fase 8 - Sistema de mascotas perdidas

## Alcance implementado

- Flujo de dueno:
- crear alerta de perdida seleccionando mascota
- definir ultima ubicacion, fecha/hora, descripcion y prioridad medica
- configurar radio de busqueda y difusion comunitaria
- cambiar estado a `FOUND` o `CLOSED` y reabrir a `ACTIVE`

- Flujo comunitario:
- ver alertas activas o historicas
- filtrar alertas por cercania usando geolocalizacion del dispositivo
- reportar avistamientos con coordenadas, comentario y foto opcional
- revisar historial de avistamientos por alerta
- visualizar mapa de avistamientos (ultima ubicacion + reportes)
- compartir alerta publica mediante enlace web

## Cambios de base de datos

- Enum `LostPetAlertStatus` (`ACTIVE`, `FOUND`, `CLOSED`)
- `LostPetAlert` ampliado con:
- `searchRadiusKm`, `broadcastEnabled`, `shareToken`
- `lastSeenAddress`, `emergencyNotes`
- `foundAt`, `closedAt`
- Modelo nuevo `LostPetSighting`

## API (apps/api)

Rutas en `api/v1/lost-pets`:

- `GET /public/:shareToken`
- `GET /`
- `GET /nearby`
- `POST /report`
- `GET /:alertId`
- `PATCH /:alertId`
- `GET /:alertId/sightings`
- `POST /:alertId/sightings`

## Web (apps/web)

- `/lost-pets` listado con filtros y modo "cerca de mi"
- `/lost-pets/report` formulario de nueva alerta
- `/lost-pets/[id]` detalle + mapa de avistamientos + cierre de caso
- `/lost-pets/public/[shareToken]` perfil publico compartible

## Migracion SQL manual

- `prisma/manual-migrations/20260317_phase8_lost_pets.sql`
