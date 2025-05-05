'use client'

import type { Group } from '@/lib/schemas/group'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { acceptGroupInvitation } from '@/lib/actions/groups'
import { Check, Settings } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

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

  const onAccept = async () => {
    startTransition(async () => {
      const { success, message } = await acceptGroupInvitation(group.id)
      if (success) {
        toast.success(message)
        router.refresh()
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
            <Button variant="ghost" size="icon" disabled>
              {/* TODO: implement setting features here */}
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2 line-clamp-4">
            {groupDescription
              .split(/\n/)
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
                {`Joined at ${new Date(joinedAt).toLocaleDateString()}`}
              </span>
            )}
      </CardFooter>
    </Card>
  )

  return href !== undefined
    ? (
        <Link href={href} prefetch={false}>
          {CardContentComponent}
        </Link>
      )
    : (
        <Button
          variant="ghost"
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
        </Button>
      )
}

export default GroupCard
