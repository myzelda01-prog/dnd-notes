import { useEffect, useState } from 'react'

// Chrome and Edge fire this event when the app can be installed.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!installEvent) return null

  return (
    <button
      type="button"
      className="btn"
      title="Install Campaign Codex as an app on this computer"
      onClick={async () => {
        await installEvent.prompt()
        await installEvent.userChoice
        setInstallEvent(null)
      }}
    >
      Install app
    </button>
  )
}
