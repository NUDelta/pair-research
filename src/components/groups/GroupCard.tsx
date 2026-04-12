import type { Group } from '@/lib/schemas/group'
import { Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Check, Settings } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { acceptGroupInvitation } from '@/lib/actions/groups'

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
  const [isAccepting, startTransition] = useTransition()
  const router = useRouter()
  const acceptGroupInvitationFn = useServerFn(acceptGroupInvitation)

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
      className="flex flex-col h-full w-full justify-between group cursor-pointer hover:shadow-lg transition"
    >
      <div className="space-y-2">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>{groupName}</CardTitle>
          {isAdmin && !isPending && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(event_) => {
                event_.preventDefault()
                event_.stopPropagation()
                toast.warning('Settings feature is not implemented yet.')
              }}
              aria-label="Settings"
            >
              {/* TODO: implement setting features here */}
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2 line-clamp-4">
            {groupDescription
              .split(PARAGRAPH_BREAK_REGEX)
              .map((para, idx) => (
              // eslint-disable-next-line react/no-array-index-key -- unique key
                <p key={idx} className="whitespace-pre-line leading-snug">
                  {para.trim()}
                </p>
              ))}
          </div>
        </CardContent>
      </div>
      <CardFooter className="text-sm text-muted-foreground">
        {isPending
          ? (
              <div className="flex justify-end w-full">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(event_) => {
                    event_.preventDefault()
                    event_.stopPropagation()
                    onAccept()
                  }}
                  // Add some animation when hovering with shadow, scalling, and color darker
                  className="hover:shadow-lg hover:scale-105 hover:bg-accent hover:text-accent-foreground transition duration-200"
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
        <div
          className="w-full h-full text-left p-0"
          onClick={() => {
            toast.warning(
              <span className="flex flex-col gap-2">
                <p className="font-bold">You need to accept the invitation first.</p>
                <p>Click on the right bottom "Accept" button on the card to accept.</p>
              </span>,
            )
          }}
        >
          {CardContentComponent}
        </div>
      )
}

export default GroupCard
