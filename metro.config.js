// Learn more: https://docs.expo.dev/guides/customizing-metro/

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

/**
 * expo-sqlite runs SQLite in the browser through a WebAssembly build, loaded
 * by a web worker. Metro treats unknown extensions as modules and tries to
 * resolve them, so `.wasm` has to be declared an asset or the web bundle fails
 * at import time with "Unable to resolve module ./wa-sqlite/wa-sqlite.wasm".
 *
 * This only affects the web platform; iOS and Android use the native SQLite
 * build and never touch this file.
 */
config.resolver.assetExts.push('wasm');

module.exports = config;