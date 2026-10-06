import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Field, Tag } from '../../ui'
import type { BusinessTabProps } from '../businesses/tabTypes'
import { isUnderLimit } from '../plan/rules'
import { addSkill, deleteSkill, listSkills } from './api'
import { validateSkillName, CATALOG_FIELD_LIMITS } from './rules'
import type { Skill } from './types'

export default function SkillsTab({ business, plan }: BusinessTabProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  function reload() {
    setLoading(true)
    setLoadError(null)
    return listSkills(business.id)
      .then((list) => setSkills(list))
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'No se pudo cargar las skills.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id])

  const atLimit = !isUnderLimit(skills.length, plan.skills)
  const counterLabel = plan.skills === null ? `${skills.length} skills` : `${skills.length} de ${plan.skills}`

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    const error = validateSkillName(name)
    setFieldError(error)
    if (error || atLimit) return

    setSubmitting(true)
    try {
      await addSkill(business.id, name)
      setName('')
      setSubmitSuccess('Skill agregada correctamente.')
      await reload()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo agregar la skill.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(skill: Skill) {
    setRemoveError(null)
    setRemovingId(skill.id)
    try {
      await deleteSkill(skill.id)
      await reload()
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'No se pudo eliminar la skill.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="stack">
      {loading && (
        <div className="stack stack--sm stack--center">
          <span className="spinner spinner--lg" aria-hidden="true" />
          <p>Cargando skills…</p>
        </div>
      )}

      {!loading && loadError && <Alert tone="error">{loadError}</Alert>}

      {!loading && !loadError && (
        <>
          <span className="field__hint">{counterLabel}</span>

          {skills.length === 0 && <p>Este negocio todavía no tiene skills.</p>}

          {skills.length > 0 && (
            <div className="tag-list">
              {skills.map((skill) => (
                <Tag key={skill.id} onRemove={() => handleRemove(skill)} disabled={removingId === skill.id}>
                  {skill.name}
                </Tag>
              ))}
            </div>
          )}

          {removeError && <Alert tone="error">{removeError}</Alert>}

          <form className="cluster" onSubmit={handleAdd}>
            <Field
              label="Nueva skill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldError ?? undefined}
              maxLength={CATALOG_FIELD_LIMITS.skillName.max}
              disabled={atLimit}
            />
            <Button type="submit" loading={submitting} disabled={atLimit}>
              Agregar
            </Button>
          </form>

          {atLimit && (
            <span className="field__hint">
              Alcanzaste el límite de {plan.skills} skill(s) de tu plan. Eliminá una skill para agregar otra.
            </span>
          )}

          {submitError && <Alert tone="error">{submitError}</Alert>}
          {submitSuccess && <Alert tone="success">{submitSuccess}</Alert>}
        </>
      )}
    </div>
  )
}
