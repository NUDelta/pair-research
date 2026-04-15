import type { Control } from 'react-hook-form'
import type { GroupValues, RoleValues } from '@/features/groups/schemas/groupForm'
import { Plus, Trash } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

interface RoleField extends RoleValues {
  id: string
}

interface RolesEditorProps {
  control: Control<GroupValues>
  roleFields: RoleField[]
  appendRole: (role: RoleValues) => void
  removeRole: (index: number) => void
  updateRole: (index: number, role: RoleValues) => void
}

const RolesEditor = ({
  control,
  roleFields,
  appendRole,
  removeRole,
  updateRole,
}: RolesEditorProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Roles</CardTitle>
      <CardDescription>
        Define the titles members can hold in this group. Use singular labels when possible,
        such as &ldquo;Professor&rdquo; or &ldquo;Postdoc&rdquo;.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {roleFields.map((field, idx) => (
        <div key={field.id} className="flex items-start gap-2">
          <Controller
            name={`roles.${idx}.title`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="min-w-0 flex-1">
                <Input
                  {...field}
                  aria-invalid={fieldState.error !== undefined}
                  placeholder="Role name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      updateRole(
                        idx,
                        { title: field.value?.trim() || '' },
                      )
                    }
                  }}
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeRole(idx)}
            disabled={roleFields.length <= 1}
            aria-label={`Remove role ${idx + 1}`}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => appendRole({ title: 'New Role' })}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add role
      </Button>
    </CardContent>
  </Card>
)

export default RolesEditor
