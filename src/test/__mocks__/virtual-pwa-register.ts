// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function registerSW(_options?: {
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
}): (reloadPage?: boolean) => Promise<void> {
  return async () => {}
}
