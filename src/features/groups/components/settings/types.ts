export interface GroupSettingsRole {
  id: string
  title: string
  isOptimistic?: boolean
}

export interface GroupSettingsMember {
  userId: string
  fullName: string | null
  avatarUrl: string | null
  email: string
  roleId: string
  roleTitle: string
  isAdmin: boolean
  isPending: boolean
  joinedAt: string
  isCreator: boolean
  isOptimistic?: boolean
}

export interface GroupSettingsData {
  group: {
    id: string
    name: string
    description: string | null
    creatorId: string
    activePairingId: string | null
  }
  currentUserId: string
  roles: GroupSettingsRole[]
  members: GroupSettingsMember[]
}
