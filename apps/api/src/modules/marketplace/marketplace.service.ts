import { MarketplaceReportStatus, Prisma, UserRole } from "@prisma/client";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import type {
  CreateConversationInput,
  CreateListingInput,
  CreateMessageInput,
  CreateReportInput,
  FeatureListingInput,
  ListConversationsQueryInput,
  ListListingsQueryInput,
  ListMessagesQueryInput,
  ListReportsQueryInput,
  ReviewReportInput,
  UpdateListingInput
} from "./marketplace.schemas";

interface MarketplaceActor {
  id: string;
  role: UserRole;
}

function toText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ").trim();
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundedDistance(value: number): number {
  return Number(value.toFixed(2));
}

function haversineDistanceKm(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function buildUserSummary(user: {
  id: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  socialProfile?: { handle: string | null; avatarUrl: string | null } | null;
  ownerProfile?: { avatarUrl: string | null } | null;
}) {
  return {
    id: user.id,
    fullName: fullName(user.firstName, user.lastName) || "Usuario Kumpa",
    role: user.role,
    handle: user.socialProfile?.handle ?? null,
    avatarUrl: user.socialProfile?.avatarUrl ?? user.ownerProfile?.avatarUrl ?? null
  };
}

function isFeaturedNow(featuredUntil: Date | null): boolean {
  if (!featuredUntil) return false;
  return featuredUntil.getTime() > Date.now();
}

const listingInclude = {
  seller: {
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  _count: {
    select: {
      favorites: true,
      conversations: true
    }
  }
} satisfies Prisma.MarketplaceListingInclude;

type ListingWithInclude = Prisma.MarketplaceListingGetPayload<{
  include: typeof listingInclude;
}>;

async function resolveFavoriteListingIds(actorId: string, listingIds: string[]) {
  if (listingIds.length === 0) return new Set<string>();

  const rows = await prisma.marketplaceFavorite.findMany({
    where: {
      userId: actorId,
      listingId: {
        in: listingIds
      }
    },
    select: {
      listingId: true
    }
  });

  return new Set(rows.map((item) => item.listingId));
}

async function resolveConversationByListingIds(actorId: string, listingIds: string[]) {
  if (listingIds.length === 0) return new Map<string, string>();

  const rows = await prisma.marketplaceConversation.findMany({
    where: {
      listingId: {
        in: listingIds
      },
      buyerId: actorId
    },
    select: {
      id: true,
      listingId: true
    }
  });

  return rows.reduce<Map<string, string>>((accumulator, item) => {
    accumulator.set(item.listingId, item.id);
    return accumulator;
  }, new Map<string, string>());
}

function serializeListing(
  actor: MarketplaceActor,
  listing: ListingWithInclude,
  favoriteListingIds: Set<string>,
  conversationByListingId: Map<string, string>,
  distanceKm: number | null
) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    condition: listing.condition,
    category: listing.category,
    photoUrls: listing.photoUrls,
    city: toText(listing.city),
    district: toText(listing.district),
    location: {
      latitude: decimalToNumber(listing.latitude),
      longitude: decimalToNumber(listing.longitude)
    },
    isActive: listing.isActive,
    isFeatured: isFeaturedNow(listing.featuredUntil),
    featuredUntil: listing.featuredUntil?.toISOString() ?? null,
    seller: buildUserSummary(listing.seller),
    stats: {
      favoritesCount: listing._count.favorites,
      conversationsCount: listing._count.conversations
    },
    viewer: {
      isSeller: listing.sellerId === actor.id,
      isFavorite: favoriteListingIds.has(listing.id),
      canEdit: listing.sellerId === actor.id || actor.role === UserRole.ADMIN,
      canChat: listing.sellerId !== actor.id && listing.isActive && !listing.deletedAt,
      canFeature: listing.sellerId === actor.id || actor.role === UserRole.ADMIN,
      conversationId: conversationByListingId.get(listing.id) ?? null
    },
    distanceKm,
    createdAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString()
  };
}

function enforceListingVisibility(actor: MarketplaceActor, listing: ListingWithInclude) {
  if (!listing.isActive && listing.sellerId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw new HttpError(404, "Marketplace listing not found");
  }
}

async function getListingByIdOrThrow(listingId: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      id: listingId
    },
    include: listingInclude
  });

  if (!listing || listing.deletedAt) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  return listing;
}

export async function listMarketplaceListings(actor: MarketplaceActor, query: ListListingsQueryInput) {
  const where: Prisma.MarketplaceListingWhereInput = {
    deletedAt: null
  };

  if (query.mine) {
    where.sellerId = actor.id;
  }

  if (!query.mine && query.favoritesOnly) {
    where.favorites = {
      some: {
        userId: actor.id
      }
    };
  }

  const canSeeInactive = query.mine || actor.role === UserRole.ADMIN;
  if (!query.includeInactive || !canSeeInactive) {
    where.isActive = true;
  }

  if (query.q) {
    where.OR = [
      {
        title: {
          contains: query.q,
          mode: "insensitive"
        }
      },
      {
        description: {
          contains: query.q,
          mode: "insensitive"
        }
      },
      {
        city: {
          contains: query.q,
          mode: "insensitive"
        }
      },
      {
        district: {
          contains: query.q,
          mode: "insensitive"
        }
      }
    ];
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.condition) {
    where.condition = query.condition;
  }

  if (query.city) {
    where.city = {
      contains: query.city,
      mode: "insensitive"
    };
  }

  if (query.district) {
    where.district = {
      contains: query.district,
      mode: "insensitive"
    };
  }

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    where.priceCents = {};
    if (query.priceMin !== undefined) {
      where.priceCents.gte = Math.trunc(query.priceMin);
    }
    if (query.priceMax !== undefined) {
      where.priceCents.lte = Math.trunc(query.priceMax);
    }
  }

  const orderBy: Prisma.MarketplaceListingOrderByWithRelationInput[] =
    query.sortBy === "price_asc"
      ? [{ priceCents: "asc" }, { createdAt: "desc" }]
      : query.sortBy === "price_desc"
        ? [{ priceCents: "desc" }, { createdAt: "desc" }]
        : [{ featuredUntil: "desc" }, { createdAt: "desc" }];

  const fetchLimit = Math.min(query.limit * (query.sortBy === "distance" ? 5 : 3), 300);

  const rows = await prisma.marketplaceListing.findMany({
    where,
    take: fetchLimit,
    orderBy,
    include: listingInclude
  });

  const hasReferenceLocation = query.lat !== undefined && query.lng !== undefined;

  let filtered = rows.map((listing) => {
    const latitude = decimalToNumber(listing.latitude);
    const longitude = decimalToNumber(listing.longitude);

    if (!hasReferenceLocation || latitude === null || longitude === null) {
      return {
        listing,
        distanceKm: null as number | null
      };
    }

    return {
      listing,
      distanceKm: roundedDistance(haversineDistanceKm(query.lat!, query.lng!, latitude, longitude))
    };
  });

  if (hasReferenceLocation) {
    filtered = filtered.filter((item) => item.distanceKm === null || item.distanceKm <= query.radiusKm);
  }

  if (query.sortBy === "distance" && hasReferenceLocation) {
    filtered.sort((left, right) => {
      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return right.listing.createdAt.getTime() - left.listing.createdAt.getTime();
    });
  } else if (query.sortBy === "recent") {
    filtered.sort((left, right) => {
      const featuredDelta =
        Number(isFeaturedNow(right.listing.featuredUntil)) -
        Number(isFeaturedNow(left.listing.featuredUntil));
      if (featuredDelta !== 0) {
        return featuredDelta;
      }

      return right.listing.createdAt.getTime() - left.listing.createdAt.getTime();
    });
  }

  const limited = filtered.slice(0, query.limit);
  const listingIds = limited.map((item) => item.listing.id);

  const [favoriteListingIds, conversationByListingId] = await Promise.all([
    resolveFavoriteListingIds(actor.id, listingIds),
    resolveConversationByListingIds(actor.id, listingIds)
  ]);

  return limited.map((item) =>
    serializeListing(
      actor,
      item.listing,
      favoriteListingIds,
      conversationByListingId,
      item.distanceKm
    )
  );
}

export async function getMarketplaceListingById(actor: MarketplaceActor, listingId: string) {
  const listing = await getListingByIdOrThrow(listingId);
  enforceListingVisibility(actor, listing);

  const [favoriteListingIds, conversationByListingId] = await Promise.all([
    resolveFavoriteListingIds(actor.id, [listing.id]),
    resolveConversationByListingIds(actor.id, [listing.id])
  ]);

  return serializeListing(actor, listing, favoriteListingIds, conversationByListingId, null);
}

export async function createMarketplaceListing(actor: MarketplaceActor, input: CreateListingInput) {
  const created = await prisma.marketplaceListing.create({
    data: {
      sellerId: actor.id,
      title: input.title,
      description: input.description,
      priceCents: input.priceCents,
      condition: input.condition,
      category: input.category,
      photoUrls: input.photoUrls,
      city: input.city,
      district: input.district,
      latitude: input.latitude,
      longitude: input.longitude
    },
    select: {
      id: true
    }
  });

  return getMarketplaceListingById(actor, created.id);
}

export async function updateMarketplaceListing(
  actor: MarketplaceActor,
  listingId: string,
  input: UpdateListingInput
) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      id: listingId
    },
    select: {
      id: true,
      sellerId: true,
      deletedAt: true
    }
  });

  if (!listing || listing.deletedAt) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  if (listing.sellerId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only seller or admin can update this listing");
  }

  await prisma.marketplaceListing.update({
    where: {
      id: listingId
    },
    data: {
      title: input.title,
      description: input.description,
      priceCents: input.priceCents,
      condition: input.condition,
      category: input.category,
      photoUrls: input.photoUrls,
      city: input.city,
      district: input.district,
      latitude: input.latitude === undefined ? undefined : input.latitude,
      longitude: input.longitude === undefined ? undefined : input.longitude,
      isActive: input.isActive
    }
  });

  return getMarketplaceListingById(actor, listingId);
}

export async function deleteMarketplaceListing(actor: MarketplaceActor, listingId: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      id: listingId
    },
    select: {
      id: true,
      sellerId: true,
      deletedAt: true
    }
  });

  if (!listing || listing.deletedAt) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  if (listing.sellerId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only seller or admin can remove this listing");
  }

  const updated = await prisma.marketplaceListing.update({
    where: {
      id: listingId
    },
    data: {
      isActive: false,
      featuredUntil: null,
      deletedAt: new Date()
    },
    select: {
      id: true,
      deletedAt: true,
      updatedAt: true
    }
  });

  return {
    id: updated.id,
    deletedAt: updated.deletedAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt.toISOString()
  };
}

async function getChatListingOrThrow(listingId: string) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      id: listingId
    },
    select: {
      id: true,
      sellerId: true,
      isActive: true,
      deletedAt: true
    }
  });

  if (!listing || listing.deletedAt) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  if (!listing.isActive) {
    throw new HttpError(409, "Marketplace listing is not active");
  }

  return listing;
}

export async function favoriteMarketplaceListing(actor: MarketplaceActor, listingId: string) {
  const listing = await getChatListingOrThrow(listingId);

  if (listing.sellerId === actor.id) {
    throw new HttpError(409, "You cannot favorite your own listing");
  }

  await prisma.marketplaceFavorite.upsert({
    where: {
      listingId_userId: {
        listingId,
        userId: actor.id
      }
    },
    create: {
      listingId,
      userId: actor.id
    },
    update: {}
  });

  const favoritesCount = await prisma.marketplaceFavorite.count({
    where: {
      listingId
    }
  });

  return {
    listingId,
    favoritesCount,
    isFavorite: true
  };
}

export async function unfavoriteMarketplaceListing(actor: MarketplaceActor, listingId: string) {
  await prisma.marketplaceFavorite.deleteMany({
    where: {
      listingId,
      userId: actor.id
    }
  });

  const favoritesCount = await prisma.marketplaceFavorite.count({
    where: {
      listingId
    }
  });

  return {
    listingId,
    favoritesCount,
    isFavorite: false
  };
}

const conversationInclude = {
  listing: {
    select: {
      id: true,
      sellerId: true,
      title: true,
      priceCents: true,
      photoUrls: true,
      isActive: true,
      deletedAt: true
    }
  },
  buyer: {
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  seller: {
    select: {
      id: true,
      role: true,
      firstName: true,
      lastName: true,
      socialProfile: {
        select: {
          handle: true,
          avatarUrl: true
        }
      },
      ownerProfile: {
        select: {
          avatarUrl: true
        }
      }
    }
  },
  messages: {
    orderBy: {
      createdAt: "desc"
    },
    take: 1,
    include: {
      senderUser: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true
        }
      }
    }
  },
  _count: {
    select: {
      messages: true
    }
  }
} satisfies Prisma.MarketplaceConversationInclude;

type ConversationWithInclude = Prisma.MarketplaceConversationGetPayload<{
  include: typeof conversationInclude;
}>;

function serializeConversation(actor: MarketplaceActor, conversation: ConversationWithInclude) {
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    listing: {
      id: conversation.listing.id,
      title: conversation.listing.title,
      priceCents: conversation.listing.priceCents,
      primaryPhotoUrl: conversation.listing.photoUrls[0] ?? null,
      isActive: conversation.listing.isActive && !conversation.listing.deletedAt
    },
    participants: {
      buyer: buildUserSummary(conversation.buyer),
      seller: buildUserSummary(conversation.seller)
    },
    metrics: {
      messagesCount: conversation._count.messages
    },
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          body: lastMessage.body,
          sender: {
            id: lastMessage.senderUser.id,
            fullName:
              fullName(lastMessage.senderUser.firstName, lastMessage.senderUser.lastName) ||
              "Usuario Kumpa"
          },
          createdAt: lastMessage.createdAt.toISOString()
        }
      : null,
    viewer: {
      isBuyer: conversation.buyerId === actor.id,
      isSeller: conversation.sellerId === actor.id,
      canSend:
        (conversation.buyerId === actor.id || conversation.sellerId === actor.id) &&
        conversation.listing.isActive &&
        !conversation.listing.deletedAt
    },
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString()
  };
}

async function getConversationByIdOrThrow(conversationId: string) {
  const conversation = await prisma.marketplaceConversation.findUnique({
    where: {
      id: conversationId
    },
    include: conversationInclude
  });

  if (!conversation) {
    throw new HttpError(404, "Marketplace conversation not found");
  }

  return conversation;
}

function enforceConversationAccess(actor: MarketplaceActor, conversation: ConversationWithInclude) {
  if (
    actor.role !== UserRole.ADMIN &&
    conversation.buyerId !== actor.id &&
    conversation.sellerId !== actor.id
  ) {
    throw new HttpError(403, "Forbidden marketplace conversation");
  }
}

export async function startMarketplaceConversation(
  actor: MarketplaceActor,
  listingId: string,
  input: CreateConversationInput
) {
  const listing = await getChatListingOrThrow(listingId);

  if (listing.sellerId === actor.id) {
    throw new HttpError(409, "Seller cannot create chat as buyer");
  }

  const conversation = await prisma.marketplaceConversation.upsert({
    where: {
      listingId_buyerId: {
        listingId,
        buyerId: actor.id
      }
    },
    create: {
      listingId,
      buyerId: actor.id,
      sellerId: listing.sellerId
    },
    update: {},
    select: {
      id: true
    }
  });

  if (input.initialMessage) {
    await prisma.$transaction([
      prisma.marketplaceMessage.create({
        data: {
          conversationId: conversation.id,
          senderUserId: actor.id,
          body: input.initialMessage
        }
      }),
      prisma.marketplaceConversation.update({
        where: {
          id: conversation.id
        },
        data: {
          updatedAt: new Date()
        }
      })
    ]);
  }

  const fullConversation = await getConversationByIdOrThrow(conversation.id);
  enforceConversationAccess(actor, fullConversation);
  return serializeConversation(actor, fullConversation);
}

export async function listMarketplaceConversations(
  actor: MarketplaceActor,
  query: ListConversationsQueryInput
) {
  const where: Prisma.MarketplaceConversationWhereInput = {};

  if (query.role === "buying") {
    where.buyerId = actor.id;
  } else if (query.role === "selling") {
    where.sellerId = actor.id;
  } else {
    where.OR = [{ buyerId: actor.id }, { sellerId: actor.id }];
  }

  if (query.listingId) {
    where.listingId = query.listingId;
  }

  const rows = await prisma.marketplaceConversation.findMany({
    where,
    take: query.limit,
    orderBy: {
      updatedAt: "desc"
    },
    include: conversationInclude
  });

  return rows.map((item) => serializeConversation(actor, item));
}

export async function listMarketplaceConversationMessages(
  actor: MarketplaceActor,
  conversationId: string,
  query: ListMessagesQueryInput
) {
  const conversation = await getConversationByIdOrThrow(conversationId);
  enforceConversationAccess(actor, conversation);

  const rows = await prisma.marketplaceMessage.findMany({
    where: {
      conversationId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: query.limit,
    include: {
      senderUser: {
        select: {
          id: true,
          role: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  const messages = rows
    .slice()
    .reverse()
    .map((item) => ({
      id: item.id,
      body: item.body,
      sender: {
        id: item.senderUser.id,
        fullName: fullName(item.senderUser.firstName, item.senderUser.lastName) || "Usuario Kumpa",
        role: item.senderUser.role
      },
      isMine: item.senderUserId === actor.id,
      createdAt: item.createdAt.toISOString()
    }));

  return {
    conversation: serializeConversation(actor, conversation),
    messages
  };
}

export async function createMarketplaceConversationMessage(
  actor: MarketplaceActor,
  conversationId: string,
  input: CreateMessageInput
) {
  const conversation = await getConversationByIdOrThrow(conversationId);

  if (conversation.buyerId !== actor.id && conversation.sellerId !== actor.id) {
    throw new HttpError(403, "Only buyer or seller can send messages");
  }

  if (!conversation.listing.isActive || conversation.listing.deletedAt) {
    throw new HttpError(409, "Marketplace listing is no longer active");
  }

  const [message] = await prisma.$transaction([
    prisma.marketplaceMessage.create({
      data: {
        conversationId,
        senderUserId: actor.id,
        body: input.body
      },
      include: {
        senderUser: {
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true
          }
        }
      }
    }),
    prisma.marketplaceConversation.update({
      where: {
        id: conversationId
      },
      data: {
        updatedAt: new Date()
      }
    })
  ]);

  return {
    id: message.id,
    body: message.body,
    sender: {
      id: message.senderUser.id,
      fullName: fullName(message.senderUser.firstName, message.senderUser.lastName) || "Usuario Kumpa",
      role: message.senderUser.role
    },
    isMine: message.senderUserId === actor.id,
    createdAt: message.createdAt.toISOString()
  };
}

export async function featureMarketplaceListing(
  actor: MarketplaceActor,
  listingId: string,
  input: FeatureListingInput
) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      id: listingId
    },
    select: {
      id: true,
      sellerId: true,
      isActive: true,
      featuredUntil: true,
      deletedAt: true
    }
  });

  if (!listing || listing.deletedAt) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  if (listing.sellerId !== actor.id && actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only seller or admin can feature this listing");
  }

  if (!listing.isActive) {
    throw new HttpError(409, "Only active listings can be featured");
  }

  const now = new Date();
  const baseDate =
    listing.featuredUntil && listing.featuredUntil.getTime() > now.getTime()
      ? listing.featuredUntil
      : now;
  const featuredUntil = new Date(baseDate.getTime() + input.days * 24 * 60 * 60 * 1000);

  await prisma.marketplaceListing.update({
    where: {
      id: listingId
    },
    data: {
      featuredUntil
    }
  });

  return getMarketplaceListingById(actor, listingId);
}

export async function createMarketplaceReport(actor: MarketplaceActor, input: CreateReportInput) {
  const listing = await prisma.marketplaceListing.findFirst({
    where: {
      id: input.listingId,
      deletedAt: null
    },
    select: {
      id: true,
      sellerId: true
    }
  });

  if (!listing) {
    throw new HttpError(404, "Marketplace listing not found");
  }

  if (listing.sellerId === actor.id) {
    throw new HttpError(409, "You cannot report your own listing");
  }

  const created = await prisma.marketplaceReport.create({
    data: {
      reporterUserId: actor.id,
      listingId: listing.id,
      reason: input.reason
    },
    select: {
      id: true,
      listingId: true,
      status: true,
      createdAt: true
    }
  });

  return {
    id: created.id,
    listingId: created.listingId,
    status: created.status,
    createdAt: created.createdAt.toISOString()
  };
}

export async function listMarketplaceReports(actor: MarketplaceActor, query: ListReportsQueryInput) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can list marketplace reports");
  }

  const where: Prisma.MarketplaceReportWhereInput = {};

  if (query.status) {
    where.status = query.status;
  } else if (query.openOnly) {
    where.status = MarketplaceReportStatus.OPEN;
  }

  const rows = await prisma.marketplaceReport.findMany({
    where,
    take: query.limit,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          isActive: true,
          sellerId: true
        }
      },
      reporterUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      },
      reviewedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      }
    }
  });

  return rows.map((item) => ({
    id: item.id,
    listing: {
      id: item.listing.id,
      title: item.listing.title,
      sellerId: item.listing.sellerId,
      isActive: item.listing.isActive
    },
    reason: item.reason,
    status: item.status,
    reporter: {
      id: item.reporterUser.id,
      fullName: fullName(item.reporterUser.firstName, item.reporterUser.lastName) || "Usuario Kumpa"
    },
    review: {
      reviewedAt: item.reviewedAt?.toISOString() ?? null,
      reviewNotes: toText(item.reviewNotes),
      reviewedBy: item.reviewedByUser
        ? {
            id: item.reviewedByUser.id,
            fullName:
              fullName(item.reviewedByUser.firstName, item.reviewedByUser.lastName) || "Admin"
          }
        : null
    },
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }));
}

export async function reviewMarketplaceReport(
  actor: MarketplaceActor,
  reportId: string,
  input: ReviewReportInput
) {
  if (actor.role !== UserRole.ADMIN) {
    throw new HttpError(403, "Only admin can review marketplace reports");
  }

  const updated = await prisma.marketplaceReport.update({
    where: {
      id: reportId
    },
    data: {
      status: input.status,
      reviewNotes: input.reviewNotes,
      reviewedByUserId: actor.id,
      reviewedAt: new Date()
    },
    select: {
      id: true,
      status: true,
      reviewNotes: true,
      reviewedAt: true,
      updatedAt: true
    }
  });

  return {
    id: updated.id,
    status: updated.status,
    reviewNotes: toText(updated.reviewNotes),
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt.toISOString()
  };
}
