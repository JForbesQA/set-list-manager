import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Keep the artwork edge to edge so the home-screen icon fills its tile.
    apple: { ...minimal2023Preset.apple, padding: 0 },
    maskable: { ...minimal2023Preset.maskable, padding: 0.1 },
    transparent: { ...minimal2023Preset.transparent, padding: 0.1 },
  },
  images: ['public/icon.svg'],
})
