import type { Control } from 'react-hook-form'
import type { GroupValues, MemberValues, RoleValues } from '@/lib/validators/group'
import { Plus, Trash } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface RoleField extends RoleValues {
  id: string
}

interface MemberField extends MemberValues {
  id: string
}

interface MemberInviteListProps {
  control: Control<GroupValues>
  roleFields: RoleField[]
  memberFields: MemberField[]
  appendMember: (member: MemberValues) => void
  removeMember: (index: number) => void
  updateMember: (index: number, member: MemberValues) => void
}

const MemberInviteList = ({
  control,
  roleFields,
  memberFields,
  appendMember,
  removeMember,
  updateMember,
}: MemberInviteListProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Members</CardTitle>
      <div className="space-y-2 text-sm text-muted-foreground leading-5">
        <p>
          These will be you group members. Already registered email addresses will be sent a notification on this website. New email addresses will be sent an email to create an account and join this pair research group.
        </p>
        <p>
          You can enter multiple emails delimited by commas ("Enter" after input).
        </p>
      </div>
    </CardHeader>
    <CardContent className="space-y-2">
      {memberFields.map((field, idx) => (
        <div key={field.id} className="flex flex-wrap gap-2 items-center">
          {/* Email field */}
          <Controller
            name={`members.${idx}.email`}
            control={control}
            render={({ field, fieldState }) => (
              <div className="flex-1 min-w-[250px]">
                <Input
                  {...field}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const raw = field.value || ''
                      const emails = raw
                        .split(',')
                        .map(e => e.trim())
                        .filter(e => e.length > 0)

                      if (emails.length > 1) {
                        emails.slice(1).forEach(email =>
                          appendMember({ email, title: roleFields[0]?.title ?? '' }))
                      }

                      updateMember(idx, {
                        email: emails[0] || '',
                        title: (memberFields[idx]?.title || roleFields[0]?.title) ?? '',
                      })
                    }
                  }}
                  placeholder="member@example.com"
                />
                {fieldState.error && (
                  <p className="text-red-500 text-sm">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />

          {/* Role selection */}
          <div className="flex flex-row gap-2">
            <Controller
              name={`members.${idx}.title`}
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="min-w-[150px]">
                    <SelectValue placeholder="Select role" />
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

            {/* Delete button */}
            <Button variant="ghost" size="icon" onClick={() => removeMember(idx)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => appendMember({ email: '', title: roleFields[0]?.title ?? '' })}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Invite Member
      </Button>
    </CardContent>
  </Card>
)

export default MemberInviteList
