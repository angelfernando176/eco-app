interface CatalogDbError {
  message: string
  code?: string
}

/** Translates the exact DB error strings from `0004_catalog_limits_storage.sql` to Spanish. */
export function mapCatalogError(error: CatalogDbError): Error {
  const { message } = error

  const productLimit = message.match(/product limit exceeded \(max (\d+)\)/)
  if (productLimit) {
    return new Error(`Alcanzaste el límite de ${productLimit[1]} producto(s) de tu plan.`)
  }

  const imageLimit = message.match(/product image limit exceeded \(max (\d+)\)/)
  if (imageLimit) {
    return new Error(`Alcanzaste el límite de ${imageLimit[1]} imagen(es) por producto de tu plan.`)
  }

  const videoLimit = message.match(/video limit exceeded per business \(max (\d+)\)/)
  if (videoLimit) {
    return new Error(`Alcanzaste el límite de ${videoLimit[1]} video(s) por negocio de tu plan.`)
  }

  const skillLimit = message.match(/skill limit exceeded \(max (\d+)\)/)
  if (skillLimit) {
    return new Error(`Alcanzaste el límite de ${skillLimit[1]} skill(s) de tu plan.`)
  }

  if (message.includes('only an administrator can mark primary/secondary products')) {
    return new Error('Solo un administrador puede marcar productos como principal/secundario.')
  }

  if (error.code === '23505') {
    return new Error('Esa skill ya existe en este negocio.')
  }

  return new Error(message)
}
