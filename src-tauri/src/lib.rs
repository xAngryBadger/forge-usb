use serde::Serialize;
use std::os::unix::fs::FileTypeExt;
use std::path::PathBuf;
use tauri::command;

#[derive(Debug, Serialize, Clone)]
pub struct UsbDevice {
    device: String,
    vendor: String,
    model: String,
    size_bytes: u64,
    mountpoints: Vec<String>,
    removable: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct WriteProgress {
    bytes_written: u64,
    total_bytes: u64,
    status: String,
}

#[derive(Debug, Serialize)]
pub struct IsoInfo {
    path: String,
    size_bytes: u64,
    label: Option<String>,
}

fn read_size_from_sys(path: &std::path::Path) -> u64 {
    let size_path = path.join("size");
    std::fs::read_to_string(&size_path)
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
        .map(|sectors| sectors * 512)
        .unwrap_or(0)
}

fn read_removable(path: &std::path::Path) -> bool {
    std::fs::read_to_string(path.join("removable"))
        .map(|s| s.trim() == "1")
        .unwrap_or(false)
}

fn read_sys_string(path: &std::path::Path) -> String {
    std::fs::read_to_string(path)
        .map(|s| s.trim().to_string())
        .unwrap_or_default()
}

fn get_mountpoints(dev_name: &str) -> Vec<String> {
    let Ok(mounts) = std::fs::read_to_string("/proc/mounts") else {
        return vec![];
    };
    mounts
        .lines()
        .filter(|line| line.starts_with(&format!("/dev/{}", dev_name)))
        .filter_map(|line| line.split_whitespace().nth(1))
        .map(String::from)
        .collect()
}

#[command]
fn list_usb_devices() -> Result<Vec<UsbDevice>, String> {
    let sys_block = PathBuf::from("/sys/block");
    let entries = std::fs::read_dir(&sys_block).map_err(|e| e.to_string())?;

    let mut devices = Vec::new();

    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        let block_path = entry.path();

        if !read_removable(&block_path) {
            continue;
        }

        let size = read_size_from_sys(&block_path);
        if size == 0 {
            continue;
        }

        let vendor_path = block_path.join("device/vendor");
        let model_path = block_path.join("device/model");

        let vendor = read_sys_string(&vendor_path);
        let model = read_sys_string(&model_path);
        let mountpoints = get_mountpoints(&name);

        devices.push(UsbDevice {
            device: format!("/dev/{}", name),
            vendor,
            model,
            size_bytes: size,
            mountpoints,
            removable: true,
        });
    }

    devices.sort_by_key(|d| d.device.clone());
    Ok(devices)
}

#[command]
fn list_iso_files(directory: String) -> Result<Vec<IsoInfo>, String> {
    let dir = PathBuf::from(&directory);
    if !dir.exists() {
        return Ok(vec![]);
    }

    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    let mut isos = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        if ext == "iso" || ext == "img" || name.ends_with(".iso") || name.ends_with(".img") {
            let size = path.metadata().map(|m| m.len()).unwrap_or(0);
            isos.push(IsoInfo {
                path: path.to_string_lossy().to_string(),
                size_bytes: size,
                label: None,
            });
        }
    }

    isos.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    Ok(isos)
}

#[command]
fn unmount_device(device: String) -> Result<bool, String> {
    let mountpoints = get_mountpoints(&device.replace("/dev/", ""));

    for mp in &mountpoints {
        let status = std::process::Command::new("umount")
            .arg(mp)
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err(format!("Failed to unmount {}", mp));
        }
    }

    Ok(true)
}

fn validate_path_no_shell_injection(path: &str) -> Result<(), String> {
    let forbidden = [';', '|', '$', '`', '&', '>', '<', '(', ')', '{', '}', '\n', '\r', '\\', '!', '~', '*'];
    if path.chars().any(|c| forbidden.contains(&c)) {
        return Err(format!("Path contains forbidden characters: {}", path));
    }
    Ok(())
}

fn is_block_device(path: &PathBuf) -> bool {
    path.metadata().map(|m| m.file_type().is_block_device()).unwrap_or(false)
}

#[command]
fn write_iso_to_device(iso_path: String, device: String) -> Result<bool, String> {
    if !iso_path.starts_with('/') {
        return Err("ISO path must be absolute".to_string());
    }
    validate_path_no_shell_injection(&iso_path)?;

    if !device.starts_with("/dev/") && !device.starts_with("/sys/block/") {
        return Err("Device path must be under /dev/ or /sys/block/".to_string());
    }
    validate_path_no_shell_injection(&device)?;

    let iso = PathBuf::from(&iso_path);
    if !iso.exists() {
        return Err(format!("ISO not found: {}", iso_path));
    }
    if !iso.is_file() {
        return Err(format!("ISO path is not a file: {}", iso_path));
    }

    let dev = PathBuf::from(&device);
    if !dev.exists() {
        return Err(format!("Device not found: {}", device));
    }
    if !is_block_device(&dev) {
        return Err(format!("Not a block device: {}", device));
    }

    let unmount_result = unmount_device(device.clone())?;
    if !unmount_result {
        return Err("Could not unmount device".to_string());
    }

    let status = std::process::Command::new("dd")
        .arg(format!("if={}", iso_path))
        .arg(format!("of={}", device))
        .arg("bs=4M")
        .arg("status=progress")
        .arg("conv=fsync")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .status()
        .map_err(|e| format!("dd execution failed: {}", e))?;

    if status.success() {
        Ok(true)
    } else {
        Err("dd write failed — run with sudo or check device permissions".to_string())
    }
}

#[command]
fn get_home_dir() -> Result<String, String> {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "Cannot determine home directory".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_usb_devices,
            list_iso_files,
            unmount_device,
            write_iso_to_device,
            get_home_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
