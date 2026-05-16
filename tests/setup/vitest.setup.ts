import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (globalThis.ResizeObserver === undefined) {
  globalThis.ResizeObserver = ResizeObserverMock
}

afterEach(() => {
  cleanup()
})
