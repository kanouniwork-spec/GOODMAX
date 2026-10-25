export function osmEmbed(lat: number, lng: number, zoom = 0.02) {
  const bbox = [lng - zoom, lat - zoom * 0.7, lng + zoom, lat + zoom * 0.7].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/** The area the network map draws (Algeria with a small margin); coordinates outside it would fall off the map. */
export const MAP_BOUNDS = { west: -9.2, east: 12.3, south: 18.6, north: 37.6 };
export const isOnMap = (lat: number, lng: number) => lat >= MAP_BOUNDS.south && lat <= MAP_BOUNDS.north && lng >= MAP_BOUNDS.west && lng <= MAP_BOUNDS.east;

const NUM = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
// most precise first: the place itself, then an explicit query, then the map view's centre
const COORD_PATTERNS = [
  new RegExp(String.raw`!3d${NUM}!4d${NUM}`),
  new RegExp(String.raw`[?&](?:q|query|ll|center)=${NUM}\s*,\s*${NUM}`),
  new RegExp(String.raw`/(?:place|search)/${NUM}\s*,\s*${NUM}`),
  new RegExp(String.raw`@${NUM},${NUM}`),
  new RegExp(String.raw`^\s*${NUM}\s*,\s*${NUM}\s*$`),
];

/** Coordinates written in a Google Maps link (or a bare "36.19, 5.41"), when they fall on the map. */
export function coordsFromMapsText(text: string): { lat: number; lng: number } | null {
  let s = text.replace(/\+/g, " ");
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep the raw text */
  }
  for (const re of COORD_PATTERNS) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (isOnMap(lat, lng)) return { lat, lng };
  }
  return null;
}

/** A Google Maps link to a point, for locations that have coordinates but no link of their own. */
export const googleMapsAt = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
