# Fase 9 - Comunidad social

## Alcance implementado

### Paso 14 - Perfiles sociales y publicaciones

- perfiles sociales de usuarios con datos editables (`displayName`, `handle`, `bio`, `city`, visibilidad)
- perfiles sociales de mascotas editables por su tutor
- feed social con modos `discover`, `following`, `mine`, `saved`
- publicaciones con texto e imagen opcional
- visibilidad por audiencia (`PUBLIC`, `FOLLOWERS`, `PRIVATE`)
- interacciones:
- likes
- guardados
- compartidos
- comentarios
- follow/unfollow entre perfiles
- reportes de contenido/perfiles y moderacion basica para `ADMIN`

### Paso 15 - Encuentros, paseos y Pet-Tinder

- modulo de descubrimiento social para paseos entre duenos/mascotas
- filtros por:
- especie
- tamano
- energia
- edad (meses)
- zona (ciudad/comuna)
- invitaciones a paseo:
- crear invitacion
- aceptar/rechazar/cancelar
- chat previo por invitacion
- eventos grupales:
- crear evento
- listar eventos
- unirse/salir de evento

## Cambios de base de datos

### Paso 14

- Enum `SocialPostVisibility`
- Enum `SocialReportTargetType`
- Enum `SocialReportStatus`
- `SocialPost` ampliado con:
- `petId`
- `visibility`
- `allowComments`
- `deletedAt` (soft delete)
- modelos nuevos:
- `SocialProfile`
- `PetSocialProfile`
- `SocialPostComment`
- `SocialPostLike`
- `SocialPostSave`
- `SocialPostShare`
- `SocialFollow`
- `SocialReport`

### Paso 15

- Enum `PetEnergyLevel`
- Enum `SocialWalkInvitationStatus`
- Enum `SocialEventType`
- Enum `SocialEventStatus`
- `PetSocialProfile` ampliado con:
- `energyLevel`
- modelos nuevos:
- `SocialWalkProfile`
- `SocialWalkInvitation`
- `SocialWalkChatMessage`
- `SocialGroupEvent`
- `SocialGroupEventMember`

## API (apps/api)

Base: `/api/v1/community`

### Paso 14

- `GET /feed`
- `POST /posts`
- `GET /posts/:postId`
- `DELETE /posts/:postId`
- `POST /posts/:postId/like`
- `DELETE /posts/:postId/like`
- `POST /posts/:postId/save`
- `DELETE /posts/:postId/save`
- `POST /posts/:postId/share`
- `POST /posts/:postId/comments`
- `DELETE /posts/:postId/comments/:commentId`
- `GET /profiles/me`
- `PATCH /profiles/me`
- `GET /profiles/:userId`
- `GET /profiles/:userId/posts`
- `POST /profiles/:userId/follow`
- `DELETE /profiles/:userId/follow`
- `GET /profiles/me/following`
- `GET /profiles/me/followers`
- `GET /pets/my`
- `GET /pets/:petId/profile`
- `PUT /pets/:petId/profile`
- `POST /reports`
- `GET /reports` (ADMIN)
- `PATCH /reports/:reportId` (ADMIN)

### Paso 15

- `GET /walks/profile/me`
- `PATCH /walks/profile/me`
- `GET /walks/discover`
- `GET /walks/invitations`
- `POST /walks/invitations`
- `PATCH /walks/invitations/:invitationId`
- `GET /walks/invitations/:invitationId/chat`
- `POST /walks/invitations/:invitationId/chat`
- `GET /walks/events`
- `POST /walks/events`
- `POST /walks/events/:eventId/join`
- `DELETE /walks/events/:eventId/join`

## Web (apps/web)

### Paso 14

- `/community`:
- composer para publicar
- feed con filtros por modo
- acciones de interaccion sobre cada post
- editor de perfil social propio
- editor de perfil social de mascotas
- `/community/users/[userId]`:
- perfil social de usuario
- boton seguir/dejar de seguir
- listado de publicaciones visibles

### Paso 15

- `/community/meet`:
- discovery de perfiles cercanos con filtros pet
- envio y gestion de invitaciones
- chat previo por invitacion
- creacion y gestion de eventos grupales
- acceso directo desde `/community`

## Migraciones SQL manuales

- `prisma/manual-migrations/20260317_phase9_community_social.sql`
- `prisma/manual-migrations/20260317_phase9_walks_meetups.sql`
