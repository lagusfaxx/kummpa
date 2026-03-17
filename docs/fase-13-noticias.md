# Fase 13 - Noticias y novedades

## Alcance implementado (Paso 19)

- modulo editorial de noticias pet
- categorias iniciales:
- alimentos nuevos
- gadgets
- novedades veterinarias
- consejos de salud
- eventos pet-friendly
- alertas sanitarias
- adopcion
- otros
- funcionalidades:
- listar articulos
- filtrar por categoria y busqueda
- marcar destacados
- guardar noticia
- compartir noticia por canal
- panel de noticias guardadas
- gestion admin de publicaciones

## Cambios de base de datos

- Enum `NewsCategory`
- extension de `NewsArticle` con:
- `category`
- `tags`
- `coverImageUrl`
- `sourceUrl`
- `isFeatured`
- `isPublished`
- modelos nuevos:
- `NewsArticleSave`
- `NewsArticleShare`
- relaciones nuevas en `User`:
- `newsArticleSaves`
- `newsArticleShares`

## API (apps/api)

Base: `/api/v1/news`

- `GET /categories`
- `GET /articles`
- `GET /articles/saved`
- `GET /articles/:articleId`
- `POST /articles/:articleId/save`
- `DELETE /articles/:articleId/save`
- `POST /articles/:articleId/share`
- `POST /articles` (ADMIN)
- `PATCH /articles/:articleId` (ADMIN)

## Web (apps/web)

- `/news`:
- feed de noticias por categoria
- filtro por texto/categoria/destacadas
- detalle de articulo
- guardar/quitar guardado
- compartir articulo
- panel de guardadas
- formulario admin para crear articulos

## Migracion Prisma

- `prisma/migrations/20260317152000_phase13_news/migration.sql`
- compatible con `npx prisma migrate deploy`
