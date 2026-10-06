import { Linking, StyleSheet, Text, View } from 'react-native'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { buildGoogleMapsUrls } from '../../services/businessDetailLogic'
import type { BusinessResult } from '../../services/businessSearchLogic'
import { colors, spacing, typography } from '../../theme'

export interface ContactTabProps {
  business: BusinessResult
}

export function ContactTab({ business }: ContactTabProps) {
  const { searchUrl } = buildGoogleMapsUrls(business.latitude, business.longitude, business.tradeName)

  function handleCall() {
    void Linking.openURL(`tel:${business.phone}`)
  }

  function handleEmail() {
    void Linking.openURL(`mailto:${business.representativeEmail}`)
  }

  function handleOpenMaps() {
    void Linking.openURL(searchUrl)
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.tradeName}>{business.tradeName}</Text>
        <Text style={styles.line}>
          {business.mainStreet} {business.number}, {business.secondaryStreet}
        </Text>
        {business.reference ? <Text style={styles.line}>{business.reference}</Text> : null}
        <Text style={styles.line}>RUC: {business.ruc}</Text>
        <Text style={styles.line}>Teléfono: {business.phone}</Text>
        <Text style={styles.line}>Correo: {business.representativeEmail}</Text>
      </Card>

      <View style={styles.actions}>
        <Button title="Llamar" onPress={handleCall} />
        <Button title="Enviar correo" variant="secondary" onPress={handleEmail} />
        <Button title="Abrir en Google Maps" variant="ghost" onPress={handleOpenMaps} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[4],
    gap: spacing[4],
  },
  card: {
    gap: spacing[1],
  },
  tradeName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold as '700',
    color: colors.brand[700],
    marginBottom: spacing[2],
  },
  line: {
    fontSize: typography.size.base,
    color: colors.gray[800],
  },
  actions: {
    gap: spacing[2],
  },
})
