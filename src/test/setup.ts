import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Unmount components rendered by Testing Library so tests stay isolated.
afterEach(() => {
  cleanup()
})
