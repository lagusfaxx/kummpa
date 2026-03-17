import type { MapServicePoint } from "@/features/map/types";
import type { LostPetAlertDetail } from "./types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function lostPetAlertToMapPoints(alert: LostPetAlertDetail): MapServicePoint[] {
  const points: MapServicePoint[] = [
    {
      id: `last-seen-${alert.id}`,
      sourceId: alert.id,
      type: "LOST_PET",
      name: `Ultima ubicacion de ${alert.pet.name}`,
      subtitle: `Registrada: ${formatDate(alert.lastSeenAt)}`,
      description: alert.description ?? null,
      latitude: alert.lastSeenLat,
      longitude: alert.lastSeenLng,
      address: alert.lastSeenAddress ?? null,
      city: alert.owner.city ?? null,
      district: null,
      phone: alert.owner.phone ?? null,
      imageUrl: alert.pet.primaryPhotoUrl ?? null,
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
      profileUrl: null,
      createdAt: alert.createdAt
    }
  ];

  for (const sighting of alert.sightings) {
    points.push({
      id: `sighting-${sighting.id}`,
      sourceId: sighting.id,
      type: "LOST_PET",
      name: `Avistamiento de ${alert.pet.name}`,
      subtitle: `${formatDate(sighting.sightingAt)} - ${sighting.reporter?.fullName ?? "Comunidad"}`,
      description: sighting.comment ?? null,
      latitude: sighting.lat,
      longitude: sighting.lng,
      address: sighting.address ?? null,
      city: alert.owner.city ?? null,
      district: null,
      phone: null,
      imageUrl: sighting.photoUrl ?? alert.pet.primaryPhotoUrl ?? null,
      services: [],
      openingHours: [],
      priceInfo: [],
      priceFrom: null,
      hasDiscount: false,
      discountLabel: null,
      isEmergency24x7: false,
      isOpenNow: null,
      medicalPriority: false,
      supportsAtHome: false,
      isFeatured: false,
      rating: null,
      reviewsCount: 0,
      distanceKm: null,
      bookingUrl: null,
      profileUrl: null,
      createdAt: sighting.createdAt
    });
  }

  return points;
}
