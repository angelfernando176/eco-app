import type { ReactNode } from 'react'

type AlertTone = 'error' | 'success' | 'info'

interface AlertProps {
  tone: AlertTone
  children: ReactNode
}

export default function Alert({ tone, children }: AlertProps) {
  return (
    <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
