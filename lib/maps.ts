export function osmEmbed(lat: number, lng: number, zoom = 0.02) {
  const bbox = [lng - zoom, lat - zoom * 0.7, lng + zoom, lat + zoom * 0.7].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}
