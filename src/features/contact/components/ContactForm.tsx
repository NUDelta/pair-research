import type { ContactFormValues } from '@/features/contact/schemas/contact'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2, LoaderCircle, Mail } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { contactFormSchema } from '@/features/contact/schemas/contact'
import { sendContactMessage } from '@/features/contact/server'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

export default function ContactForm() {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const sendContactMessageFn = useServerFn(sendContactMessage)
  const {
    formState: { errors, isValid },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      message: '',
      name: '',
    },
  })

  const onSubmit = async (values: ContactFormValues) => {
    const turnstileToken = await turnstileRef.current?.ensureToken()
    if (turnstileToken == null || turnstileToken === '') {
      setError('root', { message: 'Please complete the security check to continue.' })
      return
    }

    startTransition(async () => {
      try {
        const result = await sendContactMessageFn({
          data: {
            ...values,
            turnstileToken,
          },
        })

        if (result.success) {
          reset()
          turnstileRef.current?.reset()
          setIsSubmitted(true)
          toast.success(result.message)
          return
        }

        turnstileRef.current?.reset()
        if (result.code === TURNSTILE_ERROR_CODES.failed || result.code === TURNSTILE_ERROR_CODES.required) {
          turnstileRef.current?.requireInteractiveChallenge(result.message)
        }
        toast.error(result.message)
        setError('root', { message: result.message })
      }
      catch (error) {
        turnstileRef.current?.reset()
        const errorMessage = 'We could not send your message right now. Please try again later.'
        console.error('[CONTACT_FORM_SUBMIT_FAILED]', error)
        toast.error(errorMessage)
        setError('root', { message: errorMessage })
      }
    })
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="text-base font-semibold">Message sent</h2>
            <p className="text-sm leading-6">
              We received your note and will follow up as soon as we can.
            </p>
            <Button type="button" variant="outline" onClick={() => setIsSubmitted(false)}>
              Send another message
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-describedby={errors.name ? 'name-error' : undefined}
          aria-invalid={errors.name !== undefined}
          placeholder="Your name"
          {...register('name')}
        />
        {errors.name !== undefined && (
          <p id="name-error" className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-describedby={errors.email ? 'email-error' : undefined}
          aria-invalid={errors.email !== undefined}
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email !== undefined && (
          <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          rows={7}
          aria-describedby={errors.message ? 'message-error' : undefined}
          aria-invalid={errors.message !== undefined}
          placeholder="Tell us what happened or what you need help with."
          {...register('message')}
        />
        {errors.message !== undefined && (
          <p id="message-error" className="text-sm text-destructive">{errors.message.message}</p>
        )}
      </div>

      <TurnstileField
        controllerRef={turnstileRef}
        action="contact"
        mode="visible"
        description="Complete the security check before sending your message."
        onVerifiedChange={setIsTurnstileVerified}
      />

      {errors.root !== undefined && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        className="h-11 w-full"
        disabled={!isValid || !isTurnstileVerified || isPending}
      >
        {isPending
          ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Sending message...
              </>
            )
          : (
              <>
                <Mail className="size-4" />
                Send message
              </>
            )}
      </Button>
    </form>
  )
}
