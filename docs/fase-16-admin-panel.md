# Fase 16 - Admin panel

## Alcance implementado (Paso 22)

- panel administrativo web en `/admin` con acceso solo `ADMIN`
- backend admin para resumen operativo, gestion de usuarios y gestion de mascotas
- reutilizacion de APIs ya existentes para moderacion, alertas, beneficios, noticias y reservas
- acciones seguras con confirmacion previa antes de desactivar o archivar

## Backend agregado

Base nueva: `/api/v1/admin`

- `GET /summary`
- `GET /users`
- `PATCH /users/:userId`
- `GET /pets`
- `PATCH /pets/:petId`

Capacidades:

- metricas basicas agregadas de usuarios, mascotas, reservas, moderacion y contenido
- filtros por estado, rol, visibilidad, especie y texto
- desactivacion/restauracion logica de usuarios y mascotas
- verificacion manual de email por admin

## Integracion con modulos existentes

- reservas: `ADMIN` ahora puede listar todo con `view=all` en `/api/v1/appointments`
- comunidad: panel usa reportes abiertos y puede revisar/eliminar publicaciones reportadas
- foro: panel usa reportes abiertos y permite ocultar temas o respuestas
- mascotas perdidas: panel revisa alertas y puede marcar `FOUND` o `CLOSED`
- beneficios: panel alterna activo/destacado con las rutas admin ya existentes
- noticias: panel alterna publicado/destacado con las rutas admin ya existentes

## Web implementada

Nueva pantalla:

- `/admin`

Incluye:

- tarjetas de metricas
- tabla de usuarios con filtros y acciones
- tabla de mascotas con filtros y acciones
- tabla de reservas con filtros y acceso al detalle
- bandejas de moderacion para comunidad y foro
- revision de alertas de mascotas perdidas
- gestion rapida de beneficios y noticias

## Ajuste UI previo conectado en esta entrega

Antes de entrar a la fase 16 se completaron dos pendientes de la fase 15:

- `/appointments` ahora permite administrar el catalogo `AppointmentService`
- `/pets/[id]/public-profile` permite editar `PublicPetProfile`

## Migraciones Prisma

- no fue necesaria una nueva migracion en esta fase
- se mantiene la regla: solo migraciones oficiales dentro de `prisma/migrations`
