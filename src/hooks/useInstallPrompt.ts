import { useCallback, useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISSED_KEY)
  if (!raw) return false
  const ts = Number(raw)
  if (Date.now() - ts < DISMISS_DURATION_MS) return true
  localStorage.removeItem(DISMISSED_KEY)
  return false
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone() || isDismissed()) return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    function onAppInstalled() {
      deferredPrompt.current = null
      setCanInstall(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    const event = deferredPrompt.current
    if (!event) return
    await event.prompt()
    deferredPrompt.current = null
    setCanInstall(false)
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    deferredPrompt.current = null
    setCanInstall(false)
  }, [])

  return { canInstall, promptInstall, dismiss }
}
