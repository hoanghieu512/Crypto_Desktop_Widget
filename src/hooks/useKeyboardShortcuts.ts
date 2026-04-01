import { useEffect } from 'react'

export type KeyboardShortcutsHandlers = {
  onSwitchTab: (tabIndex: number) => void
  onTogglePortfolio: () => void
  onClosePanel: () => void
  onOpenAlerts: () => void
  onRefresh: () => void
  onFocusSearch: () => void
  onShowHelp: () => void
}

function isTypingTarget(el: EventTarget | null): boolean {
  const t = el as HTMLElement | null
  if (!t) return false
  const tag = t.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if ((t as any).isContentEditable) return true
  return false
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutsHandlers, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      // Don't override OS/browser shortcuts with modifiers.
      if (event.metaKey || event.ctrlKey) return

      const typing = isTypingTarget(event.target)
      const key = event.key

      // Escape should always work (even while typing).
      if (key === 'Escape') {
        handlers.onClosePanel()
        return
      }

      // Ignore other shortcuts while typing.
      if (typing) return

      const alt = event.altKey

      // Tabs: 1/2/3 or Alt+1/2/3
      if (key === '1' && (alt || !alt)) {
        handlers.onSwitchTab(0)
        return
      }
      if (key === '2' && (alt || !alt)) {
        handlers.onSwitchTab(1)
        return
      }
      if (key === '3' && (alt || !alt)) {
        handlers.onSwitchTab(2)
        return
      }

      if (key === 'p' || key === 'P') {
        handlers.onTogglePortfolio()
        return
      }
      if (key === 'a' || key === 'A') {
        handlers.onOpenAlerts()
        return
      }
      if (key === 'r' || key === 'R') {
        handlers.onRefresh()
        return
      }
      if (key === '/') {
        event.preventDefault()
        handlers.onFocusSearch()
        return
      }
      if (key === '?') {
        handlers.onShowHelp()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, handlers])
}

