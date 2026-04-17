import type { Draft } from 'immer'
import type { Group } from '@/features/groups/schemas/group'
import { applyPatches, enablePatches, produceWithPatches } from 'immer'

enablePatches()

export type GroupListOptimisticRecipe = (draft: Draft<Group[]>) => void
export type ApplyGroupListOptimisticUpdate = (recipe: GroupListOptimisticRecipe) => () => void

interface GroupListOptimisticUpdate {
  nextState: Group[]
  rollback: (currentState: Group[]) => Group[]
}

export function createGroupListOptimisticUpdate(
  state: Group[],
  recipe: GroupListOptimisticRecipe,
): GroupListOptimisticUpdate {
  const [nextState, , inversePatches] = produceWithPatches(state, recipe)

  return {
    nextState,
    rollback: currentState => applyPatches(currentState, inversePatches),
  }
}

export function applyInvitationAcceptance(
  draft: Draft<Group[]>,
  groupId: string,
) {
  const group = draft.find(candidateGroup => candidateGroup.id === groupId)
  if (group === undefined) {
    return false
  }

  group.isPending = false
  return true
}
