fn main() {
    println!("cargo:rerun-if-env-changed=VITE_LUME_DISTRIBUTION");
    if std::env::var_os("CARGO_FEATURE_MICROSOFT_STORE").is_some() {
        assert_eq!(std::env::var("VITE_LUME_DISTRIBUTION").as_deref(), Ok("microsoft-store"),
            "The microsoft-store native feature requires VITE_LUME_DISTRIBUTION=microsoft-store");
    } else {
        assert_ne!(std::env::var("VITE_LUME_DISTRIBUTION").as_deref(), Ok("microsoft-store"),
            "Store frontend requires the microsoft-store native feature");
    }
    tauri_build::build();
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        embed_resource::compile_for_examples("examples/verify-release.rc", embed_resource::NONE)
            .manifest_required()
            .unwrap();
    }
}
