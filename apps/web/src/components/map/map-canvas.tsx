"use client";

import { useEffect, useRef } from "react";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const SOURCE_ID = "kumpa-pet-points-source";
const CLUSTER_LAYER_ID = "kumpa-pet-clusters-layer";
const CLUSTER_COUNT_LAYER_ID = "kumpa-pet-cluster-count-layer";
const POINT_LAYER_ID = "kumpa-pet-point-layer";

let mapLibraryPromise: Promise<any> | null = null;

const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";

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

function markerLabel(type: MapServiceType): string {
  if (type === "VET") return "Veterinaria";
  if (type === "CAREGIVER") return "Cuidador";
  if (type === "SHOP") return "Pet shop";
  if (type === "GROOMING") return "Peluqueria";
  if (type === "HOTEL") return "Hotel";
  if (type === "PARK") return "Parque";
  return "Mascota perdida";
}

/* Pin SVG por tipo — 32×40, punta abajo, icono blanco dentro */
function markerSvg(type: MapServiceType): string {
  const color = markerColor(type);
  const pin = "M16 38C16 38 4 22 4 14C4 7.373 9.373 2 16 2C22.627 2 28 7.373 28 14C28 22 16 38 16 38Z";

  const icons: Record<MapServiceType, string> = {
    VET:
      `<path d="M16 7v14M9 14h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>`,
    SHOP:
      `<path d="M11 13h10l-1.5 7h-7L11 13z" stroke="white" stroke-width="1.5" fill="none" stroke-linejoin="round"/>` +
      `<path d="M13.5 13V11.5a2.5 2.5 0 015 0V13" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,
    GROOMING:
      `<circle cx="11.5" cy="10" r="2" stroke="white" stroke-width="1.5" fill="none"/>` +
      `<circle cx="11.5" cy="18" r="2" stroke="white" stroke-width="1.5" fill="none"/>` +
      `<line x1="13" y1="11.4" x2="22" y2="18" stroke="white" stroke-width="1.5" stroke-linecap="round"/>` +
      `<line x1="13" y1="16.6" x2="22" y2="10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>`,
    CAREGIVER:
      `<ellipse cx="16" cy="16" rx="3.5" ry="3" fill="white"/>` +
      `<circle cx="11.5" cy="11.5" r="1.8" fill="white"/>` +
      `<circle cx="14.5" cy="9.5" r="1.8" fill="white"/>` +
      `<circle cx="17.5" cy="9.5" r="1.8" fill="white"/>` +
      `<circle cx="20.5" cy="11.5" r="1.8" fill="white"/>`,
    PARK:
      `<line x1="16" y1="16" x2="16" y2="21" stroke="white" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M11 18.5l5-6.5 5 6.5z" fill="white"/>` +
      `<path d="M12 15.5l4-5.5 4 5.5z" fill="white"/>`,
    HOTEL:
      `<path d="M10 21h12V13l-6-5L10 13v8z" stroke="white" stroke-width="1.5" fill="none" stroke-linejoin="round"/>` +
      `<rect x="13.5" y="17" width="5" height="4" stroke="white" stroke-width="1.5" fill="none"/>`,
    LOST_PET:
      `<circle cx="16" cy="13" r="5.5" stroke="white" stroke-width="1.8" fill="none"/>` +
      `<path d="M16 9.5v4.5M16 17.5v.5" stroke="white" stroke-width="2" stroke-linecap="round"/>`,
  };

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">` +
    /* sombra en el suelo */
    `<ellipse cx="16" cy="38.5" rx="5" ry="1.8" fill="rgba(0,0,0,0.18)"/>` +
    /* cuerpo del pin */
    `<path d="${pin}" fill="${color}"/>` +
    /* brillo especular (efecto 3D) */
    `<circle cx="12" cy="9" r="5" fill="rgba(255,255,255,0.22)"/>` +
    /* icono */
    (icons[type] ?? `<circle cx="16" cy="14" r="5" fill="white"/>`) +
    `</svg>`
  );
}

function popupHtml(point: MapServicePoint): string {
  const lines: string[] = [];
  lines.push(
    `<p style="margin:0;font-size:13px;font-weight:700;color:#0f172a;">${point.name}</p>`
  );
  lines.push(
    `<p style="margin:2px 0 0;font-size:12px;color:#475569;">${markerLabel(point.type)}</p>`
  );

  if (point.subtitle) {
    lines.push(`<p style="margin:2px 0 0;font-size:12px;color:#334155;">${point.subtitle}</p>`);
  }

  if (point.distanceKm !== null) {
    lines.push(
      `<p style="margin:2px 0 0;font-size:12px;color:#475569;">${point.distanceKm.toFixed(1)} km</p>`
    );
  }

  if (point.address) {
    lines.push(`<p style="margin:2px 0 0;font-size:12px;color:#64748b;">${point.address}</p>`);
  }

  return `<div style="max-width:240px;font-family:ui-sans-serif,system-ui,sans-serif;">${lines.join("")}</div>`;
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
          zoom: 9.2
        });

        map.addControl(new maplibre.NavigationControl(), "top-right");
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
                "circle-radius": ["step", ["get","point_count"], 18, 30, 24, 80, 30],
              },
            });

            map.addLayer({
              id: CLUSTER_COUNT_LAYER_ID,
              type: "symbol",
              source: SOURCE_ID,
              filter: ["has", "point_count"],
              layout: {
                "text-field": ["get","point_count_abbreviated"],
                "text-size": 12,
                "text-font": ["DIN Offc Pro Medium","Arial Unicode MS Bold"],
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
                map.easeTo({ center: clusterFeature.geometry.coordinates, zoom });
              });
            });

            map.on("click", POINT_LAYER_ID, (event: any) => {
              const feature = event.features?.[0];
              const pointId = feature?.properties?.id as string | undefined;
              if (!pointId) return;
              const point = pointsRef.current.find((item) => item.id === pointId);
              if (!point) return;
              onSelectRef.current?.(pointId);
              if (showPopupRef.current) {
                popupRef.current
                  ?.setLngLat([point.longitude, point.latitude])
                  .setHTML(popupHtml(point))
                  .addTo(map);
              }
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

          /* Cargar imágenes SVG y luego montar capas */
          for (const type of ALL_TYPES) {
            const img = new Image(32, 40);
            img.onload = () => {
              map.addImage(`marker-${type}`, img);
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
  }, [accessToken, center]);

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

    if (showPopupRef.current) {
      popupRef.current
        ?.setLngLat([selected.longitude, selected.latitude])
        .setHTML(popupHtml(selected))
        .addTo(map);
    }
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
