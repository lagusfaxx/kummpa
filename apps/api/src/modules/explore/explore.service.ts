import { prisma } from "../../lib/prisma";
import { listMapServices } from "../map/map.service";
import type { ExploreSearchQueryInput } from "./explore.schemas";

export async function searchExplore(query: ExploreSearchQueryInput) {
  const { includeProducts, ...mapQuery } = query;
  const services = await listMapServices({
    ...mapQuery,
    sortBy: mapQuery.sortBy ?? "distance"
  });

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
