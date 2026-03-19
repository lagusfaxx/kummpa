import { LostPetAlertStatus, type Prisma } from "@prisma/client";
import { CURATED_MAP_POINTS } from "./map.catalog";
import { prisma } from "../../lib/prisma";
import {
  MAP_SERVICE_TYPES_ALL,
  type MapServicePoint,
  type MapServiceType,
  type MapServicesQueryInput,
  type MapServicesResponse,
  type MapSuggestion,
  type MapSuggestionsQueryInput,
  type MapSuggestionsResponse
} from "./map.schemas";

const typeSortPriority: Record<MapServiceType, number> = {
  VET: 0,
  GROOMING: 1,
  HOTEL: 2,
  CAREGIVER: 3,
  SHOP: 4,
  PARK: 5,
  LOST_PET: 6
};

const suggestionKindPriority: Record<MapSuggestion["kind"], number> = {
  name: 0,
  district: 1,
  city: 2,
  address: 3,
  service: 4
};

function createTypeCounters(): Record<MapServiceType, number> {
  return {
    VET: 0,
    CAREGIVER: 0,
    SHOP: 0,
    GROOMING: 0,
    HOTEL: 0,
    PARK: 0,
    LOST_PET: 0
  };
}

function toText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function textIncludes(base: string | null | undefined, query: string): boolean {
  if (!base) return false;
  return normalizeText(base).includes(normalizeText(query));
}

function fullName(firstName: string | null, lastName: string | null): string {
  return [toText(firstName), toText(lastName)].filter(Boolean).join(" ").trim();
}

function getTodayTokens() {
  const day = new Date().getDay();
  const tokenMap: Record<number, string[]> = {
    0: ["dom", "domingo", "sun", "sunday"],
    1: ["lun", "lunes", "mon", "monday"],
    2: ["mar", "martes", "tue", "tuesday"],
    3: ["mie", "miercoles", "wed", "wednesday"],
    4: ["jue", "jueves", "thu", "thursday"],
    5: ["vie", "viernes", "fri", "friday"],
    6: ["sab", "sabado", "sat", "saturday"]
  };

  return tokenMap[day] ?? [];
}

function parseHourToMinutes(value: string): number | null {
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function isOpenNow(openingHours: string[], isEmergency24x7: boolean): boolean | null {
  if (isEmergency24x7) return true;
  if (openingHours.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayTokens = getTodayTokens();

  for (const rawLine of openingHours) {
    const line = normalizeText(rawLine);
    if (line.includes("24/7") || line.includes("24x7")) {
      return true;
    }

    const appliesToday =
      line.includes("todos") ||
      line.includes("daily") ||
      line.includes("everyday") ||
      todayTokens.some((token) => line.includes(token));

    if (!appliesToday) {
      continue;
    }

    const rangeMatch = line.match(/(\d{1,2}(?::\d{2})?)\s*[-a]\s*(\d{1,2}(?::\d{2})?)/);
    if (!rangeMatch) {
      continue;
    }

    const fromRaw = rangeMatch[1];
    const toRaw = rangeMatch[2];
    if (!fromRaw || !toRaw) {
      continue;
    }

    const from = parseHourToMinutes(fromRaw);
    const to = parseHourToMinutes(toRaw);
    if (from === null || to === null) {
      continue;
    }

    if (from <= to && currentMinutes >= from && currentMinutes <= to) {
      return true;
    }

    if (from > to && (currentMinutes >= from || currentMinutes <= to)) {
      return true;
    }
  }

  return false;
}

function parsePriceValue(input: string): number | null {
  const sanitized = input.replace(/[^0-9]/g, "");
  if (!sanitized) return null;
  const parsed = Number(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceFromList(lines: string[]): number | null {
  const values = lines
    .map((line) => parsePriceValue(line))
    .filter((value): value is number => value !== null && value >= 0);

  if (values.length === 0) return null;
  return Math.min(...values);
}

function hasAtHomeService(services: string[]): boolean {
  return services.some((item) => {
    const normalized = normalizeText(item);
    return normalized.includes("domicilio") || normalized.includes("movil") || normalized.includes("a casa");
  });
}

function normalizeRating(value: Prisma.Decimal | number | null | undefined): number | null {
  const parsed = decimalToNumber(value);
  if (parsed === null) return null;
  if (parsed < 0 || parsed > 5) return null;
  return Number(parsed.toFixed(1));
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

function bookingPath(type: MapServiceType, sourceId: string): string | null {
  if (type === "LOST_PET" || type === "PARK") {
    return null;
  }
  if (type === "VET") {
    return `/explore/vet/${sourceId}`;
  }
  if (type === "SHOP") {
    return `/explore/shop/${sourceId}`;
  }
  return null;
}

function profilePath(type: MapServiceType, sourceId: string): string | null {
  if (type === "LOST_PET") {
    return `/lost-pets/${sourceId}`;
  }
  if (type === "VET") {
    return `/explore/vet/${sourceId}`;
  }
  if (type === "SHOP") {
    return `/explore/shop/${sourceId}`;
  }
  return `/explore?focus=${sourceId}`;
}

async function loadBaseMapPoints(includeLostPets: boolean, searchQuery?: string): Promise<MapServicePoint[]> {
  const [vets, caregivers, shops, lostAlerts] = await Promise.all([
    prisma.vetProfile.findMany({
      where: {
        OR: [
          {
            latitude: { not: null },
            longitude: { not: null }
          },
          {
            businessLocation: {
              latitude: { not: null },
              longitude: { not: null }
            }
          }
        ]
      },
      include: {
        businessLocation: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    }),
    prisma.caregiverProfile.findMany({
      where: {
        OR: [
          {
            latitude: { not: null },
            longitude: { not: null }
          },
          {
            businessLocation: {
              latitude: { not: null },
              longitude: { not: null }
            }
          }
        ]
      },
      include: {
        businessLocation: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            city: true
          }
        }
      }
    }),
    prisma.shopProfile.findMany({
      where: {
        OR: [
          {
            latitude: { not: null },
            longitude: { not: null }
          },
          {
            businessLocation: {
              latitude: { not: null },
              longitude: { not: null }
            }
          }
        ]
      },
      include: {
        businessLocation: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      }
    }),
    prisma.lostPetAlert.findMany({
      where: includeLostPets
        ? {
            status: LostPetAlertStatus.ACTIVE
          }
        : {
            id: "__none__"
          },
      include: {
        pet: {
          select: {
            id: true,
            name: true,
            primaryPhotoUrl: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                city: true
              }
            }
          }
        }
      }
    })
  ]);

  const points: MapServicePoint[] = [];
  const shopUserIdToPointId = new Map<string, string>();

  for (const vet of vets) {
    const latitude = decimalToNumber(vet.businessLocation?.latitude ?? vet.latitude);
    const longitude = decimalToNumber(vet.businessLocation?.longitude ?? vet.longitude);
    if (latitude === null || longitude === null) continue;

    const openingHours = toStringArray(vet.businessLocation?.openingHours ?? vet.openingHours);
    const services = toStringArray(vet.services);
    const prices = toStringArray(vet.referencePrices);
    const priceFrom = parsePriceFromList(prices);
    const ownerName = fullName(vet.user.firstName, vet.user.lastName);

    points.push({
      id: `vet_${vet.id}`,
      sourceId: vet.id,
      type: "VET",
      name: toText(vet.clinicName) ?? (ownerName ? `Veterinaria ${ownerName}` : "Veterinaria"),
      subtitle: ownerName ? `Medico: ${ownerName}` : "Atencion veterinaria",
      description: toText(vet.description),
      latitude,
      longitude,
      address: toText(vet.businessLocation?.address) ?? toText(vet.address),
      city: toText(vet.businessLocation?.city) ?? toText(vet.city),
      district: toText(vet.businessLocation?.district) ?? toText(vet.district),
      phone:
        toText(vet.businessLocation?.contactPhone) ?? toText(vet.contactPhone) ?? toText(vet.user.phone),
      imageUrl: toText(vet.logoUrl),
      services,
      openingHours,
      priceInfo: prices,
      priceFrom,
      hasDiscount: false,
      discountLabel: null,
      isEmergency24x7: Boolean(vet.isEmergency24x7),
      isOpenNow: isOpenNow(openingHours, Boolean(vet.isEmergency24x7)),
      medicalPriority: false,
      supportsAtHome: hasAtHomeService(services),
      isFeatured: Boolean(vet.isEmergency24x7),
      rating: 4.7,
      reviewsCount: 0,
      distanceKm: null,
      bookingUrl: bookingPath("VET", vet.id),
      profileUrl: profilePath("VET", vet.id),
      createdAt: vet.updatedAt.toISOString()
    });
  }

  for (const caregiver of caregivers) {
    const latitude = decimalToNumber(caregiver.businessLocation?.latitude ?? caregiver.latitude);
    const longitude = decimalToNumber(caregiver.businessLocation?.longitude ?? caregiver.longitude);
    if (latitude === null || longitude === null) continue;

    const services = toStringArray(caregiver.services);
    const schedule = toStringArray(caregiver.businessLocation?.openingHours ?? caregiver.schedule);
    const rates = toStringArray(caregiver.rates);
    const caregiverName = fullName(caregiver.user.firstName, caregiver.user.lastName) || "Cuidador";

    points.push({
      id: `caregiver_${caregiver.id}`,
      sourceId: caregiver.id,
      type: "CAREGIVER",
      name: caregiverName,
      subtitle: "Pet sitter / paseador",
      description: toText(caregiver.introduction) ?? toText(caregiver.experience),
      latitude,
      longitude,
      address: toText(caregiver.businessLocation?.address),
      city: toText(caregiver.businessLocation?.city) ?? toText(caregiver.user.city),
      district: toText(caregiver.businessLocation?.district),
      phone: toText(caregiver.businessLocation?.contactPhone) ?? toText(caregiver.user.phone),
      imageUrl: toText(caregiver.avatarUrl),
      services,
      openingHours: schedule,
      priceInfo: rates,
      priceFrom: parsePriceFromList(rates),
      hasDiscount: false,
      discountLabel: null,
      isEmergency24x7: false,
      isOpenNow: isOpenNow(schedule, false),
      medicalPriority: false,
      supportsAtHome: true,
      isFeatured: false,
      rating: normalizeRating(caregiver.ratingAverage),
      reviewsCount: caregiver.reviewsCount,
      distanceKm: null,
      bookingUrl: bookingPath("CAREGIVER", caregiver.id),
      profileUrl: profilePath("CAREGIVER", caregiver.id),
      createdAt: caregiver.updatedAt.toISOString()
    });
  }

  for (const shop of shops) {
    const latitude = decimalToNumber(shop.businessLocation?.latitude ?? shop.latitude);
    const longitude = decimalToNumber(shop.businessLocation?.longitude ?? shop.longitude);
    if (latitude === null || longitude === null) continue;

    const openingHours = toStringArray(shop.businessLocation?.openingHours ?? shop.openingHours);
    const catalog = toStringArray(shop.basicCatalog);
    const discounts = toStringArray(shop.discounts);
    const ownerName = fullName(shop.user.firstName, shop.user.lastName);

    const pointId = `shop_${shop.id}`;
    points.push({
      id: pointId,
      sourceId: shop.id,
      type: "SHOP",
      name: toText(shop.businessName) ?? (ownerName ? `Pet shop ${ownerName}` : "Pet shop"),
      subtitle: ownerName ? `Encargado: ${ownerName}` : "Tienda pet",
      description: null,
      latitude,
      longitude,
      address: toText(shop.businessLocation?.address) ?? toText(shop.address),
      city: toText(shop.businessLocation?.city) ?? toText(shop.city),
      district: toText(shop.businessLocation?.district) ?? toText(shop.district),
      phone:
        toText(shop.businessLocation?.contactPhone) ?? toText(shop.contactPhone) ?? toText(shop.user.phone),
      imageUrl: toText(shop.logoUrl),
      services: catalog,
      openingHours,
      priceInfo: discounts,
      priceFrom: parsePriceFromList(catalog),
      hasDiscount: discounts.length > 0,
      discountLabel: discounts[0] ?? null,
      isEmergency24x7: false,
      isOpenNow: isOpenNow(openingHours, false),
      medicalPriority: false,
      supportsAtHome: hasAtHomeService(catalog),
      isFeatured: false,
      rating: 4.5,
      reviewsCount: 0,
      distanceKm: null,
      bookingUrl: bookingPath("SHOP", shop.id),
      profileUrl: profilePath("SHOP", shop.id),
      createdAt: shop.updatedAt.toISOString(),
      matchedProduct: null
    });
    shopUserIdToPointId.set(shop.userId, pointId);
  }

  if (includeLostPets) {
    for (const alert of lostAlerts) {
      const latitude = decimalToNumber(alert.lastSeenLat);
      const longitude = decimalToNumber(alert.lastSeenLng);
      if (latitude === null || longitude === null) continue;

      const ownerName = fullName(alert.pet.owner.firstName, alert.pet.owner.lastName);

      points.push({
        id: `lost_${alert.id}`,
        sourceId: alert.id,
        type: "LOST_PET",
        name: `Mascota perdida: ${alert.pet.name}`,
        subtitle: ownerName ? `Contacto: ${ownerName}` : "Alerta comunitaria",
        description: toText(alert.description),
        latitude,
        longitude,
        address: null,
        city: toText(alert.pet.owner.city),
        district: null,
        phone: toText(alert.pet.owner.phone),
        imageUrl: toText(alert.pet.primaryPhotoUrl),
        services: [],
        openingHours: [],
        priceInfo: [],
        priceFrom: null,
        hasDiscount: false,
        discountLabel: null,
        isEmergency24x7: false,
        isOpenNow: null,
        medicalPriority: alert.medicalPriority,
        supportsAtHome: false,
        isFeatured: alert.medicalPriority,
        rating: null,
        reviewsCount: 0,
        distanceKm: null,
        bookingUrl: null,
        profileUrl: profilePath("LOST_PET", alert.id),
        createdAt: alert.updatedAt.toISOString()
      });
    }
  }

  for (const curatedPoint of CURATED_MAP_POINTS) {
    if (!includeLostPets && curatedPoint.type === "LOST_PET") {
      continue;
    }

    const openingHours = curatedPoint.openingHours ?? [];

    points.push({
      ...curatedPoint,
      isOpenNow: isOpenNow(openingHours, curatedPoint.isEmergency24x7),
      bookingUrl: curatedPoint.bookingUrl ?? bookingPath(curatedPoint.type, curatedPoint.sourceId),
      profileUrl: curatedPoint.profileUrl ?? profilePath(curatedPoint.type, curatedPoint.sourceId),
      distanceKm: null,
      createdAt: curatedPoint.createdAt ?? new Date("2026-01-01T00:00:00.000Z").toISOString()
    });
  }

  if (searchQuery && shopUserIdToPointId.size > 0) {
    const sellerIds = Array.from(shopUserIdToPointId.keys());
    const matchedListings = await prisma.marketplaceListing.findMany({
      where: {
        sellerId: { in: sellerIds },
        deletedAt: null,
        isActive: true,
        OR: [
          { title: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } }
        ]
      },
      select: { title: true, priceCents: true, photoUrls: true, sellerId: true },
      take: 50
    });

    const productBySeller = new Map<string, { title: string; priceCents: number; imageUrl: string | null }>();
    for (const listing of matchedListings) {
      if (!productBySeller.has(listing.sellerId)) {
        productBySeller.set(listing.sellerId, {
          title: listing.title,
          priceCents: listing.priceCents,
          imageUrl: listing.photoUrls[0] ?? null
        });
      }
    }

    for (const [userId, product] of productBySeller) {
      const pointId = shopUserIdToPointId.get(userId);
      if (!pointId) continue;
      const point = points.find((p) => p.id === pointId);
      if (point) {
        point.matchedProduct = product;
      }
    }
  }

  return points;
}

function serializeSearchText(point: MapServicePoint): string {
  return [
    point.name,
    point.subtitle,
    point.description,
    point.address,
    point.city,
    point.district,
    point.services.join(" "),
    point.priceInfo.join(" "),
    point.discountLabel
  ]
    .filter(Boolean)
    .join(" ");
}

function applyMapFilters(points: MapServicePoint[], query: MapServicesQueryInput): MapServicePoint[] {
  let filtered = points;

  if (!query.includeLostPets) {
    filtered = filtered.filter((point) => point.type !== "LOST_PET");
  }

  if (query.types && query.types.length > 0) {
    filtered = filtered.filter((point) => query.types!.includes(point.type));
  }

  if (query.q) {
    filtered = filtered.filter((point) => textIncludes(serializeSearchText(point), query.q!));
  }

  if (query.service) {
    filtered = filtered.filter((point) =>
      point.services.some((service) => textIncludes(service, query.service!))
    );
  }

  if (query.city) {
    filtered = filtered.filter(
      (point) => textIncludes(point.city, query.city!) || textIncludes(point.address, query.city!)
    );
  }

  if (query.district) {
    filtered = filtered.filter(
      (point) => textIncludes(point.district, query.district!) || textIncludes(point.address, query.district!)
    );
  }

  if (query.openNow) {
    filtered = filtered.filter((point) => point.isOpenNow === true);
  }

  if (query.emergencyOnly) {
    filtered = filtered.filter((point) => point.isEmergency24x7 || point.medicalPriority);
  }

  if (query.withDiscount) {
    filtered = filtered.filter((point) => point.hasDiscount);
  }

  if (query.atHomeOnly) {
    filtered = filtered.filter((point) => point.supportsAtHome);
  }

  if (query.featuredOnly) {
    filtered = filtered.filter((point) => point.isFeatured);
  }

  if (query.minRating !== undefined) {
    filtered = filtered.filter((point) => point.rating !== null && point.rating >= query.minRating!);
  }

  if (query.priceMin !== undefined) {
    filtered = filtered.filter((point) => point.priceFrom !== null && point.priceFrom >= query.priceMin!);
  }

  if (query.priceMax !== undefined) {
    filtered = filtered.filter((point) => point.priceFrom !== null && point.priceFrom <= query.priceMax!);
  }

  const hasReferenceLocation = query.lat !== undefined && query.lng !== undefined;
  if (hasReferenceLocation) {
    filtered = filtered
      .map((point) => {
        const distanceKm = haversineDistanceKm(query.lat!, query.lng!, point.latitude, point.longitude);
        return {
          ...point,
          distanceKm: roundedDistance(distanceKm)
        };
      })
      .filter((point) => point.distanceKm === null || point.distanceKm <= query.radiusKm);
  }

  filtered.sort((left, right) => {
    if (query.sortBy === "recent") {
      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    }

    if (query.sortBy === "distance" && hasReferenceLocation) {
      const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
      const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
    }

    if (query.sortBy === "rating") {
      const leftRating = left.rating ?? -1;
      const rightRating = right.rating ?? -1;
      if (leftRating !== rightRating) {
        return rightRating - leftRating;
      }
    }

    const featuredDelta = Number(right.isFeatured) - Number(left.isFeatured);
    if (featuredDelta !== 0) {
      return featuredDelta;
    }

    const emergencyDelta = Number(right.isEmergency24x7) - Number(left.isEmergency24x7);
    if (emergencyDelta !== 0) {
      return emergencyDelta;
    }

    const priorityDelta = typeSortPriority[left.type] - typeSortPriority[right.type];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return left.name.localeCompare(right.name, "es");
  });

  return filtered;
}

function buildCountsByType(points: MapServicePoint[]): Record<MapServiceType, number> {
  return points.reduce<Record<MapServiceType, number>>((accumulator, point) => {
    accumulator[point.type] += 1;
    return accumulator;
  }, createTypeCounters());
}

export async function listMapServices(query: MapServicesQueryInput): Promise<MapServicesResponse> {
  const allPoints = await loadBaseMapPoints(query.includeLostPets, query.q);
  const filtered = applyMapFilters(allPoints, query);
  const limited = filtered.slice(0, query.limit);
  const hasReferenceLocation = query.lat !== undefined && query.lng !== undefined;

  return {
    items: limited,
    meta: {
      total: filtered.length,
      returned: limited.length,
      limit: query.limit,
      countsByType: buildCountsByType(filtered),
      referenceLocation: hasReferenceLocation
        ? {
            lat: query.lat!,
            lng: query.lng!,
            radiusKm: query.radiusKm
          }
        : null
    }
  };
}

function registerSuggestion(
  target: Map<string, MapSuggestion>,
  value: string | null | undefined,
  kind: MapSuggestion["kind"],
  type?: MapServiceType
) {
  const text = toText(value);
  if (!text) return;

  const key = `${kind}:${normalizeText(text)}`;
  if (!target.has(key)) {
    target.set(key, {
      value: text,
      kind,
      type
    });
  }
}

export async function listMapSuggestions(
  query: MapSuggestionsQueryInput
): Promise<MapSuggestionsResponse> {
  const allPoints = await loadBaseMapPoints(true);
  const accumulator = new Map<string, MapSuggestion>();

  for (const point of allPoints) {
    registerSuggestion(accumulator, point.name, "name", point.type);
    registerSuggestion(accumulator, point.address, "address", point.type);
    registerSuggestion(accumulator, point.city, "city");
    registerSuggestion(accumulator, point.district, "district");

    for (const service of point.services) {
      registerSuggestion(accumulator, service, "service", point.type);
    }
  }

  const normalizedQuery = normalizeText(query.q);
  const items = Array.from(accumulator.values())
    .filter((item) => normalizeText(item.value).includes(normalizedQuery))
    .sort((left, right) => {
      const leftStarts = normalizeText(left.value).startsWith(normalizedQuery);
      const rightStarts = normalizeText(right.value).startsWith(normalizedQuery);
      if (leftStarts !== rightStarts) {
        return Number(rightStarts) - Number(leftStarts);
      }

      const kindDelta = suggestionKindPriority[left.kind] - suggestionKindPriority[right.kind];
      if (kindDelta !== 0) {
        return kindDelta;
      }

      return left.value.localeCompare(right.value, "es");
    })
    .slice(0, query.limit);

  return {
    items
  };
}

export function listSupportedMapTypes(): MapServiceType[] {
  return [...MAP_SERVICE_TYPES_ALL];
}
