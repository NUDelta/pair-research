import type { Group } from '@/features/groups/schemas/group'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Settings } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  getGroupInvitationAcceptanceErrorMessage,
  runGroupInvitationAcceptance,
} from '@/features/groups/lib/groupInvitationAcceptance'
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
  isAccepting?: boolean
  onAcceptInvitation?: (groupId: string) => Promise<void>
}

const GroupCard = ({
  group,
  href,
  isAccepting: controlledIsAccepting,
  onAcceptInvitation,
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
  const acceptPending = controlledIsAccepting ?? isAccepting

  const settingsAction = isAdmin && !isPending
    ? (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => {
            void router.navigate({
              to: '/groups/$slug/settings',
              params: { slug: group.id },
            })
          }}
          aria-label={`Open settings for ${groupName}`}
          className="absolute right-4 top-4 z-10 hover-lift-sm hover:rotate-2"
        >
          <Settings aria-hidden="true" />
        </Button>
      )
    : null

  const onAccept = async () => {
    if (onAcceptInvitation !== undefined) {
      try {
        await onAcceptInvitation(group.id)
      }
      catch (error) {
        toast.error(getGroupInvitationAcceptanceErrorMessage(error))
      }
      return
    }

    startTransition(async () => {
      await runGroupInvitationAcceptance({
        acceptInvitation: async () => acceptGroupInvitationFn({ data: { groupId: group.id } }),
        onFailed: message => toast.error(message),
        onSucceeded: (message) => {
          toast.success(message)
          void router.invalidate()
        },
      })
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
        <CardHeader className={cn('flex justify-between items-center', settingsAction !== null && 'pr-14')}>
          <CardTitle className="transition-colors duration-300 ease-out group-hover:text-foreground/80">
            {groupName}
          </CardTitle>
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
                  disabled={acceptPending}
                  aria-busy={acceptPending}
                  onClick={(event_) => {
                    event_.preventDefault()
                    event_.stopPropagation()
                    void onAccept()
                  }}
                  className="hover-lift-sm hover:shadow-lg hover:bg-green-400 hover:text-accent-foreground"
                >
                  {acceptPending
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
        <div className="relative h-full w-full">
          <Link
            to="/groups/$slug"
            params={{ slug: href }}
            className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CardContentComponent}
          </Link>
          {settingsAction}
        </div>
      )
    : (
        <div className="relative h-full w-full">
          {CardContentComponent}
          {settingsAction}
        </div>
      )
}

export default GroupCard
