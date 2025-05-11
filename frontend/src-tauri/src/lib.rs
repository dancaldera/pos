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
    // Execute the node print.js script with the receipt data
    let output = Command::new("node")
        .arg("print.js")
        .arg("print")
        .arg(receipt_data)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    println!("Command output: {}", String::from_utf8_lossy(&output.stdout));
    println!("Command error: {}", String::from_utf8_lossy(&output.stderr));
    
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
