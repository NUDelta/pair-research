import type { ApplyGroupSettingsOptimisticUpdate } from '../optimisticGroupSettings'
import type { GroupSettingsMember, GroupSettingsRole } from '../types'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { bulkUpdateGroupMemberRoles } from '@/features/groups/server/groups/bulkUpdateGroupMemberRoles'
import { removeGroupMember } from '@/features/groups/server/groups/removeGroupMember'
import { updateGroupMember } from '@/features/groups/server/groups/updateGroupMember'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable } from '@/shared/ui/data-table'
import { applyBulkMemberRoleUpdate, applyMemberRemoval, applyMemberUpdate } from '../optimisticGroupSettings'
import GroupMembersToolbar from './GroupMembersToolbar'
import { createGroupMemberColumns } from './memberTableColumns'
import { buildGroupMemberTableRows } from './memberTableRows'

interface GroupMembersTableProps {
  applyOptimisticUpdate: ApplyGroupSettingsOptimisticUpdate
  creatorId: string
  currentUserId: string
  groupId: string
  hasActivePairing: boolean
  members: GroupSettingsMember[]
  roles: GroupSettingsRole[]
}

type MemberPendingActions = Record<string, { access?: boolean, remove?: boolean, role?: boolean }>

export default function GroupMembersTable({
  applyOptimisticUpdate,
  creatorId,
  currentUserId,
  groupId,
  hasActivePairing,
  members,
  roles,
}: GroupMembersTableProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const bulkUpdateGroupMemberRolesFn = useServerFn(bulkUpdateGroupMemberRoles)
  const removeGroupMemberFn = useServerFn(removeGroupMember)
  const updateGroupMemberFn = useServerFn(updateGroupMember)
  const [pendingActions, setPendingActions] = useState<MemberPendingActions>({})
  const [isBulkRemoving, startBulkRemoveTransition] = useTransition()
  const [isBulkUpdatingRole, startBulkUpdateRoleTransition] = useTransition()

  const data = useMemo(
    () => buildGroupMemberTableRows({
      currentUserId,
      hasActivePairing,
      members,
    }),
    [currentUserId, hasActivePairing, members],
  )

  const memberState = useMemo(
    () =>
      Object.fromEntries(members.map(member => [
        member.userId,
        {
          isAdmin: member.isAdmin,
          roleId: member.roleId,
        },
      ])),
    [members],
  )

  const setMemberPendingAction = useCallback((
    userId: string,
    action: 'access' | 'remove' | 'role',
    isPending: boolean,
  ) => {
    setPendingActions((current) => {
      const nextState = {
        ...(current[userId] ?? {}),
        [action]: isPending,
      }

      if (!nextState.access && !nextState.remove && !nextState.role) {
        const { [userId]: _removed, ...rest } = current
        return rest
      }

      return {
        ...current,
        [userId]: nextState,
      }
    })
  }, [])

  const persistMemberUpdate = useCallback(async (
    member: GroupSettingsMember,
    nextState: { isAdmin: boolean, roleId: string },
    action: 'access' | 'role',
  ) => {
    const rollback = applyOptimisticUpdate((draft) => {
      applyMemberUpdate(draft, {
        userId: member.userId,
        isAdmin: nextState.isAdmin,
        roleId: nextState.roleId,
      })
    })
    setMemberPendingAction(member.userId, action, true)

    const response = await updateGroupMemberFn({
      data: {
        groupId,
        userId: member.userId,
        roleId: nextState.roleId,
        isAdmin: nextState.isAdmin,
      },
    })

    setMemberPendingAction(member.userId, action, false)

    if (!response.success) {
      rollback()
      toast.error(response.message)
      return
    }

    toast.success(response.message)

    if (response.lostManagementAccess === true && member.userId === currentUserId) {
      await navigate({ to: '/groups/$slug', params: { slug: groupId } })
      return
    }

    void router.invalidate()
  }, [applyOptimisticUpdate, currentUserId, groupId, navigate, router, setMemberPendingAction, updateGroupMemberFn])

  const removeMember = useCallback(async (member: GroupSettingsMember) => {
    const rollback = applyOptimisticUpdate((draft) => {
      applyMemberRemoval(draft, [member.userId])
    })
    setMemberPendingAction(member.userId, 'remove', true)

    const response = await removeGroupMemberFn({
      data: {
        groupId,
        userId: member.userId,
      },
    })

    setMemberPendingAction(member.userId, 'remove', false)

    if (!response.success) {
      rollback()
      toast.error(response.message)
      return
    }

    toast.success(response.message)
    void router.invalidate()
  }, [applyOptimisticUpdate, groupId, removeGroupMemberFn, router, setMemberPendingAction])

  const actionableRoles = useMemo(
    () => roles.filter(role => !role.isOptimistic),
    [roles],
  )

  const columns = useMemo(
    () => createGroupMemberColumns({
      creatorId,
      onAccessChange: (member, nextIsAdmin) => {
        const state = memberState[member.userId] ?? {
          isAdmin: member.isAdmin,
          roleId: member.roleId,
        }

        void persistMemberUpdate(member, {
          ...state,
          isAdmin: nextIsAdmin,
        }, 'access')
      },
      onRemove: removeMember,
      onRoleChange: (member, nextRoleId) => {
        const state = memberState[member.userId] ?? {
          isAdmin: member.isAdmin,
          roleId: member.roleId,
        }

        void persistMemberUpdate(member, {
          ...state,
          roleId: nextRoleId,
        }, 'role')
      },
      pendingActions,
      roles,
      rowState: memberState,
    }),
    [creatorId, memberState, pendingActions, persistMemberUpdate, removeMember, roles],
  )

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage invitations, roles, and admin access directly from the table.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div
          data-testid="group-members-scroll-region"
          className="flex flex-col gap-4"
        >
          {hasActivePairing && (
            <div className="mx-4 rounded-lg border border-dashed px-4 py-3 sm:mx-6">
              <p className="font-medium">Active pairing in progress</p>
              <p className="text-sm text-muted-foreground">
                Confirmed members stay locked until the pool is reset. Pending invitations can still be removed.
              </p>
            </div>
          )}
          <DataTable
            columns={columns}
            data={data}
            emptyMessage="No members found for this group."
            filterColumnId="displayName"
            filterPlaceholder="Filter members..."
            getRowId={row => row.userId}
            renderToolbar={(table) => {
              const selectedMembers = table.getFilteredSelectedRowModel().rows.map(row => row.original)
              const selectedRemovableMembers = selectedMembers.filter(member => member.canRemove)
              const hasNonRemovableSelected = selectedMembers.some(member => !member.canRemove)

              return (
                <GroupMembersToolbar
                  applyOptimisticUpdate={applyOptimisticUpdate}
                  existingMemberEmails={members.map(member => member.email)}
                  groupId={groupId}
                  hasNonRemovableSelected={hasNonRemovableSelected}
                  isBulkRemoving={isBulkRemoving}
                  isBulkUpdatingRole={isBulkUpdatingRole}
                  onBulkRemove={async () => {
                    startBulkRemoveTransition(async () => {
                      const removableMemberIds = selectedRemovableMembers.map(member => member.userId)
                      const failedMemberIds: string[] = []
                      const rollback = applyOptimisticUpdate((draft) => {
                        applyMemberRemoval(draft, removableMemberIds)
                      })
                      let removedCount = 0
                      const failures: string[] = []

                      table.resetRowSelection()

                      for (const member of selectedRemovableMembers) {
                        const response = await removeGroupMemberFn({
                          data: {
                            groupId,
                            userId: member.userId,
                          },
                        })

                        if (response.success) {
                          removedCount += 1
                          continue
                        }

                        failedMemberIds.push(member.userId)
                        failures.push(`${member.displayName}: ${response.message}`)
                      }

                      if (failedMemberIds.length > 0) {
                        rollback()
                        const succeededMemberIds = removableMemberIds.filter(userId => !failedMemberIds.includes(userId))
                        if (succeededMemberIds.length > 0) {
                          applyOptimisticUpdate((draft) => {
                            applyMemberRemoval(draft, succeededMemberIds)
                          })
                        }
                      }

                      if (removedCount > 0) {
                        void router.invalidate()
                      }

                      if (removedCount > 0) {
                        toast.success(`Removed ${removedCount} selected ${removedCount === 1 ? 'member' : 'members'}.`)
                      }

                      if (failures.length === 1) {
                        toast.error(failures[0])
                      }
                      else if (failures.length > 1) {
                        toast.error(`${failures.length} selected members could not be removed.`)
                      }
                    })
                  }}
                  onBulkRoleUpdate={async (roleId) => {
                    startBulkUpdateRoleTransition(async () => {
                      const rollback = applyOptimisticUpdate((draft) => {
                        applyBulkMemberRoleUpdate(draft, {
                          userIds: selectedMembers.map(member => member.userId),
                          roleId,
                        })
                      })

                      table.resetRowSelection()

                      const response = await bulkUpdateGroupMemberRolesFn({
                        data: {
                          groupId,
                          roleId,
                          userIds: selectedMembers.map(member => member.userId),
                        },
                      })

                      if (!response.success) {
                        rollback()
                        toast.error(response.message)
                        return
                      }

                      toast.success(response.message)
                      void router.invalidate()
                    })
                  }}
                  roles={actionableRoles}
                  selectedMembers={selectedMembers}
                  selectedRemovableMembers={selectedRemovableMembers}
                />
              )
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
