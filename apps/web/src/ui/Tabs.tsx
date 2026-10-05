import type { ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
  disabled?: boolean
  disabledHint?: string
}

interface TabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  children: ReactNode
}

export default function Tabs({ tabs, activeId, onChange, children }: TabsProps) {
  return (
    <div className="tabs">
      <div className="tabs__list" role="tablist">
        {tabs.map((tab) => {
          const selected = tab.id === activeId
          const classes = ['tabs__tab', selected ? 'tabs__tab--active' : ''].filter(Boolean).join(' ')
          return (
            <button
              key={tab.id}
              type="button"
              id={`${tab.id}-tab`}
              role="tab"
              aria-selected={selected}
              aria-controls={`${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              title={tab.disabled ? tab.disabledHint : undefined}
              className={classes}
              onClick={() => !tab.disabled && onChange(tab.id)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      <div
        className="tabs__panel"
        role="tabpanel"
        id={`${activeId}-panel`}
        aria-labelledby={`${activeId}-tab`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  )
}
