import type { FieldError, UseFormRegister } from 'react-hook-form'
import type { GroupValues } from '@/features/groups/schemas/groupForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

interface GroupBasicsSectionProps {
  register: UseFormRegister<GroupValues>
  groupNameError?: FieldError
  groupDescriptionError?: FieldError
}

const GroupBasicsSection = ({
  register,
  groupNameError,
  groupDescriptionError,
}: GroupBasicsSectionProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Basics</CardTitle>
      <CardDescription>
        Choose the name and description members will see throughout the app.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="groupName">Group name</Label>
        <Input
          id="groupName"
          aria-invalid={groupNameError !== undefined}
          placeholder="Computational Biology Lab"
          {...register('groupName')}
        />
        <p className="text-sm text-muted-foreground">
          Keep it clear enough that invitees recognize the workspace immediately.
        </p>
        {groupNameError && <p className="text-sm text-destructive">{groupNameError.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="groupDescription">Description</Label>
        <Textarea
          id="groupDescription"
          rows={5}
          aria-invalid={groupDescriptionError !== undefined}
          placeholder="What brings this group together, and what kind of collaboration should members expect?"
          {...register('groupDescription')}
        />
        <p className="text-sm text-muted-foreground">
          Optional, but useful for setting expectations before members join.
        </p>
        {groupDescriptionError && (
          <p className="text-sm text-destructive">{groupDescriptionError.message}</p>
        )}
      </div>
    </CardContent>
  </Card>
)

export default GroupBasicsSection
