import type { Control } from 'react-hook-form'
import type { GroupValues, RoleValues } from '@/features/groups/schemas/groupForm'
import { Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface RoleField extends RoleValues {
  id: string
}

interface AssignedRoleSelectorProps {
  control: Control<GroupValues>
  roleFields: RoleField[]
}

const AssignedRoleSelector = ({
  control,
  roleFields,
}: AssignedRoleSelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Your Role</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Label htmlFor="assignedRole" className="text-sm font-medium">
            Select Your Role
          </Label>
          <Controller
            name="assignedRole"
            control={control}
            rules={{ required: 'Please select a role' }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="assignedRole" className="w-full">
                  <SelectValue placeholder="Choose your role…" />
                </SelectTrigger>
                <SelectContent>
                  {roleFields.map(role => (
                    <SelectItem key={role.id} value={role.title}>
                      {role.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default AssignedRoleSelector
