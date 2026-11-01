const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Soporte de monorepo: permite que Metro resuelva @eco/shared y transpile su TS.
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// Expo auto-detecta el monorepo y mueve el "server root" a workspaceRoot,
// lo que rompe la ruta relativa de --entry-file que calcula el React Native
// Gradle Plugin (relativa a apps/mobile). Se fija explícitamente a projectRoot.
config.server = { ...config.server, unstable_serverRoot: projectRoot }

module.exports = config
