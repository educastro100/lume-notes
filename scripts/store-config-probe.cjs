// Invoked only by check-store-config.mjs after Tauri configuration validation.
// Deliberately stop before compiling or packaging any application.
console.log('LUME_STORE_CONFIG_VALIDATED');
process.exit(42);
