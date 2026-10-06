import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { StarRating } from '../../components/StarRating'
import { TextField } from '../../components/TextField'
import { guardarCalificacionPendiente } from '../../db/calificaciones'
import { obtenerIngreso } from '../../db/ingreso'
import { syncPending } from '../../services/sync'
import { validateRatingInput } from '../../services/syncLogic'
import { colors, spacing, typography } from '../../theme'

export interface RateTabProps {
  businessId: string
  onSubmitted: () => void
}

const COMMENT_MAX_LENGTH = 500

type Outcome = { kind: 'synced' | 'offline'; message: string } | null

export function RateTab({ businessId, onSubmitted }: RateTabProps) {
  const [rating, setRating] = useState(0)
  const [comentario, setComentario] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<Outcome>(null)

  const ingreso = obtenerIngreso()

  if (!ingreso) {
    return (
      <View style={styles.container}>
        <Banner
          variant="info"
          message="Para calificar un negocio primero necesitamos tus datos de ingreso (nombre y rango de edad)."
        />
      </View>
    )
  }

  async function handleSubmit() {
    if (submitting) return

    const validationError = validateRatingInput({ businessId, rating, comentario })
    if (validationError) {
      setFieldError(validationError.message)
      return
    }

    setFieldError(null)
    setOutcome(null)
    setSubmitting(true)

    try {
      guardarCalificacionPendiente({ businessId, rating, comentario: comentario.trim() })
      const result = await syncPending()
      if (result.ratingsPending === 0) {
        setOutcome({ kind: 'synced', message: '¡Gracias! Tu calificación fue enviada.' })
      } else {
        setOutcome({ kind: 'offline', message: 'Guardamos tu calificación y se enviará cuando haya conexión.' })
      }
      setRating(0)
      setComentario('')
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tu calificación</Text>
      <StarRating value={rating} onChange={setRating} size={32} />

      <TextField
        label="Comentario (opcional)"
        value={comentario}
        onChangeText={(text) => setComentario(text.slice(0, COMMENT_MAX_LENGTH))}
        placeholder="Cuéntanos tu experiencia"
        multiline
        maxLength={COMMENT_MAX_LENGTH}
      />
      <Text style={styles.counter}>
        {comentario.length}/{COMMENT_MAX_LENGTH}
      </Text>

      {fieldError ? <Banner variant="error" message={fieldError} /> : null}
      {outcome ? <Banner variant="info" message={outcome.message} /> : null}

      <Button title="Enviar calificación" onPress={handleSubmit} loading={submitting} disabled={submitting} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[3],
  },
  label: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium as '500',
    color: colors.gray[700],
  },
  counter: {
    fontSize: typography.size.xs,
    color: colors.gray[500],
    alignSelf: 'flex-end',
  },
})
