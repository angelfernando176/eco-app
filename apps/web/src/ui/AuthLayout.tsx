import type { ReactNode } from 'react'
import Card from './Card'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-layout">
      <div className="auth-layout__brand">ECO</div>
      <div className="auth-layout__card">
        <Card>
          <div className="auth-layout__header">
            <h2>{title}</h2>
            {subtitle && <p className="auth-layout__subtitle">{subtitle}</p>}
          </div>
          {children}
        </Card>
      </div>
    </div>
  )
}
