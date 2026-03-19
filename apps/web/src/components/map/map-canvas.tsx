"use client";

import { useEffect, useRef } from "react";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

const SOURCE_ID = "kumpa-pet-points-source";
const CLUSTER_LAYER_ID = "kumpa-pet-clusters-layer";
const CLUSTER_COUNT_LAYER_ID = "kumpa-pet-cluster-count-layer";
const POINT_LAYER_ID = "kumpa-pet-point-layer";

let mapLibraryPromise: Promise<any> | null = null;

const FALLBACK_MAP_STYLE = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    }
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 22
    }
  ]
} as const;

const FALLBACK_MAP_STYLE = {
  version: 8,
  sources: {
    "osm-tiles": {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
    }
  },
  layers: [
    {
      id: "osm-tiles-layer",
      type: "raster",
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 22
    }
  ]
} as const;

function ensureMapboxAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  if (mapLibraryPromise) return mapLibraryPromise;

  mapLibraryPromise = new Promise<any>((resolve, reject) => {
    const cssId = "maplibre-gl-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    void import("maplibre-gl")
      .then((maplibre) => resolve(maplibre))
      .catch(() => reject(new Error("No se pudo cargar MapLibre GL")));
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
}

export function MapCanvas({
  points,
  selectedPointId = null,
  onSelectPoint,
  pickedLocation = null,
  onPickLocation,
  center = null,
  className,
  borderless = false
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const pickedMarkerRef = useRef<any>(null);
  const mapLibraryRef = useRef<any>(null);
  const pointsRef = useRef<MapServicePoint[]>(points);
  const onSelectRef = useRef<typeof onSelectPoint>(onSelectPoint);
  const onPickLocationRef = useRef<typeof onPickLocation>(onPickLocation);

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
    if (!containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    void ensureMapAssets()
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;

        if (accessToken) {
          window.mapboxgl.accessToken = accessToken;
        }
        const map = new window.mapboxgl.Map({
          container: containerRef.current,
          style: FALLBACK_MAP_STYLE,
          center: center ? [center.lng, center.lat] : [-70.65, -33.45],
          zoom: 9.2
        });

        map.addControl(new maplibre.NavigationControl(), "top-right");
        mapRef.current = map;
        popupRef.current = new maplibre.Popup({ closeButton: true, closeOnClick: false });

        map.on("load", () => {
          if (!map.getSource(SOURCE_ID)) {
            map.addSource(SOURCE_ID, {
              type: "geojson",
              data: toGeoJson(pointsRef.current),
              cluster: true,
              clusterMaxZoom: 13,
              clusterRadius: 50
            });
          }

          map.addLayer({
            id: CLUSTER_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": [
                "step",
                ["get", "point_count"],
                "#0f172a",
                30,
                "#1e293b",
                80,
                "#334155"
              ],
              "circle-radius": ["step", ["get", "point_count"], 18, 30, 24, 80, 30]
            }
          });

          map.addLayer({
            id: CLUSTER_COUNT_LAYER_ID,
            type: "symbol",
            source: SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"]
            },
            paint: {
              "text-color": "#ffffff"
            }
          });

          map.addLayer({
            id: POINT_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": 8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-color": [
                "match",
                ["get", "type"],
                "VET",
                markerColor("VET"),
                "CAREGIVER",
                markerColor("CAREGIVER"),
                "SHOP",
                markerColor("SHOP"),
                "GROOMING",
                markerColor("GROOMING"),
                "HOTEL",
                markerColor("HOTEL"),
                "PARK",
                markerColor("PARK"),
                markerColor("LOST_PET")
              ]
            }
          });

          map.on("click", CLUSTER_LAYER_ID, (event: any) => {
            const features = map.queryRenderedFeatures(event.point, {
              layers: [CLUSTER_LAYER_ID]
            });
            const clusterFeature = features?.[0];
            const clusterId = clusterFeature?.properties?.cluster_id;
            const source = map.getSource(SOURCE_ID);

            if (!source || clusterId === undefined) {
              return;
            }

            source.getClusterExpansionZoom(clusterId, (error: Error | null, zoom: number) => {
              if (error) return;
              map.easeTo({
                center: clusterFeature.geometry.coordinates,
                zoom
              });
            });
          });

          map.on("click", POINT_LAYER_ID, (event: any) => {
            const feature = event.features?.[0];
            const pointId = feature?.properties?.id as string | undefined;
            if (!pointId) return;

            const point = pointsRef.current.find((item) => item.id === pointId);
            if (!point) return;

            onSelectRef.current?.(pointId);
            popupRef.current
              ?.setLngLat([point.longitude, point.latitude])
              .setHTML(popupHtml(point))
              .addTo(map);
          });

          if (onPickLocationRef.current) {
            map.on("click", (event: any) => {
              const interactiveFeatures = map.queryRenderedFeatures(event.point, {
                layers: [CLUSTER_LAYER_ID, POINT_LAYER_ID]
              });

              if (interactiveFeatures.length > 0) {
                return;
              }

              onPickLocationRef.current?.({
                lat: event.lngLat.lat,
                lng: event.lngLat.lng
              });
            });
          }

          const pointerLayers = [CLUSTER_LAYER_ID, POINT_LAYER_ID];
          for (const layerId of pointerLayers) {
            map.on("mouseenter", layerId, () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", layerId, () => {
              map.getCanvas().style.cursor = "";
            });
          }

          if (onPickLocationRef.current) {
            map.getCanvas().style.cursor = "crosshair";
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

    popupRef.current
      ?.setLngLat([selected.longitude, selected.latitude])
      .setHTML(popupHtml(selected))
      .addTo(map);
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
