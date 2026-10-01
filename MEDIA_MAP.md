# Media map

| File (public/media) | From | Used for | Notes |
|---|---|---|---|
| goodmax-logo.png | supplied Logo.png (cropped) | header, footer, admin | already transparent, production ready |
| goodmax-logo-white.png | generated from logo | video intro, header over video | white version |
| ../../app/icon.png | generated from logo (X mark) | favicon | |
| product-scroll.mp4 | supplied product-scroll.mp4 | scroll video, desktop | 1080p H.264, keyframe every 4 frames, 10.8 MB |
| product-scroll-720.mp4 | same | scroll video, mobile | 720p, 4.0 MB |
| product-scroll.webm | same | fallback for browsers without H.264 | VP9, 5.7 MB |
| product-scroll-poster.jpg / -mobile.jpg | first frame | shown before the video loads | |
| still-razor-front.jpg, still-razor-back.jpg, still-blade-closeup.jpg, still-cartridge.jpg | frames from the video | product page, product cards, about | have the video background, not transparent |

## Still missing

- **Transparent product PNG** (razor cut out on a transparent background). The floating product effect currently uses video stills; replace them in Admin → Media → "Replace" and every place using them updates.
- Brand logos for the other brands (two demo brands are placeholders).
- Photos for locations / distributors if wanted.

Originals are kept in `media-src/` (the large mp4 is git-ignored; re-run `npm run media` to regenerate).
