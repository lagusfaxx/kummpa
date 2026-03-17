# Fase 17 - UI/UX y responsive

## Objetivo

Endurecer la experiencia web para que la plataforma se sienta mobile-first, clara y preparada para una futura envoltura con Capacitor, sin tocar el dominio funcional ni agregar deuda visual en cada pantalla.

## Implementado

### Infraestructura compartida de UX

- `apps/web/src/features/ui/toast-context.tsx`
  - provider global de toasts
  - viewport fijo compatible con safe area inferior
  - soporte para `success`, `error`, `info` y `warning`
- `apps/web/src/components/feedback/skeleton.tsx`
  - `Skeleton`
  - `SurfaceSkeleton`
- `apps/web/src/components/feedback/empty-state.tsx`
  - estado vacio reutilizable para paginas y secciones
- `apps/web/src/components/feedback/inline-banner.tsx`
  - banners consistentes para errores y confirmaciones
- `apps/web/src/app/loading.tsx`
  - skeleton global para transiciones y carga de rutas

### Shell y navegacion mobile-first

- `apps/web/src/app/globals.css`
  - variables visuales globales
  - fondo mas atmosferico
  - tipografia mas intencional
  - estilos base para inputs, selects y textareas
  - foco visible y tactil
  - utilidades `safe-area-top`, `safe-area-bottom`, `safe-area-x`
- `apps/web/src/components/layout/app-shell.tsx`
  - fondo multicapa
  - mejor espaciado general para pantallas chicas
  - padding inferior preparado para bottom nav y webview
- `apps/web/src/components/layout/top-nav.tsx`
  - header mas compacto y app-like
  - deteccion de ruta activa tambien en subrutas
  - feedback de cierre de sesion con toast
- `apps/web/src/components/layout/bottom-nav.tsx`
  - barra inferior flotante
  - mejor lectura en movil
  - espacio compatible con safe area

### Autenticacion y estados base

- `apps/web/src/components/auth/auth-card.tsx`
  - contenedor mas premium y amigable
- `apps/web/src/components/auth/auth-gate.tsx`
  - validacion de sesion con skeleton en vez de texto plano
- `apps/web/src/app/not-found.tsx`
  - empty state reutilizable
- `apps/web/src/app/login/page.tsx`
  - toast al iniciar sesion
  - banner de error consistente
- `apps/web/src/app/register/page.tsx`
  - toast al crear cuenta
  - banner de error consistente

### Flujos principales endurecidos

- `apps/web/src/app/account/page.tsx`
  - skeleton de carga
  - empty state de recuperacion
  - toasts al guardar perfil base y perfil de rol
- `apps/web/src/app/pets/page.tsx`
  - skeletons de lista
  - empty state de primera mascota
  - feedback visual y toasts al cambiar visibilidad o archivar
- `apps/web/src/app/pets/[id]/page.tsx`
  - detalle con cards mas limpias
  - skeleton y empty state
  - toast al cambiar visibilidad
- `apps/web/src/app/pets/[id]/public-profile/page.tsx`
  - skeleton de carga
  - toasts al guardar y copiar URL publica
- `apps/web/src/app/appointments/page.tsx`
  - skeletons de carga
  - empty states para reservas, agenda y catalogo
  - toasts en crear, confirmar, rechazar, completar, reagendar, cancelar, guardar agenda y guardar catalogo
- `apps/web/src/app/appointments/[id]/page.tsx`
  - skeleton y empty state
  - toasts en cambios de estado de reserva
- `apps/web/src/app/admin/page.tsx`
  - loading mas robusto
  - empty state para acceso restringido y moderacion vacia
  - toasts en acciones operativas relevantes

## Impacto

- la app ahora entrega feedback inmediato en acciones importantes
- las cargas dejaron de depender de texto plano repetido
- los vacios tienen mensajes y CTA mas utiles
- el shell esta mejor preparado para dispositivos con notch, barra inferior y webview
- la navegacion se siente mas cercana a una app empaquetable con Capacitor

## Migraciones Prisma

- no hubo cambios de schema en esta fase
- no se creo migracion nueva

## Validacion

- `npm run db:generate` OK
- `npm run build` OK
- `npm run typecheck` OK
- `npm run lint` OK
- `npx prisma validate --schema prisma/schema.prisma` OK

Nota:

- el primer `typecheck` del workspace fallo antes del build porque faltaban los artefactos `.next/types`; despues de ejecutar `next build`, `typecheck` paso correctamente
- se mantiene el warning existente de Next por uso de `<img>` en `apps/web/src/app/news/page.tsx`
