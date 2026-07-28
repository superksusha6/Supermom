// Bundle 3D model assets (glb/gltf) so the child's pet can be require()'d.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;
