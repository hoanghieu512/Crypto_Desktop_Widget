export type AppToastPayload = {
  type: 'error'
  title: string
  message: string
}

const EVT = 'app:toast-error'

export function showErrorToast(title: string, message: string): void {
  window.dispatchEvent(
    new CustomEvent<AppToastPayload>(EVT, {
      detail: { type: 'error', title, message },
    }),
  )
}

export const APP_TOAST_ERROR_EVENT = EVT
