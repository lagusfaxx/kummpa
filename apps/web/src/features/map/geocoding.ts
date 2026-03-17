const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

export interface GeocodingSuggestion {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  context: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  text: string;
  center: [number, number];
  properties?: {
    address?: string;
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

function ensureToken() {
  if (!MAPBOX_TOKEN) {
    throw new Error("Configura NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN para usar geocodificacion.");
  }
}

function toSuggestion(feature: MapboxFeature): GeocodingSuggestion {
  const [lng, lat] = feature.center;
  const context = feature.context?.map((item) => item.text).join(", ") ?? "";

  return {
    id: feature.id,
    label: feature.text,
    address: feature.place_name,
    lat,
    lng,
    context
  };
}

export async function searchAddressSuggestions(query: string, limit = 5): Promise<GeocodingSuggestion[]> {
  ensureToken();

  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    autocomplete: "true",
    language: "es",
    country: "cl",
    types: "address,place,locality,neighborhood",
    limit: String(limit)
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?${params.toString()}`,
    {
      method: "GET"
    }
  );

  if (!response.ok) {
    throw new Error("No se pudo buscar la direccion.");
  }

  const payload = (await response.json()) as {
    features?: MapboxFeature[];
  };

  return (payload.features ?? []).map(toSuggestion);
}

export async function reverseGeocodeLocation(lat: number, lng: number): Promise<string | null> {
  ensureToken();

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    language: "es",
    country: "cl",
    types: "address,place,locality,neighborhood",
    limit: "1"
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${params.toString()}`,
    {
      method: "GET"
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    features?: MapboxFeature[];
  };

  return payload.features?.[0]?.place_name ?? null;
}
