import type { MarketingPixel, PixelProvider } from "@/types/content";

export const PIXEL_INFO: Record<PixelProvider, { name: string; pattern: RegExp; example: string }> = {
  meta: { name: "Meta Pixel", pattern: /^\d{10,20}$/, example: "123456789012345" },
  tiktok: { name: "TikTok Pixel", pattern: /^[A-Z0-9]{16,24}$/, example: "C1ABCDEF2GHIJ3KLMNOP" },
  snapchat: { name: "Snapchat Pixel", pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
  ga4: { name: "Google Analytics 4", pattern: /^G-[A-Z0-9]{4,14}$/, example: "G-ABC123XYZ" },
  gtm: { name: "Google Tag Manager", pattern: /^GTM-[A-Z0-9]{4,10}$/, example: "GTM-ABC1234" },
};

export const validPixelId = (p: PixelProvider, id: string) => PIXEL_INFO[p].pattern.test(id.trim());

/** Pixels that may load on this deployment (enabled, valid id, production rule). */
export function activePixels(pixels: MarketingPixel[]) {
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";
  return pixels
    .filter((p) => p.enabled && validPixelId(p.provider, p.pixel_id) && (!p.production_only || isProd))
    .map((p) => ({ provider: p.provider, id: p.pixel_id.trim() }));
}

/**
 * Standard vendor snippets. Ids are validated against strict patterns above
 * before they reach this function, so they cannot inject markup.
 */
export function pixelSnippet(provider: PixelProvider, id: string): { src?: string; inline: string } {
  switch (provider) {
    case "meta":
      return {
        inline: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
      };
    case "tiktok":
      return {
        inline: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${id}');ttq.page();}(window,document,'ttq');`,
      };
    case "snapchat":
      return {
        inline: `(function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');snaptr('init','${id}',{});snaptr('track','PAGE_VIEW');`,
      };
    case "ga4":
      return {
        src: `https://www.googletagmanager.com/gtag/js?id=${id}`,
        inline: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
      };
    case "gtm":
      return {
        inline: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
      };
  }
}
