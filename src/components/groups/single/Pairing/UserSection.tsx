import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/utils/avatar'

interface UserSectionProps {
  role: 'Helper' | 'Helpee'
  fullName: string | null
  avatarUrl: string | null
  taskDescription: string | null
}

const UserSection = ({
  role,
  fullName,
  avatarUrl,
  taskDescription,
}: UserSectionProps) => (
  <div className="space-y-3 flex-1">
    <div className="flex items-center gap-3">
      <Avatar className="w-8 h-8">
        <AvatarImage
          src={avatarUrl ?? undefined}
          alt={fullName !== null ? `${fullName}'s avatar` : `${role} avatar`}
          loading="lazy"
        />
        <AvatarFallback>
          {getInitials(fullName)}
        </AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-medium">{role}</h3>
        <p className="text-sm text-muted-foreground">
          {fullName ?? `Unknown ${role}`}
        </p>
      </div>
    </div>
    {taskDescription !== null && taskDescription.trim().length > 0 && (
      <div className="pl-11">
        <p className="text-sm italic text-muted-foreground">
          {taskDescription}
        </p>
      </div>
    )}
  </div>
)

export default UserSection
