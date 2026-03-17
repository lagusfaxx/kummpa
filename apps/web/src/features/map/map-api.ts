import type {
  MapServicesQuery,
  MapServicesResponse,
  MapSuggestionsQuery,
  MapSuggestionsResponse
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAP_BASE_URL = `${API_URL}/api/v1/map`;

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: {
    message: string;
  };
}

function appendIfPresent(
  params: URLSearchParams,
  key: string,
  value: string | number | boolean | undefined
) {
  if (value === undefined || value === null) return;
  params.set(key, String(value));
}

async function requestMapApi<T>(path: string, params: URLSearchParams): Promise<T> {
  const url = `${MAP_BASE_URL}${path}${params.toString() ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    cache: "no-store"
  });

  const payload = (await response.json().catch(() => null)) as ApiSuccess<T> | ApiFailure | null;

  if (!response.ok || !payload || !payload.ok) {
    const message = payload && !payload.ok ? payload.error.message : "No se pudo cargar el mapa pet";
    throw new Error(message);
  }

  return payload.data;
}

export async function listMapServices(query: MapServicesQuery = {}): Promise<MapServicesResponse> {
  const params = new URLSearchParams();

  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "service", query.service);
  appendIfPresent(params, "city", query.city);
  appendIfPresent(params, "district", query.district);
  appendIfPresent(params, "openNow", query.openNow);
  appendIfPresent(params, "emergencyOnly", query.emergencyOnly);
  appendIfPresent(params, "withDiscount", query.withDiscount);
  appendIfPresent(params, "atHomeOnly", query.atHomeOnly);
  appendIfPresent(params, "featuredOnly", query.featuredOnly);
  appendIfPresent(params, "includeLostPets", query.includeLostPets);
  appendIfPresent(params, "minRating", query.minRating);
  appendIfPresent(params, "priceMin", query.priceMin);
  appendIfPresent(params, "priceMax", query.priceMax);
  appendIfPresent(params, "lat", query.lat);
  appendIfPresent(params, "lng", query.lng);
  appendIfPresent(params, "radiusKm", query.radiusKm);
  appendIfPresent(params, "sortBy", query.sortBy);
  appendIfPresent(params, "limit", query.limit);

  if (query.types && query.types.length > 0) {
    params.set("types", query.types.join(","));
  }

  return requestMapApi<MapServicesResponse>("/services", params);
}

export async function listMapSuggestions(
  query: MapSuggestionsQuery
): Promise<MapSuggestionsResponse> {
  const params = new URLSearchParams();
  appendIfPresent(params, "q", query.q);
  appendIfPresent(params, "limit", query.limit);
  return requestMapApi<MapSuggestionsResponse>("/suggestions", params);
}
