import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
    <Card>
      <CardHeader>
        <CardTitle>Current Pairing</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
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
