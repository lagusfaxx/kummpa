# Fase 10 - Foros comunitarios

## Alcance implementado (Paso 16)

- foros por categorias iniciales:
- salud
- alimentacion
- vacunas
- entrenamiento
- perros
- gatos
- mascotas exoticas
- recomendaciones
- experiencias
- mascotas perdidas
- adopcion
- crear tema
- responder
- citar respuesta
- votar respuesta util
- etiquetas por tema
- moderacion basica admin
- reportar tema o respuesta
- buscar temas por texto/categoria/tag
- disclaimer visible en web:
- "este foro no reemplaza atencion veterinaria profesional"

## Cambios de base de datos

- Enum `ForumReportTargetType`
- Enum `ForumReportStatus`
- modelos:
- `ForumCategory`
- `ForumTopic`
- `ForumReply`
- `ForumReplyUsefulVote`
- `ForumReport`

## API (apps/api)

Base: `/api/v1/forum`

- `GET /categories`
- `GET /topics`
- `POST /topics`
- `GET /topics/:topicId`
- `POST /topics/:topicId/replies`
- `PATCH /topics/:topicId/moderation` (ADMIN)
- `POST /replies/:replyId/useful`
- `DELETE /replies/:replyId/useful`
- `PATCH /replies/:replyId/moderation` (ADMIN)
- `POST /reports`
- `GET /reports` (ADMIN)
- `PATCH /reports/:reportId` (ADMIN)

## Web (apps/web)

- `/forum`:
- disclaimer visible de salud
- filtro/buscador de temas
- listado de temas
- detalle de tema y respuestas
- cita de respuestas
- voto util
- reporte
- panel admin de reportes

## Migracion Prisma

- `prisma/migrations/20260317013000_phase10_forum/migration.sql`
