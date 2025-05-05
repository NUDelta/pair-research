import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EmailSectionProps {
  email: string
}

const EmailSection = ({ email }: EmailSectionProps) => (
  <div className="space-y-2">
    <Label htmlFor="email">Email (cannot change now)</Label>
    <Input id="email" name="email" value={email} readOnly disabled />
  </div>
)

export default EmailSection
