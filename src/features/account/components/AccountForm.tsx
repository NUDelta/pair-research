import type { AccountFormValues } from '@/features/account/schemas/account'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState, useTransition } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { isGravatarAvatarUrl } from '@/features/account/lib/avatar'
import { accountSchema } from '@/features/account/schemas/account'
import { updateProfile } from '@/features/account/server'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import AvatarUploader from './AvatarUploader'
import EmailSection from './EmailSection'
import FullNameInput from './FullNameInput'

interface AccountFormProps {
  full_name?: string | null
  avatar_url?: string | null
  email: string
}

const AccountForm = ({ full_name, avatar_url, email }: AccountFormProps) => {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const updateProfileFn = useServerFn(updateProfile)
  const initialAvatarSource = isGravatarAvatarUrl(avatar_url) ? 'gravatar' : 'current'
  const [isRemovingPhoto, startRemoveTransition] = useTransition()

  const methods = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    mode: 'onChange',
    defaultValues: {
      full_name: full_name ?? '',
      avatar_source: initialAvatarSource,
      avatar: undefined,
      content_type: undefined,
    },
  })

  const [feedback, setFeedback] = useState<{
    message: string
    tone: 'default' | 'destructive' | 'success'
  } | null>(null)

  useEffect(() => {
    methods.reset({
      full_name: full_name ?? '',
      avatar_source: initialAvatarSource,
      avatar: undefined,
      content_type: undefined,
    })
  }, [full_name, initialAvatarSource, avatar_url, methods])

  const { handleSubmit, setValue, formState, reset } = methods
  const visibleFeedback = feedback?.tone === 'success' && formState.isDirty
    ? null
    : feedback

  useEffect(() => {
    if (feedback?.tone === 'success' && formState.isDirty) {
      // eslint-disable-next-line react/set-state-in-effect
      setFeedback(null)
    }
  }, [formState.isDirty, feedback?.tone])

  const onSubmit = async (data: AccountFormValues) => {
    const avatarBuffer = data.avatar instanceof File
      ? await data.avatar.arrayBuffer()
      : data.avatar
    setFeedback(null)
    startTransition(async () => {
      const { success, message } = await updateProfileFn({
        data: {
          fullName: data.full_name !== full_name ? data.full_name : undefined,
          avatarSource: data.avatar_source,
          imageBuffer: avatarBuffer,
          contentType: data.content_type,
        },
      })

      if (success) {
        await router.invalidate()
        reset({
          full_name: data.full_name ?? '',
          avatar_source: data.avatar_source,
          avatar: undefined,
          content_type: undefined,
        })
        setFeedback({
          tone: 'success',
          message,
        })
        toast.success(message)
      }
      else {
        setFeedback({
          tone: 'destructive',
          message,
        })
        toast.error(message)
      }
    })
  }

  const handleAvatarRemove = async () => {
    setFeedback(null)
    return new Promise<boolean>((resolve) => {
      startRemoveTransition(async () => {
        const { success, message } = await updateProfileFn({
          data: {
            avatarSource: 'none',
          },
        })

        if (success) {
          await router.invalidate()
          reset({
            full_name: methods.getValues('full_name'),
            avatar_source: 'current',
            avatar: undefined,
            content_type: undefined,
          })
          setFeedback({
            tone: 'success',
            message,
          })
          toast.success(message)
          resolve(true)
        }
        else {
          setFeedback({
            tone: 'destructive',
            message,
          })
          toast.error(message)
          resolve(false)
        }
      })
    })
  }

  return (
    <Card className="animate-subtle-rise-delayed rounded-3xl border-slate-200/80 bg-white/90 shadow-sm">
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="text-xl text-slate-950">Profile</CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6 text-slate-600">
            Update your display name and avatar. Profile changes save here, and photo removal takes effect immediately after confirmation.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <AvatarUploader
              key={avatar_url ?? initialAvatarSource}
              email={email}
              fullName={methods.watch('full_name') ?? ''}
              initialUrl={avatar_url ?? ''}
              isRemoving={isRemovingPhoto}
              onRemove={handleAvatarRemove}
              setValue={setValue}
            />
            <div className="grid gap-5">
              <FullNameInput />
              <EmailSection email={email} />
            </div>

            <div
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
                visibleFeedback
                  ? 'border border-emerald-200/80 bg-emerald-50/80'
                  : formState.isDirty
                    ? 'border border-amber-300/70 bg-amber-50/90'
                    : 'border border-slate-200/80 bg-slate-50/80'
              }`}
            >
              <p className={`text-sm ${
                visibleFeedback
                  ? 'text-emerald-700'
                  : formState.isDirty
                    ? 'text-amber-900'
                    : 'text-slate-600'}`}
              >
                {visibleFeedback
                  ? visibleFeedback.message
                  : formState.isDirty
                    ? 'Save profile changes when you are ready.'
                    : 'Your profile details are up to date.'}
              </p>
              <Button
                type="submit"
                size="lg"
                className="min-w-40 rounded-full hover-lift-sm hover:shadow-md"
                disabled={!formState.isDirty || !!formState.errors.full_name || isPending || isRemovingPhoto}
              >
                {isPending
                  ? <Spinner text="Saving..." />
                  : 'Save changes'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  )
}

export default AccountForm
