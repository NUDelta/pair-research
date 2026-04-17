import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface EmailSectionProps {
  email: string
}

const EmailSection = ({ email }: EmailSectionProps) => (
  <div className="space-y-2">
    <Label htmlFor="email" className="text-sm font-medium text-slate-900">Email</Label>
    <Input
      id="email"
      name="email"
      value={email}
      readOnly
      disabled
      className="h-12 rounded-xl border-slate-200 bg-slate-50 text-slate-500"
    />
    <p className="text-sm text-slate-500">
      Email updates are not available here yet.
    </p>
  </div>
)

export default EmailSection
