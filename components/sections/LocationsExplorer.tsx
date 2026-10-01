"use client";

import { useMemo, useState } from "react";
import { osmEmbed } from "@/lib/maps";

export type LocationView = {
  id: string;
  name: string;
  type: string;
  wilaya: string;
  wilayaLabel: string;
  municipality: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  mapsUrl: string;
  lat: number | null;
  lng: number | null;
};


export function LocationsExplorer({
  locations,
  labels,
}: {
  locations: LocationView[];
  labels: { all: string; directions: string; hours: string; map: string };
}) {
  const [wilaya, setWilaya] = useState("");
  const list = useMemo(() => (wilaya ? locations.filter((l) => l.wilaya === wilaya) : locations), [wilaya, locations]);
  const [selected, setSelected] = useState(list[0]?.id);
  const sel = list.find((l) => l.id === selected) ?? list[0];
  const wilayas = useMemo(() => {
    const m = new Map<string, string>();
    locations.forEach((l) => l.wilaya && m.set(l.wilaya, l.wilayaLabel));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [locations]);

  return (
    <>
      {wilayas.length > 1 && (
        <div className="filter-bar">
          <button type="button" className="chip" aria-current={!wilaya} onClick={() => setWilaya("")}>
            {labels.all}
          </button>
          {wilayas.map(([w, label]) => (
            <button key={w} type="button" className="chip" aria-current={wilaya === w} onClick={() => setWilaya(w)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="loc-layout">
        <div className="loc-list">
          {list.map((l) => (
            <button key={l.id} type="button" className="loc-card" aria-pressed={sel?.id === l.id} onClick={() => setSelected(l.id)}>
              <small>
                {l.type} · {l.wilayaLabel}
              </small>
              <b>{l.name}</b>
              {(l.address || l.municipality) && <p>{[l.address, l.municipality].filter(Boolean).join(" — ")}</p>}
              {l.hours && (
                <span>
                  {labels.hours}: {l.hours}
                </span>
              )}
              {l.phone && (
                <span dir="ltr" style={{ textAlign: "start" }}>
                  {l.phone}
                </span>
              )}
              {l.mapsUrl && (
                <a className="text-link" href={l.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  {labels.directions} →
                </a>
              )}
            </button>
          ))}
        </div>
        {sel?.lat != null && sel?.lng != null ? (
          <iframe key={sel.id} className="map-frame" title={`${labels.map}: ${sel.name}`} src={osmEmbed(sel.lat, sel.lng)} loading="lazy" />
        ) : (
          <div className="map-frame empty" style={{ display: "grid", placeItems: "center" }}>
            {labels.map}
          </div>
        )}
      </div>
    </>
  );
}
