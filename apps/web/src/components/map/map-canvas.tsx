"use client";

import { useEffect, useRef } from "react";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const SOURCE_ID = "kumpa-pet-points-source";
const CLUSTER_LAYER_ID = "kumpa-pet-clusters-layer";
const CLUSTER_COUNT_LAYER_ID = "kumpa-pet-cluster-count-layer";
const POINT_LAYER_ID = "kumpa-pet-point-layer";

let mapLibraryPromise: Promise<any> | null = null;

const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";

/* Marker rendered at 2× for retina sharpness (64×80 SVG, displayed 32×40) */
const MARKER_W = 64;
const MARKER_H = 80;
const MARKER_DISPLAY_W = 32;
const MARKER_DISPLAY_H = 40;

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
  if (type === "VET") return "#0f766e";
  if (type === "CAREGIVER") return "#0369a1";
  if (type === "SHOP") return "#b45309";
  if (type === "GROOMING") return "#be185d";
  if (type === "HOTEL") return "#6d28d9";
  if (type === "PARK") return "#15803d";
  return "#be123c";
}

/* Pin SVG at 2× resolution for crisp rendering on retina displays */
function markerSvg(type: MapServiceType): string {
  const color = markerColor(type);
  // Scaled 2× from 32×40
  const pin = "M32 76C32 76 8 44 8 28C8 14.746 18.746 4 32 4C45.254 4 56 14.746 56 28C56 44 32 76 32 76Z";

  const icons: Record<MapServiceType, string> = {
    VET:
      `<path d="M32 14v28M18 28h28" stroke="white" stroke-width="4.5" stroke-linecap="round"/>`,
    SHOP:
      `<path d="M22 26h20l-3 14h-14L22 26z" stroke="white" stroke-width="3" fill="none" stroke-linejoin="round"/>` +
      `<path d="M27 26V23a5 5 0 0110 0V26" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    GROOMING:
      `<circle cx="23" cy="20" r="4" stroke="white" stroke-width="3" fill="none"/>` +
      `<circle cx="23" cy="36" r="4" stroke="white" stroke-width="3" fill="none"/>` +
      `<line x1="26" y1="22.8" x2="44" y2="36" stroke="white" stroke-width="3" stroke-linecap="round"/>` +
      `<line x1="26" y1="33.2" x2="44" y2="20" stroke="white" stroke-width="3" stroke-linecap="round"/>`,
    CAREGIVER:
      `<ellipse cx="32" cy="32" rx="7" ry="6" fill="white"/>` +
      `<circle cx="23" cy="23" r="3.6" fill="white"/>` +
      `<circle cx="29" cy="19" r="3.6" fill="white"/>` +
      `<circle cx="35" cy="19" r="3.6" fill="white"/>` +
      `<circle cx="41" cy="23" r="3.6" fill="white"/>`,
    PARK:
      `<line x1="32" y1="32" x2="32" y2="42" stroke="white" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M22 37l10-13 10 13z" fill="white"/>` +
      `<path d="M24 31l8-11 8 11z" fill="white"/>`,
    HOTEL:
      `<path d="M20 42h24V26l-12-10L20 26v16z" stroke="white" stroke-width="3" fill="none" stroke-linejoin="round"/>` +
      `<rect x="27" y="34" width="10" height="8" stroke="white" stroke-width="3" fill="none"/>`,
    LOST_PET:
      `<circle cx="32" cy="26" r="11" stroke="white" stroke-width="3.5" fill="none"/>` +
      `<path d="M32 19v9M32 35v1" stroke="white" stroke-width="4" stroke-linecap="round"/>`,
  };

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_W}" height="${MARKER_H}" viewBox="0 0 ${MARKER_W} ${MARKER_H}">` +
    /* drop shadow */
    `<ellipse cx="32" cy="77" rx="10" ry="3.6" fill="rgba(0,0,0,0.18)"/>` +
    /* outer stroke for contrast against any background */
    `<path d="${pin}" fill="white" stroke="white" stroke-width="3"/>` +
    /* pin body */
    `<path d="${pin}" fill="${color}"/>` +
    /* specular highlight */
    `<circle cx="24" cy="18" r="10" fill="rgba(255,255,255,0.22)"/>` +
    /* icon */
    (icons[type] ?? `<circle cx="32" cy="28" r="10" fill="white"/>`) +
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
  className,
  borderless = false,
  showPopup = true,
  minZoom = 8,
  maxZoom = 17,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const pickedMarkerRef = useRef<any>(null);
  const mapLibraryRef = useRef<any>(null);
  const pointsRef = useRef<MapServicePoint[]>(points);
  const onSelectRef = useRef<typeof onSelectPoint>(onSelectPoint);
  const onPickLocationRef = useRef<typeof onPickLocation>(onPickLocation);
  const showPopupRef = useRef(showPopup);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    onSelectRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    onPickLocationRef.current = onPickLocation;
  }, [onPickLocation]);

  useEffect(() => {
    showPopupRef.current = showPopup;
  }, [showPopup]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    void ensureMapAssets()
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;

        if (!accessToken) {
          throw new Error("No se pudo cargar Mapbox: falta NEXT_PUBLIC_MAPBOX_TOKEN.");
        }

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
                clusterRadius: 50,
              });
            }

            map.addLayer({
              id: CLUSTER_LAYER_ID,
              type: "circle",
              source: SOURCE_ID,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": ["step", ["get","point_count"], "#0f172a", 30, "#1e293b", 80, "#334155"],
                "circle-radius": ["step", ["get","point_count"], 20, 30, 26, 80, 32],
                "circle-stroke-width": 3,
                "circle-stroke-color": "rgba(255,255,255,0.6)",
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
                "icon-size": 0.5,
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
              const point = pointsRef.current.find((item) => item.id === pointId);
              if (!point) return;
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
          } // end addLayers

          /* Load 2× SVG images for retina sharpness */
          for (const type of ALL_TYPES) {
            const img = new Image(MARKER_W, MARKER_H);
            img.onload = () => {
              map.addImage(`marker-${type}`, img, { pixelRatio: 2 });
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
      .catch(() => {
        // Keep silent. Parent component already renders a friendly fallback.
      });

    return () => {
      cancelled = true;
      popupRef.current?.remove?.();
      popupRef.current = null;
      pickedMarkerRef.current?.remove?.();
      pickedMarkerRef.current = null;

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
    if (!source) {
      return;
    }

    source.setData(toGeoJson(points));
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0 || selectedPointId) return;

    const maplibre = mapLibraryRef.current;
    if (!maplibre) return;

    const bounds = new maplibre.LngLatBounds();
    for (const point of points) {
      bounds.extend([point.longitude, point.latitude]);
    }

    map.fitBounds(bounds, {
      padding: 48,
      maxZoom: 13,
      duration: 700
    });
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
      const markerElement = document.createElement("div");
      markerElement.className = "h-4 w-4 rounded-full border-4 border-white bg-[hsl(var(--accent))] shadow-[0_8px_20px_rgba(15,23,42,0.24)]";
      pickedMarkerRef.current = new maplibre.Marker({
        element: markerElement
      });
    }

    pickedMarkerRef.current.setLngLat([pickedLocation.lng, pickedLocation.lat]).addTo(map);
    map.flyTo({
      center: [pickedLocation.lng, pickedLocation.lat],
      zoom: Math.max(13, map.getZoom()),
      duration: 450
    });
  }, [pickedLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    map.flyTo({
      center: [center.lng, center.lat],
      zoom: Math.max(11, map.getZoom()),
      duration: 450
    });
  }, [center]);

  const borderClasses = borderless ? "" : "rounded-2xl border border-slate-200";

  return (
    <div
      ref={containerRef}
      className={`${className ?? ""} ${borderClasses} overflow-hidden bg-slate-100`}
    />
  );
}
