import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import Bgm from './Bgm'

/**
 * Musik latar: tombol pojok kanan atas, pilihan disimpan, dan berkasnya satu
 * loop statis. Pemutaran nyata (autoplay policy, audio benar-benar berbunyi)
 * hanya bisa dibuktikan di browser — di sini yang diuji kontrak tombolnya.
 */
describe('musik latar', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => window.localStorage.clear())

  it('bawaan menyala dan tombol menawarkan mematikan musik', () => {
    render(<Bgm />)
    const button = screen.getByRole('button', { name: 'Matikan musik latar' })
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  it('klik mematikan musik, pilihan disimpan, dan remount membacanya', () => {
    const { unmount } = render(<Bgm />)
    fireEvent.click(screen.getByRole('button', { name: 'Matikan musik latar' }))

    const off = screen.getByRole('button', { name: 'Nyalakan musik latar' })
    expect(off.getAttribute('aria-pressed')).toBe('false')
    expect(window.localStorage.getItem('rambu:bgm')).toBe('off')
    unmount()

    render(<Bgm />)
    expect(screen.getByRole('button', { name: 'Nyalakan musik latar' })).toBeTruthy()
    expect(window.localStorage.getItem('rambu:bgm')).toBe('off')
  })

  it('audio memakai berkas loop statis tanpa kontrol yang tampil', () => {
    const { container } = render(<Bgm />)
    const audio = container.querySelector('audio')
    expect(audio?.getAttribute('src')).toBe('/bgm.mp3')
    expect(audio?.loop).toBe(true)
    expect(audio?.hasAttribute('controls')).toBe(false)
    expect(audio?.getAttribute('aria-hidden')).toBe('true')
  })
})
