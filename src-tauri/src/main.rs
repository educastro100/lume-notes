#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::{Path, PathBuf}};
use tauri::{Manager, Emitter};
use std::sync::Mutex;
mod open_with;
struct PendingFiles(Mutex<Vec<String>>);
#[tauri::command]
fn take_pending_files(pending: tauri::State<PendingFiles>) -> Vec<String> { std::mem::take(&mut *pending.0.lock().unwrap_or_else(|error|error.into_inner())) }
const MAX_FILE_BYTES: u64 = 16 * 1024 * 1024;
const MAX_SESSION_BYTES: usize = 64 * 1024 * 1024;

#[derive(Serialize)]
struct ReadResult { bytes: Vec<u8>, digest: String, path: String }
#[derive(Serialize, Debug)]
struct SaveResult { digest: String, path: String }
fn digest(bytes: &[u8]) -> String { format!("{:x}", Sha256::digest(bytes)) }
fn clean_path(path: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(path);
    if !p.is_absolute() { return Err("Selecione um caminho absoluto.".into()); }
    Ok(p)
}
fn display_path(path: &Path) -> String {
    let text = path.to_string_lossy();
    if let Some(unc) = text.strip_prefix(r"\\?\UNC\") { format!(r"\\{}", unc) }
    else { text.strip_prefix(r"\\?\").unwrap_or(&text).to_string() }
}
fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let parent = path.parent().ok_or("Pasta de destino inválida.")?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent).map_err(|e|format!("Não foi possível criar um arquivo temporário: {e}"))?;
    temporary.write_all(bytes).and_then(|_|temporary.as_file().sync_all()).map_err(|e|format!("Não foi possível gravar os dados: {e}"))?;
    temporary.persist(path).map_err(|e|format!("Não foi possível substituir o arquivo: {e}"))?;
    Ok(())
}
#[tauri::command]
fn read_file(path: String) -> Result<ReadResult, String> {
    let path=clean_path(&path)?.canonicalize().map_err(|e|format!("Não foi possível localizar o arquivo: {e}"))?;
    let metadata=fs::metadata(&path).map_err(|e|e.to_string())?;
    if !metadata.is_file() { return Err("Selecione um arquivo de texto.".into()); }
    if metadata.len()>MAX_FILE_BYTES { return Err("O limite desta versão é de 16 MB por arquivo.".into()); }
    let bytes=fs::read(&path).map_err(|e|format!("Não foi possível abrir o arquivo: {e}"))?;
    if bytes.len() as u64 > MAX_FILE_BYTES { return Err("O arquivo cresceu além do limite de 16 MB.".into()); }
    Ok(ReadResult { digest:digest(&bytes), bytes, path:display_path(&path) })
}
fn save_checked(path: &Path, bytes: &[u8], expected_digest: Option<&str>, force: bool) -> Result<(), String> {
    if bytes.len() as u64>MAX_FILE_BYTES { return Err("O limite desta versão é de 16 MB por arquivo.".into()); }
    if !force {
        if let Some(expected)=expected_digest {
            let actual=fs::read(path).map_err(|_|"FILE_CHANGED: O arquivo foi removido ou ficou inacessível.".to_string())?;
            if digest(&actual)!=expected { return Err("FILE_CHANGED: O arquivo foi alterado por outra aplicação.".into()); }
        }
    }
    atomic_write(path,bytes)
}
#[tauri::command]
fn save_file(path: String, bytes: Vec<u8>, expected_digest: Option<String>, force: bool) -> Result<SaveResult, String> {
    let requested=clean_path(&path)?;
    let path=if requested.exists() { requested.canonicalize().map_err(|e|e.to_string())? } else { requested };
    save_checked(&path,&bytes,expected_digest.as_deref(),force)?;
    Ok(SaveResult { digest:digest(&bytes), path:display_path(&path) })
}
fn valid_file_name(name: &str) -> bool {
    let stem=name.split('.').next().unwrap_or("").trim_end_matches(' ').to_uppercase();
    let reserved=["CON","PRN","AUX","NUL"].contains(&stem.as_str()) ||
        ["COM","LPT"].iter().any(|prefix| stem.strip_prefix(prefix).map(|suffix| ["1","2","3","4","5","6","7","8","9","¹","²","³"].contains(&suffix)).unwrap_or(false));
    !name.is_empty() && name != "." && name != ".." && !name.ends_with([' ', '.']) &&
        name.encode_utf16().count() <= 255 && !reserved &&
        !name.chars().any(|c| c < ' ' || "<>:\"/\\|?*".contains(c))
}
#[cfg(windows)]
fn move_without_replacing(source: &Path, destination: &Path) -> Result<(), String> {
    use std::os::windows::ffi::OsStrExt;
    #[link(name="kernel32")]
    extern "system" { fn MoveFileExW(source: *const u16, destination: *const u16, flags: u32) -> i32; }
    let source:Vec<u16>=source.as_os_str().encode_wide().chain(Some(0)).collect();
    let destination:Vec<u16>=destination.as_os_str().encode_wide().chain(Some(0)).collect();
    // Flags zero deliberately forbids replacing any existing destination, even in a race.
    if unsafe { MoveFileExW(source.as_ptr(),destination.as_ptr(),0) } == 0 {
        let error=std::io::Error::last_os_error();
        if matches!(error.raw_os_error(),Some(80)|Some(183)) { return Err("NAME_EXISTS".into()); }
        return Err(format!("Não foi possível renomear o arquivo: {error}"));
    }
    Ok(())
}
#[cfg(not(windows))]
fn move_without_replacing(source: &Path, destination: &Path) -> Result<(), String> {
    fs::hard_link(source,destination).map_err(|e| if e.kind()==std::io::ErrorKind::AlreadyExists { "NAME_EXISTS".into() } else { e.to_string() })?;
    if let Err(error)=fs::remove_file(source) { let _=fs::remove_file(destination); return Err(error.to_string()); }
    Ok(())
}
fn rename_checked(path: &Path, name: &str, expected_digest: &str) -> Result<SaveResult,String> {
    if !valid_file_name(name) { return Err("INVALID_NAME".into()); }
    let bytes=fs::read(path).map_err(|_| "FILE_CHANGED".to_string())?;
    let current_digest=digest(&bytes);
    if current_digest!=expected_digest { return Err("FILE_CHANGED".into()); }
    let destination=path.parent().ok_or("Pasta inválida.")?.join(name);
    if path!=destination { move_without_replacing(path,&destination)?; }
    Ok(SaveResult { digest:current_digest, path:display_path(&destination) })
}
#[tauri::command]
fn rename_file(path: String, name: String, expected_digest: Option<String>) -> Result<SaveResult,String> {
    let source=clean_path(&path)?.canonicalize().map_err(|_| "FILE_CHANGED".to_string())?;
    rename_checked(&source,&name,expected_digest.as_deref().ok_or("FILE_CHANGED")?)
}
fn session_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory=if let Some(override_path)=std::env::var_os("LUME_DATA_DIR") { PathBuf::from(override_path) } else { app.path().app_data_dir().map_err(|e|e.to_string())? };
    Ok(directory.join("session.json"))
}
#[tauri::command]
fn load_session(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path=session_path(&app)?;
    if !path.exists() { return Ok(None); }
    let metadata=fs::metadata(&path).map_err(|e|e.to_string())?;
    if metadata.len()>MAX_SESSION_BYTES as u64 { return Err("Sessão anterior excede o limite de recuperação.".into()); }
    fs::read_to_string(path).map(Some).map_err(|e|e.to_string())
}
#[tauri::command]
fn store_session(app: tauri::AppHandle, value: String) -> Result<(), String> {
    if value.len()>MAX_SESSION_BYTES { return Err("Os rascunhos excedem o limite de 64 MB. Salve e feche alguns arquivos.".into()); }
    let _:serde_json::Value=serde_json::from_str(&value).map_err(|e|e.to_string())?;
    let path=session_path(&app)?;
    fs::create_dir_all(path.parent().ok_or("Pasta de rascunhos inválida.")?).map_err(|e|e.to_string())?;
    atomic_write(&path,value.as_bytes())
}
fn main() {
    let cwd=std::env::current_dir().unwrap_or_else(|_|PathBuf::from("."));
    let initial=open_with::argument_files(std::env::args(),&cwd);
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app,args,cwd| {
            let incoming=open_with::argument_files(args,Path::new(&cwd));
            app.state::<PendingFiles>().0.lock().unwrap_or_else(|error|error.into_inner()).extend(incoming);
            let _=app.emit("lume-open-files",());
            if let Some(window)=app.get_webview_window("main") {let _=window.show(); let _=window.unminimize(); let _=window.set_focus();}
        }))
        .manage(PendingFiles(Mutex::new(initial)))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![read_file,save_file,rename_file,load_session,store_session,take_pending_files,open_with::open_with_status,open_with::set_open_with])
        .run(tauri::generate_context!()).expect("Não foi possível iniciar o Lume Notes");
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rename_preserves_bytes_and_updates_path() {
        let dir=tempfile::tempdir().unwrap(); let source=dir.path().join("old.md");
        let bytes=b"original\r\ntext"; fs::write(&source,bytes).unwrap();
        let result=rename_checked(&source,"ideias.md",&digest(bytes)).unwrap();
        assert!(!source.exists()); assert_eq!(fs::read(dir.path().join("ideias.md")).unwrap(),bytes);
        assert_eq!(result.digest,digest(bytes)); assert!(result.path.ends_with("ideias.md"));
    }
    #[test]
    fn rename_never_overwrites_a_destination_or_an_external_change() {
        let dir=tempfile::tempdir().unwrap(); let source=dir.path().join("old.md"); let other=dir.path().join("other.md");
        fs::write(&source,b"mine").unwrap(); fs::write(&other,b"other").unwrap();
        assert!(rename_checked(&source,"other.md",&digest(b"mine")).unwrap_err().contains("NAME_EXISTS"));
        assert_eq!(fs::read(&source).unwrap(),b"mine"); assert_eq!(fs::read(&other).unwrap(),b"other");
        fs::write(&source,b"external").unwrap();
        assert!(rename_checked(&source,"new.md",&digest(b"mine")).unwrap_err().contains("FILE_CHANGED"));
        assert_eq!(fs::read(&source).unwrap(),b"external"); assert!(!dir.path().join("new.md").exists());
    }
    #[test]
    fn rename_rejects_reserved_names_and_directory_traversal() {
        for name in ["", ".", "..", "../x.md", "sub/x.md", "sub\\x.md", "CON.md", "LPT1.txt", "a.", "a ", "x:y.md", "NUL"] { assert!(!valid_file_name(name),"{name}"); }
        assert!(valid_file_name("Ideias para amanhã.md"));
    }
    #[cfg(windows)]
    #[test]
    fn rename_supports_case_only_changes() {
        let dir=tempfile::tempdir().unwrap(); let source=dir.path().join("case.md"); fs::write(&source,b"x").unwrap();
        rename_checked(&source,"CASE.md",&digest(b"x")).unwrap();
        assert_eq!(fs::read(dir.path().join("CASE.md")).unwrap(),b"x");
        assert_eq!(fs::read_dir(dir.path()).unwrap().next().unwrap().unwrap().file_name(),"CASE.md");
    }
    #[test]
    fn external_changes_are_not_overwritten() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("texto.txt");
        fs::write(&path,b"original").unwrap();let baseline=digest(b"original");
        fs::write(&path,b"external").unwrap();
        assert!(save_checked(&path,b"mine",Some(&baseline),false).unwrap_err().contains("FILE_CHANGED"));
        assert_eq!(fs::read(&path).unwrap(),b"external");
        save_checked(&path,b"mine",Some(&baseline),true).unwrap();assert_eq!(fs::read(&path).unwrap(),b"mine");
    }
    #[test]
    fn atomic_save_preserves_exact_encoded_bytes() {
        let dir=tempfile::tempdir().unwrap();let path=dir.path().join("acentuação.txt");
        let bytes=[0xff,0xfe,0x61,0x00,0x0d,0x00,0x0a,0x00];
        save_checked(&path,&bytes,None,false).unwrap();assert_eq!(fs::read(path).unwrap(),bytes);
    }
    #[test]
    fn deleted_files_require_explicit_replacement() {
        let dir=tempfile::tempdir().unwrap();assert!(save_checked(&dir.path().join("missing.txt"),b"data",Some("old"),false).unwrap_err().contains("FILE_CHANGED"));
    }
}
