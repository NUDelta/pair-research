import type { FieldError, UseFormRegister } from 'react-hook-form'
import { Eye, EyeOff, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface AuthFieldProps {
  id: string
  label: string
  type: string
  autocomplete: string
  error?: FieldError
  register: UseFormRegister<any>
  placeholder?: string
}

const AuthField = ({
  id,
  label,
  type,
  autocomplete,
  error,
  register,
  placeholder,
}: AuthFieldProps) => {
  const [showPassword, setShowPassword] = useState(false)

  const getIcon = () => {
    if (id === 'email') {
      return Mail
    }
    if (id === 'name') {
      return User
    }
    return null
  }

  const Icon = getIcon()
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  return (
    <div className="group grid gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-[color,transform] duration-200 ease-out group-focus-within:text-foreground group-focus-within:-translate-y-[55%]" />
        )}
        <Input
          id={id}
          type={inputType}
          autoComplete={autocomplete}
          placeholder={placeholder ?? `Enter your ${label.toLowerCase()}`}
          className={`
            h-12 rounded-xl border-slate-200 bg-white transition-all duration-200 focus:ring-2
            ${Icon ? 'pl-10' : ''}
            ${isPassword ? 'pr-10' : ''}
            ${error ? 'border-destructive focus:border-destructive' : ''}
          `}
          {...register(id)}
        />
        {isPassword && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 h-10 -translate-y-1/2 rounded-lg px-3 hover:-translate-y-[52%] hover:bg-slate-100"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword
              ? (
                  <EyeOff className="size-4 text-muted-foreground" />
                )
              : (
                  <Eye className="size-4 text-muted-foreground" />
                )}
          </Button>
        )}
      </div>
      {error && (
        <p className="animate-subtle-rise text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default AuthField
