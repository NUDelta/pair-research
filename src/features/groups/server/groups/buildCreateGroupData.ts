interface BuildCreateGroupDataInput {
  groupName: string
  groupDescription?: string | null
  creatorId: string
}

export function buildCreateGroupData({
  groupName,
  groupDescription,
  creatorId,
}: BuildCreateGroupDataInput) {
  return {
    name: groupName,
    description: groupDescription ?? null,
    creator_id: creatorId,
    active_pairing_id: null as string | null,
    active: true,
    created_at: new Date(),
  }
}
