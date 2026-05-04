// 隐藏 Windows 下的控制台黑框
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use device_query::{DeviceQuery, DeviceState};
use serde_json::json;
use std::fs;
use std::process::Command as StdCommand;
use std::process::Stdio;
use std::thread;
use std::time::Duration as StdDuration;
use tauri::Emitter;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command as AsyncCommand;
use tokio::time::{timeout, Duration as TokioDuration};

// ============================================================================
// 🌟 辅助宏：处理带超时的异步读取，解决 FnMut 闭包生命周期问题
// ============================================================================
macro_rules! read_line_timeout {
    ($reader:expr, $config_name:expr, $timeout_secs:expr) => {
        {
            let mut line = String::new();
            match timeout(TokioDuration::from_secs($timeout_secs), $reader.read_line(&mut line)).await {
                Ok(Ok(0)) => Err(format!("插件 [{}] 意外关闭 (EOF)", $config_name)),
                Ok(Ok(_)) => Ok(line),
                Ok(Err(e)) => Err(format!("读取插件 [{}] 输出失败: {}", $config_name, e)),
                Err(_) => Err(format!("插件 [{}] 响应超时 ({}s)", $config_name, $timeout_secs)),
            }
        }
    };
}

// ============================================================================
// 🌟 语音转文字模块 (Whisper STT)
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

    if !final_model_path.exists() { 
        return Err(format!("【文件丢失】找不到模型: {:?}", final_model_path)); 
    }

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

// ============================================================================
// 🌟 MCP 插件模块 (Model Context Protocol)
// ============================================================================

#[derive(serde::Deserialize, serde::Serialize, Clone)]
struct McpConfig {
    name: String,
    command: String,
    args: Vec<String>,
    env: Option<std::collections::HashMap<String, String>>,
    enabled: bool,
}

#[tauri::command]
async fn get_all_mcp_tools(configs: Vec<McpConfig>) -> Result<String, String> {
    let mut all_llm_tools = Vec::new();

    for config in configs {
        if !config.enabled { continue; }

        let mut cmd = AsyncCommand::new(&config.command);
        cmd.args(&config.args);
        
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

        // 简化的 initialize 握手获取工具列表
        let init_req = json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": { "name": "Yuki", "version": "1.0" } } });
        let _ = stdin.write_all(format!("{}\n", init_req).as_bytes()).await;
        let mut line = String::new();
        let _ = reader.read_line(&mut line).await;
        
        let notif = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        let _ = stdin.write_all(format!("{}\n", notif).as_bytes()).await;

        let tools_req = json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" });
        let _ = stdin.write_all(format!("{}\n", tools_req).as_bytes()).await;

        let mut tools_line = String::new();
        let _ = reader.read_line(&mut tools_line).await;

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

#[tauri::command]
async fn execute_mcp_tool(tool_name: String, tool_args: String, configs: Vec<McpConfig>) -> Result<String, String> {
    println!("⚙️ 准备执行 MCP 技能: {}", tool_name);
    
    // 参数预解析
    let args_json: serde_json::Value = serde_json::from_str(&tool_args)
        .map_err(|e| format!("参数格式错误: {}", e))?;

    for config in configs {
        if !config.enabled { continue; }

        let mut cmd = AsyncCommand::new(&config.command);
        cmd.args(&config.args);
        
        if let Some(env_map) = &config.env {
            cmd.envs(env_map); 
        }

        let mut child = cmd
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("无法启动插件进程: {}", e))?;

        let mut stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();
        
        let mut reader = BufReader::new(stdout);
        let mut err_reader = BufReader::new(stderr);

        // --- MCP 握手流程 ---
        
        // 1. Initialize
        let init_req = json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize", "params": { "protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": { "name": "Yuki", "version": "1.0" } } });
        let _ = stdin.write_all(format!("{}\n", init_req).as_bytes()).await;
        if let Err(_) = read_line_timeout!(reader, config.name, 5) {
            let _ = child.kill().await; continue; 
        }
        
        // 2. Initialized
        let notif = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        let _ = stdin.write_all(format!("{}\n", notif).as_bytes()).await;

        // 3. Tools List
        let tools_req = json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" });
        let _ = stdin.write_all(format!("{}\n", tools_req).as_bytes()).await;
        
        let tools_line = match read_line_timeout!(reader, config.name, 5) {
            Ok(l) => l,
            Err(_) => { let _ = child.kill().await; continue; }
        };

        let mut owns_tool = false;
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&tools_line) {
            if let Some(tools) = parsed["result"]["tools"].as_array() {
                owns_tool = tools.iter().any(|t| t["name"].as_str() == Some(&tool_name));
            }
        }

        // --- 执行工具调用 ---
        if owns_tool {
            let call_req = json!({
                "jsonrpc": "2.0", "id": 3, "method": "tools/call",
                "params": { "name": tool_name, "arguments": args_json }
            });

            let _ = stdin.write_all(format!("{}\n", call_req).as_bytes()).await;

            match read_line_timeout!(reader, config.name, 30) {
                Ok(result_line) => {
                    let _ = child.kill().await;
                    // 检查业务错误
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&result_line) {
                        if let Some(err) = parsed.get("error") {
                            return Err(format!("插件返回逻辑错误: {}", err));
                        }
                    }
                    return Ok(result_line);
                }
                Err(e) => {
                    // 尝试从 stderr 读取崩溃信息
                    let mut err_msg = String::new();
                    let _ = timeout(TokioDuration::from_millis(300), err_reader.read_line(&mut err_msg)).await;
                    let _ = child.kill().await;
                    return Err(format!("{}; 原始错误: {}", e, err_msg));
                }
            }
        }

        let _ = child.kill().await;
    }

    Err(format!("在启用的插件中找不到名为 '{}' 的工具", tool_name))
}

// ============================================================================
// 🌟 Tauri 应用启动
// ============================================================================

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_handle = app.handle().clone();

            // 全局鼠标位置广播任务
            thread::spawn(move || {
                let device_state = DeviceState::new();
                loop {
                    let mouse = device_state.get_mouse();
                    let _ = app_handle.emit("global-mouse-move", (mouse.coords.0, mouse.coords.1));
                    thread::sleep(StdDuration::from_millis(32));
                }
            });

            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            transcribe_audio, 
            get_all_mcp_tools, 
            execute_mcp_tool
        ])
        .run(tauri::generate_context!())
        .expect("运行 Yuki Tauri 应用时出错");
}