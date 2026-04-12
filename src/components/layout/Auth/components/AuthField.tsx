import type { FieldError, UseFormRegister } from 'react-hook-form'
import { Eye, EyeOff, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
        )}
        <Input
          id={id}
          type={inputType}
          autoComplete={autocomplete}
          placeholder={placeholder ?? `Enter your ${label.toLowerCase()}`}
          className={`
            transition-all duration-200 focus:ring-2
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
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2">
          {error.message}
        </p>
      )}
    </div>
  )
}

export default AuthField
