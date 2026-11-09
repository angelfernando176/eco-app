import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Button } from '../components/Button'
import { Chip } from '../components/Chip'
import { TextField } from '../components/TextField'
import { DEACTIVATION_REASONS, type DeactivationReason } from '../services/mobileBusinessLogic'
import { commonStyles } from '../styles/common'
import { colors, spacing, typography } from '../theme'

export interface DeactivationSurveyScreenProps {
  onEnviado: (reason: DeactivationReason, comment: string) => void
  onCancel: () => void
}

export function DeactivationSurveyScreen({ onEnviado, onCancel }: DeactivationSurveyScreenProps) {
  const [reason, setReason] = useState<DeactivationReason | null>(null)
  const [comment, setComment] = useState('')

  function handleEnviar() {
    if (!reason) return
    onEnviado(reason, comment)
  }

  return (
    <ScrollView style={commonStyles.container} contentContainerStyle={commonStyles.content}>
      <Pressable onPress={onCancel} style={styles.cancel}>
        <Text style={commonStyles.cancelText}>‹ Cancelar</Text>
      </Pressable>

      <Text style={[commonStyles.title, styles.titleOverride]}>Dar de baja mi negocio</Text>
      <Text style={styles.subtitle}>¿Por qué quieres dar de baja tu negocio?</Text>

      <View style={styles.chips}>
        {DEACTIVATION_REASONS.map((r) => (
          <Chip key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
        ))}
      </View>

      <TextField
        label="Comentario (opcional)"
        value={comment}
        onChangeText={setComment}
        placeholder="Cuéntanos más…"
        multiline
        numberOfLines={4}
      />

      <Button title="Enviar" onPress={handleEnviar} disabled={!reason} style={styles.sendButton} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  cancel: {
    marginBottom: spacing[2],
  },
  titleOverride: {
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.size.base,
    color: colors.gray[700],
    marginBottom: spacing[1],
  },
  chips: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  sendButton: {
    marginTop: spacing[4],
  },
})
