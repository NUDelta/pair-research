import { describe, expect, it } from 'vitest'
import { getGoogleOneTapNextPath, shouldShowGoogleOneTap } from './googleOneTap'

describe('googleOneTap', () => {
  it('only prompts on public entry and auth pages', () => {
    expect(shouldShowGoogleOneTap('/')).toBe(true)
    expect(shouldShowGoogleOneTap('/login')).toBe(true)
    expect(shouldShowGoogleOneTap('/signup')).toBe(true)
    expect(shouldShowGoogleOneTap('/groups')).toBe(false)
    expect(shouldShowGoogleOneTap('/privacy')).toBe(false)
  })

  it('sanitizes next path values from auth page search params', () => {
    expect(getGoogleOneTapNextPath({ pathname: '/login', search: '?next=%2Fgroups%2Fdemo' })).toBe('/groups/demo')
    expect(getGoogleOneTapNextPath({ pathname: '/login', search: '?next=https%3A%2F%2Fevil.example' })).toBe('/groups')
    expect(getGoogleOneTapNextPath({ pathname: '/', search: '' })).toBe('/groups')
  })
})
