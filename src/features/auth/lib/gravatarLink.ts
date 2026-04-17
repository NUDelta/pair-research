const digestMessage = async (
  email: string,
  method: string = 'SHA-256',
): Promise<string> => {
  const msgUint8 = new TextEncoder().encode(email)
  const hashBuffer = await globalThis.crypto.subtle.digest(method, msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return hashHex
}

export const gravatarLink = async (
  email: string,
  name: string = 'User',
  size: number = 200,
): Promise<string> => {
  const emailHash = await digestMessage(email.toLowerCase().trim())
  return `https://gravatar.zla.app/avatar/${emailHash}?s=${size}&d=initials&name=${encodeURIComponent(name)}`
}
