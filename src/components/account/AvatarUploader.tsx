'use client'

import type { AccountFormValues } from '@/lib/validators/auth'
import type { UseFormSetValue } from 'react-hook-form'
import { Spinner } from '@/components/common'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getInitials, optimizeAvatar } from '@/utils/avatar'
import { CheckCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

interface AvatarUploaderProps {
  fullName: string
  initialUrl?: string
  setValue: UseFormSetValue<AccountFormValues>
}

const AvatarUploader = ({
  fullName,
  initialUrl,
  setValue,
}: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState(initialUrl ?? null)
  const [pending, setPending] = useState(false)

  const isUpdated = previewUrl !== null && previewUrl !== initialUrl

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    try {
      setPending(true)
      const { imageBuffer, contentType } = await optimizeAvatar(file)
      setValue('avatar', imageBuffer, { shouldDirty: true })
      setValue('content_type', contentType, { shouldDirty: true })
      const url = URL.createObjectURL(new Blob([imageBuffer], { type: contentType }))
      setPreviewUrl(url)
    }
    catch (error_) {
      console.error('Avatar upload failed:', error_)
      toast.error(error_ instanceof Error ? error_.message : 'Avatar upload failed')
    }
    finally {
      setPending(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      {/* Avatar and Updated label */}
      <div className="flex flex-col items-center gap-y-1">
        <Avatar className="w-24 h-24">
          <AvatarImage src={previewUrl ?? ''} alt={`${fullName}'s avatar`} />
          <AvatarFallback>
            {getInitials(fullName)}
          </AvatarFallback>
        </Avatar>
        {isUpdated && (
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="w-4 h-4 mr-1" />
            Updated
          </div>
        )}
      </div>

      {/* File input + button */}
      <div>
        <Input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={handleAvatarChange}
          className="hidden"
        />
        <Button
          variant="outline"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Spinner text="Uploading..." /> : 'Change Avatar'}
        </Button>
      </div>
    </div>
  )
}

export default AvatarUploader
