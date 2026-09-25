# Android launcher icon

## Build
- Add an Android-only icon sync script that reads `assets/app-icon.png`.
- Generate legacy square and round launcher PNGs for mdpi through xxxhdpi.
- Generate adaptive foreground assets with safe inset space so Android masks do not crop the Battery Doc artwork.
- Configure adaptive icon XML to use the generated foreground and the existing solid background color.
- Run the icon sync after Capacitor creates or syncs Android, so future `sync:android` runs keep the branded icon.

## Verify
- Confirm all expected Android densities and adaptive resources exist with correct dimensions.
- Run Android resource/build validation and ensure no iOS files changed.
- Report the exact changed files.

## Technical details
- The source remains the existing opaque 1024×1024 PNG.
- Android-only generation uses the project’s available image tooling during local sync; the generated files are committed so Android Studio can build immediately.
- No purchase, calculation, report, or iOS configuration changes.
