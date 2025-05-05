import type { RoleValues } from '@/lib/validators/group'
import type { Control } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Plus, Trash } from 'lucide-react'
import { Controller } from 'react-hook-form'

interface RoleField extends RoleValues {
  id: string
}

interface RolesEditorProps {
  control: Control<any>
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
      <div className="space-y-2 text-sm text-muted-foreground leading-5">
        <p>
          You can give your group members different titles here. In the future, you will also be able to add or take away preference for pairings between two roles in your group.
        </p>
        <p>
          We recommend singular tense, not plural. Make sure you 'Enter' or click outside after editing the role title.
        </p>
      </div>

    </CardHeader>
    <CardContent className="space-y-2">
      {roleFields.map((field, idx) => (
        <div key={field.id} className="flex items-center space-x-2 space-y-1">
          <Controller
            name={`roles.${idx}.title`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex-1">
                <Input
                  {...field}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      updateRole(
                        idx,
                        { title: (field.value as string)?.trim() || '' },
                      )
                    }
                  }}
                />
                {fieldState.error && <p className="text-red-500 text-sm">{fieldState.error.message}</p>}
              </div>
            )}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeRole(idx)}
            disabled={roleFields.length <= 1}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => appendRole({ title: 'Stuff' })}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        {' '}
        Add Role
      </Button>
    </CardContent>
  </Card>
)

export default RolesEditor
