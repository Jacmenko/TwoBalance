import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui'
import { useI18n } from '@/i18n/I18nProvider'
import { SpaceForm } from './SpaceForm'
import { useSpace } from './SpaceProvider'

export function NewSpacePage() {
  const { space, enterSpace } = useSpace()
  const nav = useNavigate()
  const { t } = useI18n()

  return (
    <>
      <PageHeader title={t('newSpace.title')} back="/" />
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
