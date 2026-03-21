"use client";

import { useEffect, useRef } from "react";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const SOURCE_ID = "kumpa-pet-points-source";
const CLUSTER_LAYER_ID = "kumpa-pet-clusters-layer";
const CLUSTER_COUNT_LAYER_ID = "kumpa-pet-cluster-count-layer";
const POINT_LAYER_ID = "kumpa-pet-point-layer";

let mapLibraryPromise: Promise<any> | null = null;

/* Premium minimal map style */
const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

/* 3× for retina crisp markers — displayed at 40×50 */
const MARKER_W = 120;
const MARKER_H = 150;

function ensureMapAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  if (mapLibraryPromise) return mapLibraryPromise;

  mapLibraryPromise = new Promise<any>((resolve, reject) => {
    void import("mapbox-gl")
      .then((mod) => resolve((mod as any).default ?? mod))
      .catch(() => reject(new Error("No se pudo cargar Mapbox GL")));
  });

  return mapLibraryPromise;
}

function markerColor(type: MapServiceType): string {
  if (type === "VET") return "#18181b";
  if (type === "CAREGIVER") return "#18181b";
  if (type === "SHOP") return "#18181b";
  if (type === "GROOMING") return "#18181b";
  if (type === "HOTEL") return "#18181b";
  if (type === "PARK") return "#16a34a";
  return "#dc2626";
}

/* Accent ring per type (subtle color differentiation) */
function markerAccent(type: MapServiceType): string {
  if (type === "VET") return "#0d9488";
  if (type === "CAREGIVER") return "#2563eb";
  if (type === "SHOP") return "#d97706";
  if (type === "GROOMING") return "#db2777";
  if (type === "HOTEL") return "#7c3aed";
  if (type === "PARK") return "#16a34a";
  return "#dc2626";
}

/* Premium pin — dark body with colored accent glow, 3× resolution (120×150 → displayed 40×50) */
function markerSvg(type: MapServiceType): string {
  const body = markerColor(type);
  const accent = markerAccent(type);
  /* Centered in 120×150 canvas, pin ~100 tall */
  const pin = "M60 140C60 140 16 82 16 52C16 27.7 35.7 8 60 8C84.3 8 104 27.7 104 52C104 82 60 140 60 140Z";

  const icons: Record<MapServiceType, string> = {
    VET:
      `<path d="M60 30v44M38 52h44" stroke="white" stroke-width="7" stroke-linecap="round"/>`,
    SHOP:
      `<path d="M40 49h40l-5.5 26h-29L40 49z" stroke="white" stroke-width="4.5" fill="none" stroke-linejoin="round"/>` +
      `<path d="M50 49V44a10 10 0 0120 0V49" stroke="white" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
    GROOMING:
      `<circle cx="42" cy="37" r="6.5" stroke="white" stroke-width="4.5" fill="none"/>` +
      `<circle cx="42" cy="67" r="6.5" stroke="white" stroke-width="4.5" fill="none"/>` +
      `<line x1="47" y1="42" x2="82" y2="65" stroke="white" stroke-width="4.5" stroke-linecap="round"/>` +
      `<line x1="47" y1="62" x2="82" y2="39" stroke="white" stroke-width="4.5" stroke-linecap="round"/>`,
    CAREGIVER:
      `<ellipse cx="60" cy="60" rx="13" ry="10" fill="white"/>` +
      `<circle cx="43" cy="43" r="6" fill="white"/>` +
      `<circle cx="54" cy="35" r="6" fill="white"/>` +
      `<circle cx="66" cy="35" r="6" fill="white"/>` +
      `<circle cx="77" cy="43" r="6" fill="white"/>`,
    PARK:
      `<line x1="60" y1="64" x2="60" y2="78" stroke="white" stroke-width="4.5" stroke-linecap="round"/>` +
      `<path d="M42 72l18-24 18 24z" fill="white"/>` +
      `<path d="M46 60l14-20 14 20z" fill="white"/>`,
    HOTEL:
      `<path d="M37 78h46V48l-23-18L37 48v30z" stroke="white" stroke-width="4.5" fill="none" stroke-linejoin="round"/>` +
      `<rect x="52" y="63" width="16" height="15" stroke="white" stroke-width="4.5" fill="none" rx="2"/>`,
    LOST_PET:
      `<circle cx="60" cy="48" r="18" stroke="white" stroke-width="5.5" fill="none"/>` +
      `<path d="M60 37v15M60 63v2" stroke="white" stroke-width="6" stroke-linecap="round"/>`,
  };

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_W}" height="${MARKER_H}" viewBox="0 0 ${MARKER_W} ${MARKER_H}">` +
    /* soft ground shadow */
    `<ellipse cx="60" cy="144" rx="14" ry="4" fill="rgba(0,0,0,0.10)"/>` +
    /* outer glow — accent color */
    `<path d="${pin}" fill="${accent}" opacity="0.18" transform="translate(0,2) scale(1.05)" transform-origin="60 74"/>` +
    /* white border for contrast */
    `<path d="${pin}" fill="white" stroke="white" stroke-width="6"/>` +
    /* pin body */
    `<path d="${pin}" fill="${body}"/>` +
    /* subtle top highlight */
    `<ellipse cx="48" cy="32" rx="14" ry="10" fill="rgba(255,255,255,0.12)"/>` +
    /* icon */
    (icons[type] ?? `<circle cx="60" cy="52" r="14" fill="white"/>`) +
    `</svg>`
  );
}

function toGeoJson(points: MapServicePoint[]) {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [point.longitude, point.latitude]
      },
      properties: {
        id: point.id,
        type: point.type,
        name: point.name
      }
    }))
  };
}

interface MapCanvasProps {
  accessToken?: string;
  points: MapServicePoint[];
  selectedPointId?: string | null;
  onSelectPoint?: (pointId: string) => void;
  pickedLocation?: { lat: number; lng: number } | null;
  onPickLocation?: (location: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number } | null;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
  borderless?: boolean;
  showPopup?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export function MapCanvas({
  accessToken,
  points,
  selectedPointId = null,
  onSelectPoint,
  pickedLocation = null,
  onPickLocation,
  center = null,
  userLocation = null,
  className,
  borderless = false,
  showPopup = false,
  minZoom = 8,
  maxZoom = 17,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const pickedMarkerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const mapLibraryRef = useRef<any>(null);
  const pointsRef = useRef<MapServicePoint[]>(points);
  const onSelectRef = useRef<typeof onSelectPoint>(onSelectPoint);
  const onPickLocationRef = useRef<typeof onPickLocation>(onPickLocation);

  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { onSelectRef.current = onSelectPoint; }, [onSelectPoint]);
  useEffect(() => { onPickLocationRef.current = onPickLocation; }, [onPickLocation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    void ensureMapAssets()
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;
        if (!accessToken) throw new Error("No se pudo cargar Mapbox: falta NEXT_PUBLIC_MAPBOX_TOKEN.");

        mapLibraryRef.current = maplibre;
        maplibre.accessToken = accessToken;

        const map = new maplibre.Map({
          container: containerRef.current,
          style: MAPBOX_STYLE,
          center: center ? [center.lng, center.lat] : [-70.65, -33.45],
          zoom: 9.2,
          minZoom,
          maxZoom,
          dragRotate: false,
          touchPitch: false,
          pitchWithRotate: false,
        });

        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        popupRef.current = new maplibre.Popup({ closeButton: true, closeOnClick: false });

        map.on("error", (e: any) => {
          console.error("[MapCanvas] Mapbox error:", e?.error?.message ?? e);
        });

        map.on("load", () => {
          const ALL_TYPES: MapServiceType[] = ["VET","SHOP","GROOMING","CAREGIVER","PARK","HOTEL","LOST_PET"];
          let remaining = ALL_TYPES.length;

          function addLayers() {
            if (!map.getSource(SOURCE_ID)) {
              map.addSource(SOURCE_ID, {
                type: "geojson",
                data: toGeoJson(pointsRef.current),
                cluster: true,
                clusterMaxZoom: 13,
                clusterRadius: 55,
              });
            }

            map.addLayer({
              id: CLUSTER_LAYER_ID,
              type: "circle",
              source: SOURCE_ID,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": "#18181b",
                "circle-radius": ["step", ["get","point_count"], 20, 30, 26, 80, 32],
                "circle-stroke-width": 3,
                "circle-stroke-color": "rgba(255,255,255,0.85)",
                "circle-opacity": 0.92,
              },
            });

            map.addLayer({
              id: CLUSTER_COUNT_LAYER_ID,
              type: "symbol",
              source: SOURCE_ID,
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get","point_count_abbreviated"],
                "text-size": 13,
                "text-font": ["DIN Offc Pro Bold","Arial Unicode MS Bold"],
              },
              paint: { "text-color": "#ffffff" },
            });

            map.addLayer({
              id: POINT_LAYER_ID,
              type: "symbol",
              source: SOURCE_ID,
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": [
                  "match", ["get","type"],
                  "VET",      "marker-VET",
                  "SHOP",     "marker-SHOP",
                  "GROOMING", "marker-GROOMING",
                  "CAREGIVER","marker-CAREGIVER",
                  "PARK",     "marker-PARK",
                  "HOTEL",    "marker-HOTEL",
                  "marker-LOST_PET",
                ],
                "icon-size": 1,
                "icon-allow-overlap": true,
                "icon-anchor": "bottom",
              },
            });

            map.on("click", CLUSTER_LAYER_ID, (event: any) => {
              const features = map.queryRenderedFeatures(event.point, { layers: [CLUSTER_LAYER_ID] });
              const clusterFeature = features?.[0];
              const clusterId = clusterFeature?.properties?.cluster_id;
              const source = map.getSource(SOURCE_ID);
              if (!source || clusterId === undefined) return;
              source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
                if (error) return;
                map.easeTo({ center: clusterFeature.geometry.coordinates, zoom: Math.min(zoom, maxZoom) });
              });
            });

            map.on("click", POINT_LAYER_ID, (event: any) => {
              const feature = event.features?.[0];
              const pointId = feature?.properties?.id as string | undefined;
              if (!pointId) return;
              onSelectRef.current?.(pointId);
            });

            if (onPickLocationRef.current) {
              map.on("click", (event: any) => {
                const interactiveFeatures = map.queryRenderedFeatures(event.point, {
                  layers: [CLUSTER_LAYER_ID, POINT_LAYER_ID],
                });
                if (interactiveFeatures.length > 0) return;
                onPickLocationRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
              });
            }

            const pointerLayers = [CLUSTER_LAYER_ID, POINT_LAYER_ID];
            for (const layerId of pointerLayers) {
              map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
              map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });
            }

            if (onPickLocationRef.current) {
              map.getCanvas().style.cursor = "crosshair";
            }
          }

          for (const type of ALL_TYPES) {
            const img = new Image(MARKER_W, MARKER_H);
            img.onload = () => {
              map.addImage(`marker-${type}`, img, { pixelRatio: 3 });
              remaining--;
              if (remaining === 0) addLayers();
            };
            img.onerror = () => {
              remaining--;
              if (remaining === 0) addLayers();
            };
            img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markerSvg(type))}`;
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      popupRef.current?.remove?.();
      popupRef.current = null;
      pickedMarkerRef.current?.remove?.();
      pickedMarkerRef.current = null;
      userMarkerRef.current?.remove?.();
      userMarkerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [accessToken, center, minZoom, maxZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource?.(SOURCE_ID);
    if (!source) return;
    source.setData(toGeoJson(points));
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0 || selectedPointId) return;
    const maplibre = mapLibraryRef.current;
    if (!maplibre) return;
    const bounds = new maplibre.LngLatBounds();
    for (const point of points) bounds.extend([point.longitude, point.latitude]);
    map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 700 });
  }, [points, selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPointId) return;
    const selected = points.find((point) => point.id === selectedPointId);
    if (!selected) return;
    map.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(12, map.getZoom()),
      duration: 600
    });
  }, [points, selectedPointId]);

  useEffect(() => {
    const map = mapRef.current;
    const maplibre = mapLibraryRef.current;
    if (!map || !pickedLocation || !maplibre) return;
    if (!pickedMarkerRef.current) {
      const el = document.createElement("div");
      el.className = "h-4 w-4 rounded-full border-4 border-white bg-zinc-900 shadow-[0_8px_20px_rgba(0,0,0,0.3)]";
      pickedMarkerRef.current = new maplibre.Marker({ element: el });
    }
    pickedMarkerRef.current.setLngLat([pickedLocation.lng, pickedLocation.lat]).addTo(map);
    map.flyTo({ center: [pickedLocation.lng, pickedLocation.lat], zoom: Math.max(13, map.getZoom()), duration: 450 });
  }, [pickedLocation]);

  /* User location blue dot */
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = mapLibraryRef.current;
    if (!map || !maplibre || !userLocation) return;

    if (!userMarkerRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.2),0 2px 8px rgba(0,0,0,0.15);"></div>`;
      userMarkerRef.current = new maplibre.Marker({ element: el.firstChild as HTMLElement });
    }

    userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]).addTo(map);
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.flyTo({ center: [center.lng, center.lat], zoom: Math.max(11, map.getZoom()), duration: 450 });
  }, [center]);

  const borderClasses = borderless ? "" : "rounded-2xl border border-zinc-200";

  return (
    <div
      ref={containerRef}
      className={`${className ?? ""} ${borderClasses} overflow-hidden bg-zinc-100`}
    />
  );
}
