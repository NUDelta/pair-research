import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'

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
  <div className="flex-1 rounded-xl border border-border/70 bg-background/80 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
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
          <p className="text-sm font-medium text-foreground">
            {fullName ?? `Unknown ${role}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {role}
          </p>
        </div>
      </div>
      <Badge variant="outline" className="shrink-0">
        {role}
      </Badge>
    </div>
    {taskDescription !== null && taskDescription.trim().length > 0 && (
      <div className="mt-4 border-l-2 border-amber-200/80 pl-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {taskDescription}
        </p>
      </div>
    )}
  </div>
)

export default UserSection
