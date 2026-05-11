const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pretty-format's exports field blocks internal relative imports in Metro
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
