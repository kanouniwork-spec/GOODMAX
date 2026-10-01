"""Crops the owner's transparent logo tight and makes a white variant for dark backgrounds (same alpha)."""
from PIL import Image
src = Image.open("media-src/goodmax-logo-original.png").convert("RGBA")
bbox = src.getbbox()
pad = 6
bbox = (bbox[0]-pad, bbox[1]-pad, bbox[2]+pad, bbox[3]+pad)
navy = src.crop(bbox)
navy.save("public/media/goodmax-logo.png", optimize=True)
alpha = navy.getchannel("A")
white = Image.new("RGBA", navy.size, (255, 255, 255, 0)); white.putalpha(alpha)
white.save("public/media/goodmax-logo-white.png", optimize=True)
print(navy.size)
# favicon: the X glyph (rightmost part of the wordmark) on navy
x0 = int(navy.size[0] * 0.785)
mark = white.crop((x0, 0, navy.size[0], navy.size[1]))
s = max(mark.size)
fav = Image.new("RGBA", (s + 40, s + 40), (7, 47, 84, 255))
fav.alpha_composite(mark, ((s + 40 - mark.size[0]) // 2, (s + 40 - mark.size[1]) // 2))
fav.resize((128, 128), Image.LANCZOS).save("app/icon.png")
