import type { ApplyGroupSettingsOptimisticUpdate } from '../optimisticGroupSettings'
import type { GroupSettingsMember, GroupSettingsRole } from '../types'
import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable } from '@/shared/ui/data-table'
import GroupRolesToolbar from './GroupRolesToolbar'
import { createRoleTableColumns } from './roleTableColumns'
import { buildGroupRoleTableRows } from './roleTableRows'

interface GroupRolesSectionProps {
  applyOptimisticUpdate: ApplyGroupSettingsOptimisticUpdate
  groupId: string
  members: GroupSettingsMember[]
  roles: GroupSettingsRole[]
}

export default function GroupRolesSection({
  applyOptimisticUpdate,
  groupId,
  members,
  roles,
}: GroupRolesSectionProps) {
  const data = useMemo(() => buildGroupRoleTableRows(roles, members), [members, roles])
  const columns = useMemo(
    () => createRoleTableColumns({ applyOptimisticUpdate, groupId, roles }),
    [applyOptimisticUpdate, groupId, roles],
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Roles</CardTitle>
          <CardDescription>
            Rename roles inline and manage bulk role consolidation from the table.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <DataTable
          columns={columns}
          data={data}
          emptyMessage="No roles found for this group."
          filterColumnId="title"
          filterPlaceholder="Filter roles..."
          getRowId={row => row.id}
          renderToolbar={table => (
            <GroupRolesToolbar
              applyOptimisticUpdate={applyOptimisticUpdate}
              groupId={groupId}
              roles={roles}
              selectedRoles={table.getFilteredSelectedRowModel().rows.map(row => ({
                id: row.original.id,
                title: row.original.title,
                isOptimistic: row.original.isOptimistic,
              }))}
            />
          )}
        />
      </CardContent>
    </Card>
  )
}
