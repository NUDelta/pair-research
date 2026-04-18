export interface GroupInvitationAcceptanceResponse {
  message: string
  success: boolean
}

interface RunGroupInvitationAcceptanceOptions {
  acceptInvitation: () => Promise<GroupInvitationAcceptanceResponse>
  fallbackErrorMessage?: string
  onFailed: (message: string) => void
  onSettled?: () => void
  onSucceeded: (message: string) => void
}

const DEFAULT_GROUP_INVITATION_ACCEPTANCE_ERROR_MESSAGE = 'Failed to accept the invitation.'

export function getGroupInvitationAcceptanceErrorMessage(
  error: unknown,
  fallbackMessage = DEFAULT_GROUP_INVITATION_ACCEPTANCE_ERROR_MESSAGE,
) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallbackMessage
}

export async function runGroupInvitationAcceptance({
  acceptInvitation,
  fallbackErrorMessage = DEFAULT_GROUP_INVITATION_ACCEPTANCE_ERROR_MESSAGE,
  onFailed,
  onSettled,
  onSucceeded,
}: RunGroupInvitationAcceptanceOptions) {
  try {
    const response = await acceptInvitation()

    if (!response.success) {
      onFailed(response.message)
      return
    }

    onSucceeded(response.message)
  }
  catch (error) {
    onFailed(getGroupInvitationAcceptanceErrorMessage(error, fallbackErrorMessage))
  }
  finally {
    onSettled?.()
  }
}
