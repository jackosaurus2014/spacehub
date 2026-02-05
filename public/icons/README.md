# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

## Required Icons

1. **icon-192x192.png** - 192x192 pixel PNG icon
   - Used for Android home screen
   - Should be a square image with the SpaceNexus logo

2. **icon-512x512.png** - 512x512 pixel PNG icon
   - Used for Android splash screen
   - Should be a square image with the SpaceNexus logo

## Generating Icons

You can generate these icons from the existing SpaceNexus logo (`/public/spacenexus-logo.png`) using:

### Online Tools
- https://realfavicongenerator.net
- https://www.pwabuilder.com/imageGenerator

### Command Line (using ImageMagick)
```bash
# From the project root
convert public/spacenexus-logo.png -resize 192x192 -background "#0f172a" -gravity center -extent 192x192 public/icons/icon-192x192.png
convert public/spacenexus-logo.png -resize 512x512 -background "#0f172a" -gravity center -extent 512x512 public/icons/icon-512x512.png
```

### Requirements
- Icons should have a dark background (#0f172a) to match the app theme
- Icons should be maskable (safe zone in the center 80%)
- Use PNG format with transparency if needed

## Screenshots (Optional)

The manifest also references screenshots in `/public/screenshots/`:
- `desktop.png` - 1280x720 desktop screenshot
- `mobile.png` - 750x1334 mobile screenshot

These are used in the PWA install UI on supported browsers.
