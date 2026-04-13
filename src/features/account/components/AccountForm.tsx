import type { AccountFormValues } from '@/features/account/schemas/account'
import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useTransition } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { accountSchema } from '@/features/account/schemas/account'
import { updateProfile } from '@/features/account/server'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import AvatarUploader from './AvatarUploader'
import EmailSection from './EmailSection'
import FullNameInput from './FullNameInput'

interface AccountFormProps {
  full_name?: string | null
  avatar_url?: string | null
  email: string
}

const AccountForm = ({ full_name, avatar_url, email }: AccountFormProps) => {
  const [isPending, startTransition] = useTransition()
  const updateProfileFn = useServerFn(updateProfile)

  const methods = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      full_name: full_name ?? '',
      avatar: undefined,
      content_type: undefined,
    },
  })

  useEffect(() => {
    methods.reset({
      full_name: full_name ?? '',
      avatar: undefined,
      content_type: undefined,
    })
  }, [full_name, methods])

  const { handleSubmit, setValue, formState } = methods

  const onSubmit = async (data: AccountFormValues) => {
    const avatarBuffer = data.avatar instanceof File
      ? await data.avatar.arrayBuffer()
      : data.avatar
    startTransition(async () => {
      const { success, message } = await updateProfileFn({
        data: {
          fullName: data.full_name !== full_name ? data.full_name : undefined,
          imageBuffer: avatarBuffer,
          contentType: data.content_type,
        },
      })

      if (success) {
        toast.success(message)
      }
      else {
        toast.error(message)
      }
    })
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <AvatarUploader fullName={full_name ?? ''} initialUrl={avatar_url ?? ''} setValue={setValue} />
        <FullNameInput />
        <EmailSection email={email} />
        <Button
          type="submit"
          disabled={!formState.isDirty || !!formState.errors.full_name || isPending}
        >
          {isPending
            ? <Spinner text="Updating profile..." />
            : 'Save changes'}
        </Button>
      </form>
    </FormProvider>
  )
}

export default AccountForm
