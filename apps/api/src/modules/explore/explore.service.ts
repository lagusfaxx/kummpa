import { prisma } from "../../lib/prisma";
import { listMapServices } from "../map/map.service";
import type { ExploreSearchQueryInput } from "./explore.schemas";

export async function searchExplore(query: ExploreSearchQueryInput) {
  const { includeProducts, category, ...mapQuery } = query;

  const searchQuery = category
    ? { ...mapQuery, q: mapQuery.q ? `${mapQuery.q} ${category}` : category, sortBy: mapQuery.sortBy ?? "distance" }
    : { ...mapQuery, sortBy: mapQuery.sortBy ?? "distance" };

  const services = await listMapServices(searchQuery);

  const products = includeProducts
    ? await prisma.marketplaceListing.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(query.q
            ? {
                OR: [
                  { title: { contains: query.q, mode: "insensitive" } },
                  { description: { contains: query.q, mode: "insensitive" } }
                ]
              }
            : {})
        },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          priceCents: true,
          city: true,
          district: true,
          createdAt: true
        }
      })
    : [];

  return {
    query,
    services,
    products: products.map((product) => ({
      ...product,
      createdAt: product.createdAt.toISOString()
    }))
  };
}
