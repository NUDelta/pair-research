import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar, AvatarImage } from './avatar'

describe('avatarImage', () => {
  it('omits blank src values to avoid rendering empty image requests', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage alt="User avatar" src="" />
      </Avatar>,
    )

    expect(container.querySelector('[data-slot="avatar-image"]')).toBeNull()
  })
})
