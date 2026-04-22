// 隐藏 Windows 下的控制台黑框
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use device_query::{DeviceQuery, DeviceState};
use serde_json::json;
use std::fs;
use std::process::Command as StdCommand;
use std::process::Stdio;
use std::thread;
use std::time::Duration;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command as AsyncCommand;

// ============================================================================
// 🌟 语音转文字模块 (保持不变)
// ============================================================================
#[tauri::command]
async fn transcribe_audio(app: tauri::AppHandle, audio_bytes: Vec<u8>) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let audio_path = temp_dir.join("yuki_temp_record.wav");
    let out_file_prefix = temp_dir.join("yuki_transcription");
    let out_file_txt = temp_dir.join("yuki_transcription.txt");

    let _ = fs::remove_file(&out_file_txt);
    fs::write(&audio_path, &audio_bytes).map_err(|e| format!("无法写入临时音频: {}", e))?;

    let current_dir = std::env::current_dir().unwrap_or_default();
    let dev_exe_path = current_dir.join("bin").join("whisper-cli-x86_64-pc-windows-msvc.exe");
    let dev_model_path = current_dir.join("resources").join("ggml-base.bin");

    let final_model_path = if dev_model_path.exists() {
        dev_model_path
    } else {
        let resource_dir = app.path().resource_dir().map_err(|e| format!("找不到资源目录: {}", e))?;
        resource_dir.join("resources").join("ggml-base.bin")
    };

    if !final_model_path.exists() { return Err(format!("【文件丢失】找不到模型: {:?}", final_model_path)); }

    let (success, stderr_str) = if dev_exe_path.exists() {
        let out = StdCommand::new(&dev_exe_path)
            .arg("-m").arg(&final_model_path).arg("-f").arg(&audio_path).arg("-l").arg("zh").arg("-nt").arg("-otxt").arg("-of").arg(&out_file_prefix)
            .output().map_err(|e| format!("原生进程启动崩溃: {}", e))?;
        (out.status.success(), String::from_utf8_lossy(&out.stderr).to_string())
    } else {
        let sidecar_command = app.shell().sidecar("bin/whisper-cli").map_err(|e| format!("无法加载外挂程序: {}", e))?;
        let out = sidecar_command
            .arg("-m").arg(final_model_path.to_string_lossy().to_string()).arg("-f").arg(audio_path.to_string_lossy().to_string()).arg("-l").arg("zh").arg("-nt").arg("-otxt").arg("-of").arg(out_file_prefix.to_string_lossy().to_string())
            .output().await.map_err(|e| format!("Sidecar 执行崩溃: {}", e))?;
        (out.status.success(), String::from_utf8_lossy(&out.stderr).to_string())
    };

    if success {
        if out_file_txt.exists() {
            let text = fs::read_to_string(&out_file_txt).unwrap_or_default();
            let _ = fs::remove_file(&out_file_txt);
            Ok(text.trim().to_string())
        } else {
            Ok("".to_string())
        }
    } else {
        Err(format!("Whisper 内部报错:\n{}", stderr_str))
    }
}


// 🌟 1. 定义 MCP 配置结构体 (补上了 env 字段！)
#[derive(serde::Deserialize, serde::Serialize, Clone)]
struct McpConfig {
    name: String,
    command: String,
    args: Vec<String>,
    env: Option<std::collections::HashMap<String, String>>, // 👈 核心：接收前端传来的环境变量
    enabled: bool,
}

// 🌟 2. 获取所有已启用 MCP 插件的合集工具
#[tauri::command]
async fn get_all_mcp_tools(configs: Vec<McpConfig>) -> Result<String, String> {
    let mut all_llm_tools = Vec::new();

    for config in configs {
        if !config.enabled { continue; }

        let mut cmd = AsyncCommand::new(&config.command);
        cmd.args(&config.args);
        
        // 👈 核心：把前端配置的环境变量，强行注入给 Node.js 进程
        if let Some(env_map) = &config.env {
            cmd.envs(env_map); 
        }

        let mut child = match cmd
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn() {
                Ok(c) => c,
                Err(_) => continue,
            };

        let mut stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let mut reader = BufReader::new(stdout);

        let init_req = json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": { "name": "Yuki", "version": "1.0" } } });
        stdin.write_all(format!("{}\n", init_req).as_bytes()).await.ok();
        let mut line = String::new();
        reader.read_line(&mut line).await.ok();
        
        let notif = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        stdin.write_all(format!("{}\n", notif).as_bytes()).await.ok();

        let tools_req = json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" });
        stdin.write_all(format!("{}\n", tools_req).as_bytes()).await.ok();

        let mut tools_line = String::new();
        reader.read_line(&mut tools_line).await.ok();

        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&tools_line) {
            if let Some(tools) = parsed["result"]["tools"].as_array() {
                for tool in tools {
                    all_llm_tools.push(json!({
                        "type": "function",
                        "function": {
                            "name": tool["name"],
                            "description": tool["description"],
                            "parameters": tool["inputSchema"]
                        },
                        "mcp_server_name": config.name.clone()
                    }));
                }
            }
        }
        let _ = child.kill().await;
    }

    Ok(serde_json::to_string(&all_llm_tools).unwrap())
}

// 🌟 3. 动态调度执行 MCP 技能
#[tauri::command]
async fn execute_mcp_tool(tool_name: String, tool_args: String, configs: Vec<McpConfig>) -> Result<String, String> {
    println!("⚙️ 准备执行 MCP 技能: {}", tool_name);
    let args_json: serde_json::Value = serde_json::from_str(&tool_args).unwrap_or(json!({}));

    for config in configs {
        if !config.enabled { continue; }

        let mut cmd = AsyncCommand::new(&config.command);
        cmd.args(&config.args);
        
        // 👈 核心：执行时同样需要注入环境变量
        if let Some(env_map) = &config.env {
            cmd.envs(env_map); 
        }

        let mut child = match cmd
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
            .spawn() {
                Ok(c) => c,
                Err(_) => continue,
            };

        let mut stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let mut reader = BufReader::new(stdout);

        let init_req = json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": { "name": "Yuki", "version": "1.0" } } });
        stdin.write_all(format!("{}\n", init_req).as_bytes()).await.ok();
        let mut dummy = String::new();
        reader.read_line(&mut dummy).await.ok();
        
        let notif = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        stdin.write_all(format!("{}\n", notif).as_bytes()).await.ok();

        let tools_req = json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" });
        stdin.write_all(format!("{}\n", tools_req).as_bytes()).await.ok();
        let mut tools_line = String::new();
        reader.read_line(&mut tools_line).await.ok();

        let mut owns_tool = false;
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&tools_line) {
            if let Some(tools) = parsed["result"]["tools"].as_array() {
                for tool in tools {
                    if tool["name"].as_str() == Some(&tool_name) {
                        owns_tool = true;
                        break;
                    }
                }
            }
        }

        if owns_tool {
            let call_req = json!({
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": args_json
                }
            });

            stdin.write_all(format!("{}\n", call_req).as_bytes()).await.map_err(|e| e.to_string())?;

            let mut result_line = String::new();
            reader.read_line(&mut result_line).await.map_err(|e| e.to_string())?;

            let _ = child.kill().await;
            return Ok(result_line);
        }

        let _ = child.kill().await;
    }

    Err(format!("在所有已启用的插件中，都找不到名为 '{}' 的技能", tool_name))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            thread::spawn(move || {
                let device_state = DeviceState::new();
                loop {
                    let mouse = device_state.get_mouse();
                    let _ = app_handle.emit("global-mouse-move", (mouse.coords.0, mouse.coords.1));
                    thread::sleep(Duration::from_millis(32));
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        // 🌟 注册最新的三个指令
        .invoke_handler(tauri::generate_handler![
            transcribe_audio, 
            get_all_mcp_tools, 
            execute_mcp_tool
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}