import type { AccountFormValues } from '@/features/account/schemas/account'
import { useFormContext } from 'react-hook-form'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

const FullNameInput = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<AccountFormValues>()

  return (
    <div className="space-y-2">
      <Label htmlFor="full_name" className="text-sm font-medium text-slate-900">Full name</Label>
      <Input
        id="full_name"
        className="h-12 rounded-xl border-slate-200 bg-white"
        {...register('full_name')}
      />
      {errors.full_name && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {errors.full_name.message}
        </p>
      )}
    </div>
  )
}

export default FullNameInput
