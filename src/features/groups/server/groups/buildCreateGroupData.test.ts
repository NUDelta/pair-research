import { describe, expect, it } from 'vitest'
import { buildCreateGroupData } from './buildCreateGroupData'

describe('buildCreateGroupData', () => {
  it('forces new groups to start without an active pairing id', () => {
    const result = buildCreateGroupData({
      groupName: 'Weekly Lab',
      groupDescription: 'Discuss drafts',
      creatorId: 'user-1',
    })

    expect(result).toMatchObject({
      name: 'Weekly Lab',
      description: 'Discuss drafts',
      creator_id: 'user-1',
      active_pairing_id: null,
      active: true,
    })
    expect(result.created_at).toBeInstanceOf(Date)
  })

  it('normalizes empty descriptions to null', () => {
    const result = buildCreateGroupData({
      groupName: 'Weekly Lab',
      groupDescription: null,
      creatorId: 'user-1',
    })

    expect(result.description).toBeNull()
  })

  it('trims the group name and description before persistence', () => {
    const result = buildCreateGroupData({
      groupName: '  Weekly Lab  ',
      groupDescription: '  Discuss drafts  ',
      creatorId: 'user-1',
    })

    expect(result.name).toBe('Weekly Lab')
    expect(result.description).toBe('Discuss drafts')
  })
})
