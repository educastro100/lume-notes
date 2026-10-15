use std::path::{Path, PathBuf};

pub fn command_for(executable: &Path) -> Result<String, String> {
    if !executable.is_absolute() || executable.to_string_lossy().contains('"') { return Err("Caminho do aplicativo inválido.".into()); }
    Ok(format!("\"{}\" \"%1\"", executable.display()))
}

pub fn argument_files(args: impl IntoIterator<Item=String>, cwd: &Path) -> Vec<String> {
    let mut paths = Vec::new();
    for argument in args.into_iter().skip(1) {
        if argument.starts_with('-') { continue; }
        let candidate = PathBuf::from(argument);
        let path = if candidate.is_absolute() {candidate} else {cwd.join(candidate)};
        if !path.is_file() {continue;}
        if let Ok(path) = path.canonicalize() {
            let path = super::display_path(&path);
            if !paths.iter().any(|item: &String| item.eq_ignore_ascii_case(&path)) { paths.push(path); }
        }
    }
    paths
}

#[cfg(windows)]
mod registry {
    use super::*;
    use winreg::{RegKey, enums::{HKEY_CURRENT_USER, KEY_READ, KEY_WRITE}};
    const PROGRAM: &str = "LumeNotes.Document";
    const CAPABILITIES: &str = r"Software\LumeNotes\Capabilities";
    fn application_key() -> Result<String,String> {
        let path=std::env::current_exe().map_err(|e|e.to_string())?;
        Ok(format!(r"Applications\{}",path.file_name().ok_or("Nome do aplicativo inválido.")?.to_string_lossy()))
    }
    pub fn installed() -> Result<bool,String> {
        let current=super::super::display_path(&std::env::current_exe().map_err(|e|e.to_string())?);
        let saved:Option<String>=RegKey::predef(HKEY_CURRENT_USER).open_subkey(r"Software\LumeNotes\Install").ok().and_then(|key|key.get_value("Executable").ok());
        Ok(saved.map(|path|path.eq_ignore_ascii_case(&current)).unwrap_or(false))
    }
    const EXTENSIONS: [&str;5] = [".txt", ".md", ".json", ".log", ".csv"];
    fn classes() -> Result<RegKey,String> {
        RegKey::predef(HKEY_CURRENT_USER).create_subkey(r"Software\Classes").map(|pair| pair.0).map_err(|e|e.to_string())
    }
    pub fn status() -> Result<bool,String> {
        let current = command_for(&std::env::current_exe().map_err(|e|e.to_string())?)?;
        let root = match RegKey::predef(HKEY_CURRENT_USER).open_subkey(r"Software\Classes") {Ok(key)=>key, Err(error) if error.kind()==std::io::ErrorKind::NotFound => return Ok(false), Err(error)=>return Err(error.to_string())};
        let command: Option<String> = root.open_subkey(format!(r"{PROGRAM}\shell\open\command")).ok().and_then(|key|key.get_value("").ok());
        Ok(command.as_deref()==Some(current.as_str()))
    }
    pub fn set(enabled: bool) -> Result<bool,String> {
        let root = classes()?;
        if !enabled && installed()? {return Err("A integração da versão instalada é gerenciada pelo instalador.".into());}
        if enabled {
            let command = command_for(&std::env::current_exe().map_err(|e|e.to_string())?)?;
            let (program,_) = root.create_subkey(PROGRAM).map_err(|e|e.to_string())?;
            program.set_value("", &"Lume Notes Document").map_err(|e|e.to_string())?;
            program.create_subkey(r"shell\open\command").and_then(|(key,_)|key.set_value("",&command)).map_err(|e|e.to_string())?;
            let (app,_) = root.create_subkey(application_key()?).map_err(|e|e.to_string())?;
            app.set_value("FriendlyAppName",&"Lume Notes").map_err(|e|e.to_string())?;
            let current=std::env::current_exe().map_err(|e|e.to_string())?;
            let icon=format!("\"{}\",0",current.display());
            program.create_subkey("DefaultIcon").and_then(|(key,_)|key.set_value("",&icon)).map_err(|e|e.to_string())?;
            let user=RegKey::predef(HKEY_CURRENT_USER);
            let (capabilities,_)=user.create_subkey(CAPABILITIES).map_err(|e|e.to_string())?;
            capabilities.set_value("ApplicationName",&"Lume Notes").map_err(|e|e.to_string())?;
            capabilities.set_value("ApplicationDescription",&"Editor de texto e Markdown com abas.").map_err(|e|e.to_string())?;
            capabilities.set_value("ApplicationIcon",&icon).map_err(|e|e.to_string())?;
            let (types,_)=capabilities.create_subkey("FileAssociations").map_err(|e|e.to_string())?;
            for extension in EXTENSIONS {types.set_value(extension,&PROGRAM).map_err(|e|e.to_string())?;}
            user.create_subkey(r"Software\RegisteredApplications").and_then(|(key,_)|key.set_value("Lume Notes",&CAPABILITIES)).map_err(|e|e.to_string())?;
            app.create_subkey(r"shell\open\command").and_then(|(key,_)|key.set_value("",&command)).map_err(|e|e.to_string())?;
            let (supported,_) = app.create_subkey("SupportedTypes").map_err(|e|e.to_string())?;
            for extension in EXTENSIONS {
                supported.set_value(extension,&"").map_err(|e|e.to_string())?;
                root.create_subkey(format!(r"{extension}\OpenWithProgids")).and_then(|(key,_)|key.set_value(PROGRAM,&"")).map_err(|e|e.to_string())?;
            }
        } else {
            // Remove only Lume-owned entries, leaving defaults and other applications untouched.
            for extension in EXTENSIONS {
                if let Ok(key) = root.open_subkey_with_flags(format!(r"{extension}\OpenWithProgids"),KEY_READ|KEY_WRITE) {
                    if let Err(error)=key.delete_value(PROGRAM) {if error.kind()!=std::io::ErrorKind::NotFound {return Err(error.to_string());}}
                }
            }
            let user=RegKey::predef(HKEY_CURRENT_USER);
            if let Ok(key)=user.open_subkey_with_flags(r"Software\RegisteredApplications",KEY_READ|KEY_WRITE) {let _=key.delete_value("Lume Notes");}
            let _=user.delete_subkey_all(CAPABILITIES);
            for name in [PROGRAM.to_string(), application_key()?] {
                if let Err(error)=root.delete_subkey_all(&name) {if error.kind()!=std::io::ErrorKind::NotFound {return Err(error.to_string());}}
            }
        }
        #[link(name="shell32")]
        extern "system" {fn SHChangeNotify(event:i32,flags:u32,item1:*const std::ffi::c_void,item2:*const std::ffi::c_void);}
        unsafe {SHChangeNotify(0x08000000,0,std::ptr::null(),std::ptr::null());}
        Ok(enabled)
    }
}

#[tauri::command]
pub fn open_with_status() -> Result<bool,String> {
    #[cfg(windows)] {registry::status()}
    #[cfg(not(windows))] {Ok(false)}
}
#[tauri::command]
pub fn set_open_with(enabled:bool) -> Result<bool,String> {
    #[cfg(windows)] {registry::set(enabled)}
    #[cfg(not(windows))] {let _=enabled;Err("Integração disponível no Windows.".into())}
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn shell_command_quotes_both_executable_and_document() {
        let dir=tempfile::tempdir().unwrap();
        let executable=dir.path().join("Pasta com espaços").join("Lume Notes.exe");
        let command=command_for(&executable).unwrap();
        assert!(command.starts_with('"'));assert!(command.ends_with("\" \"%1\""));
        assert!(command_for(Path::new("relative.exe")).is_err());
    }
    #[test]
    fn launch_arguments_preserve_spaces_deduplicate_and_ignore_flags() {
        let dir=tempfile::tempdir().unwrap();let name="roteiro com espaços.md";
        std::fs::write(dir.path().join(name),"texto").unwrap();
        let args=vec!["Lume Notes.exe".into(),name.into(),"--flag".into(),name.into(),"missing.md".into()];
        let paths=argument_files(args,dir.path());assert_eq!(paths.len(),1);assert!(paths[0].ends_with(name));
    }
}

#[tauri::command]
pub fn is_installed() -> Result<bool,String> {
    #[cfg(windows)] {registry::installed()}
    #[cfg(not(windows))] {Ok(false)}
}
#[cfg(windows)]
fn open_system_page(uri:&str) -> Result<(),String> {
    use std::os::windows::ffi::OsStrExt;
    let uri:Vec<u16>=std::ffi::OsStr::new(uri).encode_wide().chain(Some(0)).collect();
    #[link(name="shell32")]
    extern "system" {fn ShellExecuteW(hwnd:isize,verb:*const u16,file:*const u16,parameters:*const u16,directory:*const u16,show:i32)->isize;}
    // Shell extensions require COM on the background thread that opens the URI.
    #[link(name="ole32")]
    extern "system" {
        fn CoInitializeEx(reserved:*mut std::ffi::c_void, flags:u32)->i32;
        fn CoUninitialize();
    }
    let apartment=unsafe {CoInitializeEx(std::ptr::null_mut(),0x2 | 0x4)};
    if apartment<0 {return Err("Não foi possível inicializar a integração do Windows.".into());}
    let result=unsafe {ShellExecuteW(0,std::ptr::null(),uri.as_ptr(),std::ptr::null(),std::ptr::null(),1)};
    unsafe {CoUninitialize();}
    if result<=32 {Err("Não foi possível abrir esta página do Windows.".into())} else {Ok(())}
}
#[tauri::command]
pub async fn open_default_apps() -> Result<(),String> {
    #[cfg(windows)] {
        tauri::async_runtime::spawn_blocking(|| {
            registry::set(true)?;
            open_system_page("ms-settings:defaultapps?registeredAppUser=Lume%20Notes")
        }).await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))] {Err("Disponível no Windows.".into())}
}
#[tauri::command]
pub async fn open_release_downloads() -> Result<(),String> {
    #[cfg(windows)] {
        tauri::async_runtime::spawn_blocking(|| open_system_page("https://github.com/educastro100/lume-notes-releases/releases/latest"))
            .await.map_err(|e| e.to_string())?
    }
    #[cfg(not(windows))] {Err("Disponível no Windows.".into())}
}
