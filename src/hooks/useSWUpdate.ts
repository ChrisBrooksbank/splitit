import { useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

export function useSWUpdate() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const updateFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedsRefresh(true)
      },
      onOfflineReady() {
        // silently ready — no action needed
      },
    })
    updateFnRef.current = updateSW
  }, [])

  function updateSW() {
    updateFnRef.current?.(true)
  }

  return { needsRefresh, updateSW }
}
