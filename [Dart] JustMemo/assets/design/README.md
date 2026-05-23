# Design assets for JustMemo

Files created:
- `assets/design/app_icon.svg` — square app icon (1024×1024 SVG)
- `assets/design/feature_graphic.svg` — banner (1024×500 SVG)
- `assets/design/screenshot1.svg` — phone mockup (1080×2340 SVG)
- `assets/design/screenshot2.svg` — phone mockup (1080×2340 SVG)
- `assets/design/screenshot3.svg` — phone mockup (1080×2340 SVG)

Quick export commands (Windows, ImageMagick installed as `magick`):

```powershell
# Export 512x512 PNG app icon
magick -density 300 d:/Workspace/justmemo/assets/design/app_icon.svg -resize 512x512 d:/Workspace/justmemo/assets/design/app_icon_512.png

# Export Play Store feature graphic (PNG)
magick -density 144 d:/Workspace/justmemo/assets/design/feature_graphic.svg d:/Workspace/justmemo/assets/design/feature_graphic.png

# Export screenshots to PNG
magick -density 144 d:/Workspace/justmemo/assets/design/screenshot1.svg d:/Workspace/justmemo/assets/design/screenshot1.png
magick -density 144 d:/Workspace/justmemo/assets/design/screenshot2.svg d:/Workspace/justmemo/assets/design/screenshot2.png
magick -density 144 d:/Workspace/justmemo/assets/design/screenshot3.svg d:/Workspace/justmemo/assets/design/screenshot3.png
```

If you prefer SVG→PNG with Inkscape (CLI):

```powershell
inkscape d:/Workspace/justmemo/assets/design/app_icon.svg --export-type=png --export-filename=d:/Workspace/justmemo/assets/design/app_icon_512.png --export-width=512 --export-height=512
```

Want different colors, text in Korean/English, or additional sizes (iOS App Store, Play Store variants)? Tell me which sizes or color palette you prefer and I will export variants.
