"use client";

import { useEffect, useRef } from "react";
import type { MapServicePoint, MapServiceType } from "@/features/map/types";

declare global {
  interface Window {
    mapboxgl?: any;
  }
}

const SOURCE_ID = "kumpa-pet-points-source";
const CLUSTER_LAYER_ID = "kumpa-pet-clusters-layer";
const CLUSTER_COUNT_LAYER_ID = "kumpa-pet-cluster-count-layer";
const POINT_LAYER_ID = "kumpa-pet-point-layer";

let mapboxAssetsPromise: Promise<void> | null = null;

function ensureMapboxAssets() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.mapboxgl) return Promise.resolve();
  if (mapboxAssetsPromise) return mapboxAssetsPromise;

  mapboxAssetsPromise = new Promise<void>((resolve, reject) => {
    const cssId = "mapbox-gl-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Mapbox GL"));
    document.body.appendChild(script);
  });

  return mapboxAssetsPromise;
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
}

export function MapCanvas({
  accessToken,
  points,
  selectedPointId = null,
  onSelectPoint,
  pickedLocation = null,
  onPickLocation,
  center = null,
  className
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const popupRef = useRef<any>(null);
  const pickedMarkerRef = useRef<any>(null);
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
    if (!accessToken || !containerRef.current || mapRef.current) {
      return;
    }

    let cancelled = false;

    void ensureMapboxAssets()
      .then(() => {
        if (cancelled || !containerRef.current || !window.mapboxgl) return;

        window.mapboxgl.accessToken = accessToken;
        const map = new window.mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: center ? [center.lng, center.lat] : [-70.65, -33.45],
          zoom: 9.2
        });

        map.addControl(new window.mapboxgl.NavigationControl(), "top-right");
        mapRef.current = map;
        popupRef.current = new window.mapboxgl.Popup({ closeButton: true, closeOnClick: false });

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
  }, [accessToken]);

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

    const bounds = new window.mapboxgl.LngLatBounds();
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
    if (!map || !pickedLocation || !window.mapboxgl) return;

    if (!pickedMarkerRef.current) {
      const markerElement = document.createElement("div");
      markerElement.className = "h-4 w-4 rounded-full border-4 border-white bg-[hsl(var(--accent))] shadow-[0_8px_20px_rgba(15,23,42,0.24)]";
      pickedMarkerRef.current = new window.mapboxgl.Marker({
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

  if (!accessToken) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900`}
      >
        Configura `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` para visualizar el mapa.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`${className ?? ""} overflow-hidden rounded-2xl border border-slate-200 bg-slate-100`}
    />
  );
}
