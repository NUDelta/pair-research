'use client'

import type { FieldError, UseFormRegister } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AuthField = ({
  id,
  label,
  type,
  error,
  register,
}: {
  id: string
  label: string
  type: string
  error?: FieldError
  register: UseFormRegister<any>
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...register(id)} />
      {error !== undefined && <p className="text-red-500 text-sm">{error.message}</p>}
    </div>
  )
}

export default AuthField
