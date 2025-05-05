import type { FieldError, UseFormRegister } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface GroupBasicsSectionProps {
  register: UseFormRegister<any>
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
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="groupName">Group Name</Label>
        <Input id="groupName" {...register('groupName')} />
        {groupNameError && <p className="text-red-500">{groupNameError.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="groupDescription">Description</Label>
        <Textarea id="groupDescription" {...register('groupDescription')} />
        {groupDescriptionError && <p className="text-red-500">{groupDescriptionError.message}</p>}
      </div>
    </CardContent>
  </Card>
)

export default GroupBasicsSection
