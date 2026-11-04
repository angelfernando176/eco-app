interface InfoTooltipProps {
  label: string
  lines: string[]
}

/** Small "?" icon; hovering or focusing it reveals the restriction lines in a floating panel. */
export default function InfoTooltip({ label, lines }: InfoTooltipProps) {
  return (
    <span className="info-tooltip">
      <button type="button" className="info-tooltip__trigger" aria-label={label}>
        ?
      </button>
      <span className="info-tooltip__panel" role="tooltip">
        {lines.map((line, index) => (
          <span key={index} className="info-tooltip__line">
            {line}
          </span>
        ))}
      </span>
    </span>
  )
}
