import type { GroupSettingsMember, GroupSettingsRole } from './types'
import { KeyRoundIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import CreateGroupRoleDialog from './CreateGroupRoleDialog'
import EditGroupRoleDialog from './EditGroupRoleDialog'

interface GroupRolesSectionProps {
  groupId: string
  members: GroupSettingsMember[]
  roles: GroupSettingsRole[]
}

export default function GroupRolesSection({
  groupId,
  members,
  roles,
}: GroupRolesSectionProps) {
  const roleRows = useMemo(
    () =>
      roles.map((role) => {
        const assignedMembers = members.filter(member => member.roleId === role.id)
        const activeMembers = assignedMembers.filter(member => !member.isPending)
        const pendingMembers = assignedMembers.filter(member => member.isPending)

        return {
          ...role,
          activeMemberCount: activeMembers.length,
          assignedMemberCount: assignedMembers.length,
          pendingMemberCount: pendingMembers.length,
        }
      }),
    [members, roles],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Manage the role definitions used across this group.
          </CardDescription>
        </div>
        <CardAction>
          <CreateGroupRoleDialog groupId={groupId} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border p-2">
              <KeyRoundIcon className="text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {roles.length}
                {' '}
                configured
                {' '}
                {roles.length === 1 ? 'role' : 'roles'}
              </span>
              <span className="text-sm text-muted-foreground">
                Keep titles clear and distinct so assignments stay readable.
              </span>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Assigned members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleRows.length > 0
              ? roleRows.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <UsersIcon />
                        <span>
                          {role.assignedMemberCount}
                          {' '}
                          total
                        </span>
                        {role.pendingMemberCount > 0 && (
                          <Badge variant="secondary">
                            {role.pendingMemberCount}
                            {' '}
                            pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.activeMemberCount > 0 ? 'outline' : 'secondary'}>
                        {role.activeMemberCount > 0 ? `${role.activeMemberCount} active` : 'Unassigned'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditGroupRoleDialog groupId={groupId} role={role} />
                        <Button variant="outline" size="sm" disabled title="Role deletion with reassignment is added next.">
                          <Trash2Icon data-icon="inline-start" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No roles found for this group.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
