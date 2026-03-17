# Fase 19: Superapp UX para Kumpa

## Objetivo

Reorientar Kumpa desde una suma de modulos tecnicos hacia una superapp pet mobile-first, organizada por tareas reales del tutor:

- cuidar mascotas
- gestionar identidad y vacunas
- reservar servicios
- explorar lugares, tiendas y beneficios
- participar en comunidad
- actuar rapido frente a perdidas

## Nueva arquitectura UX

La experiencia ahora se ordena por seis espacios principales:

1. Inicio
   Dashboard personal con recordatorios, reservas, beneficios, tiendas, servicios y alertas.
2. Mis mascotas
   Fichas de mascotas con carnet, historial, identidad y alertas asociadas.
3. Reservas
   Flujo guiado para pedir horas y revisar historial del usuario.
4. Explorar
   Mapa + listado + categorias + filtros + descuentos + tiendas.
5. Comunidad
   Publicaciones, encuentros y paseos, tips y consultas, y noticias pet.
6. Alertas
   Perdidas, avistamientos, mapa de reportes y ayuda comunitaria.

## Mapa de navegacion actualizado

- `/` Inicio
- `/pets` Mis mascotas
- `/appointments` Reservas
- `/map` Explorar
- `/community` Comunidad
- `/lost-pets` Alertas

Rutas de apoyo:

- `/pets/[id]`
- `/lost-pets/[id]`
- `/lost-pets/report`
- `/community/meet`

## Pantallas nuevas o reestructuradas

### Modificadas

- Inicio
- Mis mascotas
- Detalle de mascota
- Reservas
- Explorar
- Alertas
- Detalle de alerta
- Reportar mascota perdida
- Comunidad
- Layout y navegacion principal

### Reforzadas a nivel compartido

- `PageIntro`
- `EmptyState`
- `SurfaceSkeleton`
- `MapCanvas`
- estilos globales y sistema visual base

### Nueva utilidad

- `src/features/map/geocoding.ts`

## Flujos por modulo

### Inicio

- saludo calido
- resumen de mascotas
- proxima vacuna o recordatorio
- proximas reservas
- accesos rapidos: agregar mascota, reservar hora, explorar cerca, reportar perdida
- descuentos activos
- servicios destacados
- tiendas y productos
- alertas activas
- tips, noticias y campanas

### Mis mascotas

- cards por mascota con estado general y carnet
- CTA directo a perfil, edicion, carnet, QR, historial y compartir
- empty state orientado a valor
- detalle por mascota con resumen, carnet, historial, identidad, alertas y documentos

### Reservas

- renombre de Agenda a Reservas
- historial y proximas reservas del usuario
- wizard simple en 5 pasos
- filtros: abierto ahora, con descuento, a domicilio
- promociones visibles dentro del mismo flujo
- vista profesional relegada a bloque secundario por rol

### Explorar

- categorias visibles
- filtros de uso real
- mapa y listado conectados
- cards con direccion, distancia, rating, estado, precio y CTA
- bloque dedicado a beneficios
- bloque dedicado a tiendas y productos

### Comunidad

- portada con cuatro capas visibles:
  - publicaciones
  - encuentros y paseos
  - tips y consultas
  - noticias pet
- compositor para texto y foto
- feed menos generico
- atajos a paseos y foro

### Alertas

- modos cerca de mi / todas / mis alertas
- mapa de reportes
- cards con urgencia y CTA de ayuda
- bloque "Como ayudar"
- detalle del caso con foco en ubicacion, difusion y avistamientos

### Reportar mascota perdida

- wizard visual de 5 pasos
- sin latitud/longitud manual
- ubicacion via GPS, busqueda de direccion o pin en mapa
- previsualizacion antes de publicar
- opcion de compartir al crear

## Componentes y capas nuevas necesarias

- sistema visual mas calido en `globals.css`
- nuevos estilos de chips, metricas, paneles y CTAs
- `PageIntro` con metricas, acciones y tonos
- `EmptyState` con highlights
- `MapCanvas` con seleccion de punto interactiva
- geocodificacion de direcciones con Mapbox

## Cambios por rol

### Usuario comun

- ve solo la navegacion orientada a tareas
- no recibe CTA principal de agenda proveedor
- usa reservas, explorar, comunidad y alertas desde la misma jerarquia

### Roles profesionales

- mantienen acceso a datos operativos dentro de sus vistas especializadas
- la vista profesional en Reservas solo aparece como bloque secundario cuando corresponde

## Archivos principales modificados

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/page-intro.tsx`
- `apps/web/src/components/feedback/empty-state.tsx`
- `apps/web/src/components/feedback/skeleton.tsx`
- `apps/web/src/features/navigation/site-map.ts`
- `apps/web/src/components/layout/app-shell.tsx`
- `apps/web/src/components/layout/top-nav.tsx`
- `apps/web/src/components/layout/bottom-nav.tsx`
- `apps/web/src/components/map/map-canvas.tsx`
- `apps/web/src/features/map/geocoding.ts`
- `apps/web/src/components/home/home-hub.tsx`
- `apps/web/src/app/pets/page.tsx`
- `apps/web/src/app/pets/[id]/page.tsx`
- `apps/web/src/app/appointments/page.tsx`
- `apps/web/src/app/map/page.tsx`
- `apps/web/src/app/community/page.tsx`
- `apps/web/src/app/lost-pets/page.tsx`
- `apps/web/src/app/lost-pets/[id]/page.tsx`
- `apps/web/src/app/lost-pets/report/page.tsx`

## Changelog breve

- se reordeno la navegacion principal a Inicio, Mis mascotas, Reservas, Explorar, Comunidad y Alertas
- se reemplazo el look de panel tecnico por una interfaz mas calida, visual y escaneable
- se convirtio Inicio en un dashboard vivo con valor inmediato
- Mis mascotas paso de CRUD a espacio de gestion con identidad y salud
- Reservas ahora usa un flujo guiado y oculta la logica de proveedor para usuarios comunes
- Mapa evoluciono a Explorar con beneficios, filtros, tiendas y categorias
- Comunidad gano estructura pet clara en cuatro capas
- Alertas y su detalle se reorientaron a urgencia, ayuda y ubicacion
- reportar mascota perdida elimina coordenadas manuales y adopta geolocalizacion, busqueda y pin

## Validacion tecnica

Comandos ejecutados:

- `npm.cmd run build --workspace @kumpa/web`
- `npm.cmd run typecheck --workspace @kumpa/web`

Resultado:

- build exitoso
- typecheck exitoso
- quedaron advertencias de lint por dependencias de hooks y uso de `img`, sin bloquear deploy
