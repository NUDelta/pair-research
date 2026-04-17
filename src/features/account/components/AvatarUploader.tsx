import type { UseFormSetValue } from 'react-hook-form'
import type { AccountFormValues } from '@/features/account/schemas/account'
import { CheckCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getInitials, isGravatarAvatarUrl, optimizeAvatar } from '@/features/account/lib/avatar'
import { gravatarLink } from '@/features/auth/lib'
import { DoubleConfirmDialog, Spinner } from '@/shared/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface AvatarUploaderProps {
  email: string
  fullName: string
  initialUrl?: string
  isRemoving: boolean
  onRemove: () => Promise<boolean>
  setValue: UseFormSetValue<AccountFormValues>
}

const normalizePreviewUrl = (value?: string) => typeof value === 'string' && value.trim() !== ''
  ? value
  : null

const AvatarUploader = ({
  email,
  fullName,
  initialUrl,
  isRemoving,
  onRemove,
  setValue,
}: AvatarUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState(() => normalizePreviewUrl(initialUrl))
  const [pending, setPending] = useState(false)
  const [isUsingGravatar, setIsUsingGravatar] = useState(() => isGravatarAvatarUrl(initialUrl))

  useEffect(() => {
    if (!isUsingGravatar) {
      return
    }

    let cancelled = false

    void gravatarLink(email, fullName === '' ? 'User' : fullName).then((url) => {
      if (!cancelled) {
        setPreviewUrl(url)
      }
    }).catch((error_) => {
      console.error('Failed to build gravatar preview:', error_)
      if (!cancelled) {
        toast.error('Failed to build gravatar preview')
      }
    })

    return () => {
      cancelled = true
    }
  }, [email, fullName, isUsingGravatar])

  const isUpdated = previewUrl !== null && previewUrl !== initialUrl

  const clearRemovedAvatarState = () => {
    setIsUsingGravatar(false)
    setPreviewUrl(null)
    setValue('avatar', undefined, { shouldDirty: false })
    setValue('content_type', undefined, { shouldDirty: false })
    setValue('avatar_source', 'current', { shouldDirty: false })

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    try {
      setPending(true)
      setIsUsingGravatar(false)
      const { imageBuffer, contentType } = await optimizeAvatar(file)
      setValue('avatar_source', 'upload', { shouldDirty: true })
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

  const handleGravatarToggle = (checked: boolean) => {
    setIsUsingGravatar(checked)
    setValue('avatar', undefined, { shouldDirty: true })
    setValue('content_type', undefined, { shouldDirty: true })

    if (checked) {
      setValue('avatar_source', 'gravatar', { shouldDirty: true })
      if (inputRef.current) {
        inputRef.current.value = ''
      }
      return
    }

    setPreviewUrl(isGravatarAvatarUrl(initialUrl) ? null : normalizePreviewUrl(initialUrl))
    setValue('avatar_source', isGravatarAvatarUrl(initialUrl) ? 'none' : 'current', { shouldDirty: true })
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    const removed = await onRemove()

    if (removed) {
      clearRemovedAvatarState()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="flex flex-col items-center gap-y-1">
          <Avatar className="h-24 w-24">
            <AvatarImage src={previewUrl ?? undefined} alt={fullName === '' ? 'User avatar' : `${fullName}'s avatar`} />
            <AvatarFallback>
              {getInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          {isUpdated && (
            <div className="flex items-center text-sm text-green-600">
              <CheckCircle className="mr-1 h-4 w-4" />
              Updated
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
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
            size="lg"
            className="rounded-full hover-lift-sm hover:shadow-sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUsingGravatar || isRemoving}
          >
            {pending ? <Spinner text="Uploading..." /> : 'Change photo'}
          </Button>
          <DoubleConfirmDialog
            title="Remove profile photo?"
            description="This removes your current profile photo and restores the default avatar immediately."
            confirmText="Remove photo"
            pendingText="Removing photo..."
            onConfirm={handleAvatarRemove}
            trigger={(
              <Button
                variant="destructive"
                type="button"
                size="lg"
                className="rounded-full hover-lift-sm hover:shadow-sm"
                disabled={(previewUrl === null && !isUsingGravatar) || isRemoving || pending}
              >
                {isRemoving ? <Spinner text="Removing..." /> : 'Remove photo'}
              </Button>
            )}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-950">Use Gravatar</p>
          <p className="text-sm text-slate-600">
            Manage this image at
            {' '}
            <a
              href="https://gravatar.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sky-700 underline underline-offset-4 transition-colors hover:text-slate-950"
            >
              Gravatar
            </a>
            .
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isUsingGravatar}
          aria-label="Use Gravatar"
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
            isUsingGravatar ? 'bg-sky-600' : 'bg-slate-300'
          }`}
          onClick={() => handleGravatarToggle(!isUsingGravatar)}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white transition-transform ${
              isUsingGravatar ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

export default AvatarUploader
