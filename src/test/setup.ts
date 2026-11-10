import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount components rendered by Testing Library so tests stay isolated.
afterEach(() => {
  cleanup()
})

// jsdom tidak mengimplementasikan pemutaran media: `play()` mencetak
// "Not implemented" ke konsol dan tidak pernah mulai. Musik latar hanya perlu
// bisa dipanggil tanpa noise; perilaku nyata diverifikasi di browser.
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: () => Promise.resolve(),
})
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: () => {},
})
