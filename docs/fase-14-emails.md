# Fase 14 - Emails transaccionales con Resend

## Alcance implementado (Paso 20)

- integracion de Resend en los flujos transaccionales relevantes
- cobertura de emails obligatorios:
- verificacion de cuenta
- bienvenida
- recuperacion de contrasena
- reserva creada
- reserva confirmada
- reserva cancelada/rechazada
- reserva reagendada
- recordatorio de vacuna
- vacuna vencida
- alerta de mascota perdida activada
- avistamiento reportado

## Mejoras de robustez

- plantillas unificadas con branding simple y layout consistente
- textos claros para contexto y accion de usuario
- reintentos de envio (hasta 3 intentos por correo)
- manejo de errores no bloqueante en los flujos funcionales
- logs persistentes por envio para auditoria y soporte

## Cambios de base de datos

- enum `EmailTemplateKey`
- enum `EmailDeliveryStatus`
- modelo `EmailDispatchLog` con:
- plantilla
- destinatario
- asunto
- estado
- cantidad de intentos
- error de proveedor
- metadata

## API (apps/api)

- servicio central de email `apps/api/src/modules/notifications/email.service.ts`:
- render de plantilla unificada
- envio Resend con reintentos
- log en `EmailDispatchLog`
- extension de flujo de recordatorios para distinguir:
- vacuna programada
- vacuna vencida
- extension de flujo de mascotas perdidas:
- email al activar alerta
- email al reportar avistamiento

## Migracion Prisma

- `prisma/migrations/20260317173000_phase14_resend_emails/migration.sql`
- compatible con `npx prisma migrate deploy`
