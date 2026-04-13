export const shouldCelebratePairingActivation = (
  previousActivePairingId: string | null,
  nextActivePairingId: string | null,
) => {
  return nextActivePairingId !== null && previousActivePairingId !== nextActivePairingId
}
