import type { AccountFormValues } from '@/lib/validators/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFormContext } from 'react-hook-form'

const FullNameInput = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext<AccountFormValues>()

  return (
    <div className="space-y-2">
      <Label htmlFor="full_name">Full Name</Label>
      <Input id="full_name" {...register('full_name')} />
      {errors.full_name && (
        <p className="text-sm text-red-500">{errors.full_name.message}</p>
      )}
    </div>
  )
}

export default FullNameInput
