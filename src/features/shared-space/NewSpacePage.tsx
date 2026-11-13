import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui'
import { SpaceForm } from './SpaceForm'
import { useSpace } from './SpaceProvider'

export function NewSpacePage() {
  const { space, enterSpace } = useSpace()
  const nav = useNavigate()

  return (
    <>
      <PageHeader title="Add a space" back="/" />
      <SpaceForm
        defaultName={space.me.displayName}
        enterSpace={async (coupleId, inviteCode) => {
          await enterSpace(coupleId, inviteCode)
          nav('/', { replace: true })
        }}
      />
    </>
  )
}
