# Fase 6 - Reservas veterinarias y servicios

## Alcance implementado

- Sistema de reservas con flujo completo:
- creacion de reserva
- confirmacion/rechazo por proveedor
- cancelacion por owner/proveedor
- cierre (completada)
- reagendamiento con traza (`rescheduledFromId`)
- Agenda de disponibilidad semanal por proveedor (`ScheduleAvailability`)
- Historial de reservas por owner y por proveedor
- Notificaciones email para crear, confirmar, cancelar/rechazar y reagendar

## Cambios de base de datos

- `Appointment` actualizado con:
- `providerUserId`, `providerType`, `providerSourceId`, `providerName`
- `serviceType`, `durationMinutes`, `status` enum
- timestamps de ciclo de vida: `confirmedAt`, `completedAt`, `cancelledAt`, `rejectedAt`
- traza de reagendamiento `rescheduledFromId`
- Modelo nuevo `ScheduleAvailability`
- Enums nuevos:
- `AppointmentStatus`
- `ProviderType`
- `ServiceType`

## API agregada (apps/api)

Archivo principal:
- `apps/api/src/modules/appointments/appointments.router.ts`

Endpoints:
- `GET /api/v1/appointments`
- `POST /api/v1/appointments`
- `GET /api/v1/appointments/:appointmentId`
- `POST /api/v1/appointments/:appointmentId/confirm`
- `POST /api/v1/appointments/:appointmentId/reject`
- `POST /api/v1/appointments/:appointmentId/cancel`
- `POST /api/v1/appointments/:appointmentId/complete`
- `POST /api/v1/appointments/:appointmentId/reschedule`
- `GET /api/v1/appointments/provider/availability`
- `PUT /api/v1/appointments/provider/availability`

Reglas clave:
- evita doble reserva por solapamiento de horario
- valida minima antelacion (`APPOINTMENT_MIN_NOTICE_MINUTES`)
- usa duracion por defecto configurable (`APPOINTMENT_DEFAULT_DURATION_MINUTES`)
- si el proveedor tiene agenda configurada, valida el horario dentro de bloques

## Web agregada (apps/web)

- `apps/web/src/app/appointments/page.tsx`
- `apps/web/src/app/appointments/[id]/page.tsx`
- `apps/web/src/features/appointments/appointments-api.ts`
- `apps/web/src/features/appointments/types.ts`

Pantallas:
- `/appointments`:
- formulario de creacion
- lista de reservas y acciones por estado
- panel de agenda para proveedores
- `/appointments/[id]`:
- detalle de reserva
- acciones segun permisos/estado

## Variables de entorno nuevas

- `APPOINTMENT_DEFAULT_DURATION_MINUTES`
- `APPOINTMENT_MIN_NOTICE_MINUTES`

## Pruebas manuales sugeridas

1. Crear reserva como owner en `/appointments`.
2. Ingresar como proveedor asignado y confirmar/rechazar.
3. Cancelar reserva desde owner y desde proveedor.
4. Reagendar reserva y validar que la anterior quede `RESCHEDULED`.
5. Configurar bloques de agenda y crear reserva fuera de horario para validar rechazo.
6. Verificar recepcion de emails segun eventos.
