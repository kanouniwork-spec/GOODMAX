/**
 * Photos uploaded in Admin are stored as they were sent, often 1-2 MB PNGs. Public pages ask for them
 * through the Next.js image optimizer instead, which resizes them and sends WebP (see-through areas
 * kept), so a product photo is around a tenth of the size. Only files in the site's own Supabase
 * storage go this way, because that is the host next.config.ts allows; files that ship with the site
 * (/media/…) are already web-sized, and SVGs are left alone.
 */
export function webImage(url: string, width: 640 | 1200 | 1920 = 1200) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base || !url.startsWith(`${base}/storage/v1/object/public/`) || /\.svg$/i.test(url.split("?")[0])) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=75`;
}
