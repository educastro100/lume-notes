// Build-time verification only. No installer is launched and no registry is modified.
use tauri_plugin_updater::UpdaterExt;
fn main() {
 let args:Vec<String>=std::env::args().collect();
 assert_eq!(args.len(),3,"Usage: verify-release latest.json setup.exe");
 let config:serde_json::Value=serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
 let metadata:serde_json::Value=serde_json::from_slice(&std::fs::read(&args[1]).unwrap()).unwrap();
 let bytes=std::fs::read(&args[2]).unwrap();
 let mut context=tauri::test::mock_context(tauri::test::noop_assets());
 context.config_mut().plugins.0.insert("updater".into(),config["plugins"]["updater"].clone());
 let app=tauri::test::mock_builder().plugin(tauri_plugin_updater::Builder::new().build()).build(context).unwrap();
 let updater=app.updater_builder().version_comparator(|_,_|true).build().unwrap();
 let update=updater.restore_update(metadata.clone()).unwrap().unwrap();
 update.verify(&bytes).expect("Installer signature or version is invalid");
 let mut tampered=bytes.clone();tampered[0]^=1;
 assert!(update.verify(&tampered).is_err(),"Tampered installers must be rejected");
 let mut wrong_version=metadata;wrong_version["version"]=serde_json::json!(format!("{}-tampered",wrong_version["version"].as_str().unwrap()));
 assert!(updater.restore_update(wrong_version).unwrap().unwrap().verify(&bytes).is_err(),"The signature must bind the announced version");
 println!("Verified installer signature, signed version, tampering rejection and version-mismatch rejection.");
}
