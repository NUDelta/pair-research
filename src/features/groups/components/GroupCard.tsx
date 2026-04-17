import type { Group } from '@/features/groups/schemas/group'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Settings } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { acceptGroupInvitation } from '@/features/groups/server/groups/acceptGroupInvitation'
import { cn } from '@/shared/lib/utils'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'

const PARAGRAPH_BREAK_REGEX = /\n/

function formatJoinedAt(joinedAt: string) {
  return new Date(joinedAt).toLocaleDateString()
}

interface GroupCardProps {
  group: Group
  href?: string
}

const GroupCard = ({
  group,
  href,
}: GroupCardProps) => {
  const {
    groupName,
    groupDescription,
    isAdmin,
    isPending,
    joinedAt,
  } = group
  const descriptionParagraphs = (groupDescription ?? '')
    .split(PARAGRAPH_BREAK_REGEX)
    .map(para => para.trim())
    .filter(para => para.length > 0)
  const [isAccepting, startTransition] = useTransition()
  const router = useRouter()
  const acceptGroupInvitationFn = useServerFn(acceptGroupInvitation)
  const isNavigable = href !== undefined

  const onAccept = async () => {
    startTransition(async () => {
      const { success, message } = await acceptGroupInvitationFn({ data: { groupId: group.id } })
      if (success) {
        toast.success(message)
        await router.invalidate()
      }
      else {
        toast.error(message)
      }
    })
  }

  const CardContentComponent = (
    <Card
      className={cn(
        'group animate-subtle-rise flex h-full w-full flex-col justify-between',
        isNavigable && 'cursor-pointer hover-lift-md hover:shadow-xl',
      )}
    >
      <div className="space-y-2">
        <CardHeader className="flex justify-between items-center">
          <CardTitle className="transition-colors duration-300 ease-out group-hover:text-foreground/80">
            {groupName}
          </CardTitle>
          {isAdmin && !isPending && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={(event_) => {
                event_.preventDefault()
                event_.stopPropagation()
                void router.navigate({
                  to: '/groups/$slug/settings',
                  params: { slug: group.id },
                })
              }}
              aria-label="Settings"
              className="hover-lift-sm hover:rotate-2"
            >
              <Settings aria-hidden="true" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {descriptionParagraphs.length > 0
            ? (
                <div className="space-y-2 line-clamp-4">
                  {descriptionParagraphs.map((para, idx) => (
                  // eslint-disable-next-line react/no-array-index-key -- derived from paragraph order
                    <p key={idx} className="whitespace-pre-line leading-snug">
                      {para}
                    </p>
                  ))}
                </div>
              )
            : (
                <p className="text-sm text-muted-foreground">No description provided.</p>
              )}
        </CardContent>
      </div>
      <CardFooter className="text-sm text-muted-foreground">
        {isPending
          ? (
              <div className="flex justify-end w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={isAccepting}
                  aria-busy={isAccepting}
                  onClick={(event_) => {
                    event_.preventDefault()
                    event_.stopPropagation()
                    onAccept()
                  }}
                  className="hover-lift-sm hover:shadow-lg hover:bg-accent hover:text-accent-foreground"
                >
                  {isAccepting
                    ? (
                        <Spinner text="Accepting..." className="h-4 w-4" />
                      )
                    : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Accept
                        </>
                      )}
                </Button>
              </div>
            )
          : (
              <span>
                {`Joined at ${formatJoinedAt(joinedAt)}`}
              </span>
            )}
      </CardFooter>
    </Card>
  )

  return href !== undefined
    ? (
        <Link to="/groups/$slug" params={{ slug: href }}>
          {CardContentComponent}
        </Link>
      )
    : (
        <div className="h-full w-full">
          {CardContentComponent}
        </div>
      )
}

export default GroupCard
