# Kumpa restructure patch

## Enfoque aplicado
- **Explorar** pasa a ser el centro real del producto.
- **Home** queda mucho más limpio: buscador principal, estado de mascota, descuentos y accesos rápidos.
- **Reservas** sale del flujo principal; la ruta legacy ahora redirige conceptualmente a Explorar/Cuenta.
- **Cuenta** queda enfocada en historial y perfil.
- **Dashboard** de comercios se rediseñó para verse como panel de negocio real.
- **Header** reorganizado para desktop y menú hamburguesa en móvil.

## Archivos modificados
- `apps/web/src/features/navigation/site-map.ts`
- `apps/web/src/components/layout/top-nav.tsx`
- `apps/web/src/components/home/home-hub.tsx`
- `apps/web/src/app/explore/page.tsx`
- `apps/web/src/app/account/page.tsx`
- `apps/web/src/app/business/page.tsx`
- `apps/web/src/app/appointments/page.tsx`

## Nota
No pude validar build final dentro del contenedor porque el proyecto ZIP no venía con dependencias instaladas. Hice la reestructuración directamente sobre el código fuente y empaqueté el resultado.
