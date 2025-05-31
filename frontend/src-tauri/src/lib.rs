use std::process::Command;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct PrintReceiptData {
    title: String,
    address: String,
    phone: String,
    items: Vec<PrintReceiptItem>,
    subtotal: f64,
    tax: f64,
    taxRate: f64,
    total: f64,
    footer: String,
    date: String,
    time: String,
}

#[derive(Debug, Deserialize)]
struct PrintReceiptItem {
    name: String,
    quantity: i32,
    price: f64,
    total: f64,
}

#[tauri::command]
async fn print_thermal_receipt(receipt_data: String) -> Result<String, String> {
    // Escape single quotes in the JSON data for shell safety
    let escaped_data = receipt_data.replace("'", "'\\''"); 
    
    // Create the exact command string that works in your terminal
    let command = format!("print print '{}'", escaped_data);
    
    // Load user's shell configuration and ensure PATH is correctly set
    // This ensures the command is run in the same environment as your terminal
    let output = Command::new("bash")
        .arg("-l")  // Login shell to load full environment
        .arg("-i")  // Interactive mode to ensure all user configs are loaded
        .arg("-c")
        .arg(command)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;
    
    if output.status.success() {
        // Convert bytes to string, handle UTF-8 conversion errors
        let stdout = String::from_utf8(output.stdout)
            .map_err(|e| format!("Invalid UTF-8 in command output: {}", e))?;
        Ok(stdout)
    } else {
        let stderr = String::from_utf8(output.stderr)
            .map_err(|e| format!("Invalid UTF-8 in error output: {}", e))?;
        Err(format!("Command failed: {}", stderr))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
    .invoke_handler(tauri::generate_handler![print_thermal_receipt])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
