import { HandshakeIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import UserSection from './UserSection'

interface PairingProps {
  pairingInfo: CurrentUserActivePair
}

const Pairing = ({ pairingInfo }: PairingProps) => {
  const {
    helpeeTaskDescription,
    helpeeFullName,
    helpeeAvatarUrl,
    helperTaskDescription,
    helperFullName,
    helperAvatarUrl,
  } = pairingInfo

  return (
    <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-background to-sky-50/50 shadow-sm">
      <CardHeader className="gap-3 border-b border-amber-100/80 bg-background/70">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="gap-1 border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-100">
            <HandshakeIcon className="h-3.5 w-3.5" />
            Pairing active
          </Badge>
          <CardTitle>Current Pairing</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Focus on this pairing until the round resets.
        </p>
      </CardHeader>
      <CardContent className="px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-6">
          <UserSection
            role="Helper"
            fullName={helperFullName}
            avatarUrl={helperAvatarUrl}
            taskDescription={helperTaskDescription}
          />

          <div className="lg:hidden">
            <Separator />
          </div>
          <div className="hidden lg:block lg:w-px lg:h-auto lg:bg-border" />

          <UserSection
            role="Helpee"
            fullName={helpeeFullName}
            avatarUrl={helpeeAvatarUrl}
            taskDescription={helpeeTaskDescription}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export default Pairing
