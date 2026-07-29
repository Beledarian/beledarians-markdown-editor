use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::menu::Menu;
#[cfg(not(target_os = "macos"))]
use tauri::menu::MenuItem;
#[cfg(target_os = "macos")]
use tauri::menu::{MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, RunEvent, Runtime, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

/// Global flag tracking if an explicit quit request was initiated (e.g. from System Tray or Menu).
#[derive(Default)]
pub struct IsQuitting(pub AtomicBool);

impl IsQuitting {
    fn request_quit(&self) {
        self.0.store(true, Ordering::Release);
    }

    fn should_prevent_exit(&self) -> bool {
        !self.0.load(Ordering::Acquire)
    }
}

/// Files queued to be opened by a window once its frontend is ready.
/// Keyed by window label. This avoids the race where `eval`/events fire
/// before the webview has loaded and registered its listeners.
#[derive(Default)]
pub struct PendingFiles(Mutex<HashMap<String, String>>);

/// Returns (and clears) the file queued for the calling window.
/// The frontend invokes this once on mount.
#[tauri::command]
fn get_initial_file(
    window: tauri::WebviewWindow,
    state: tauri::State<'_, PendingFiles>,
) -> Option<String> {
    state.0.lock().ok()?.remove(window.label())
}

/// Picks the first argument that points to an existing file,
/// resolving relative paths against `cwd` (Explorer passes absolute
/// paths, but shells and "Open with" may not).
fn resolve_file_arg(args: &[String], cwd: Option<&Path>) -> Option<String> {
    for arg in args {
        if arg.starts_with('-') {
            continue;
        }
        let p = PathBuf::from(arg);
        let p = if p.is_relative() {
            match cwd {
                Some(c) => c.join(&p),
                None => match env::current_dir() {
                    Ok(c) => c.join(&p),
                    Err(_) => p,
                },
            }
        } else {
            p
        };
        if p.is_file() {
            // Canonical-ish normalization so tab dedup works regardless of how the path was written.
            let normalized = std::fs::canonicalize(&p).unwrap_or(p);
            let s = normalized.to_string_lossy().to_string();
            // Strip Windows extended-length prefixes that canonicalize adds.
            let s = if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
                format!(r"\\{}", rest)
            } else if let Some(rest) = s.strip_prefix(r"\\?\") {
                rest.to_string()
            } else {
                s
            };
            return Some(s);
        }
    }
    None
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpServerConfig {
    command: String,
    args: Vec<String>,
    env: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpConfig {
    #[serde(rename = "mcpServers")]
    mcp_servers: HashMap<String, McpServerConfig>,
}

#[tauri::command]
fn list_mcp_servers(config_path: String) -> Result<McpConfig, String> {
    let content = std::fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: McpConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_file_last_modified(path: String) -> Result<u64, String> {
    let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
    let modified = metadata.modified().map_err(|e| e.to_string())?;
    modified
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_markdown_file(path: String, content: String) -> Result<(), String> {
    let target = Path::new(&path);
    let is_markdown = target
        .extension()
        .and_then(|extension| extension.to_str())
        .map(|extension| {
            extension.eq_ignore_ascii_case("md")
                || extension.eq_ignore_ascii_case("markdown")
        })
        .unwrap_or(false);
    if !is_markdown {
        return Err("Only .md and .markdown files can be written".to_string());
    }

    std::fs::write(target, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn open_new_window(app: AppHandle, path: Option<String>) {
    let _ = create_new_window(&app, path);
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpSetupResult {
    pub target: String,
    pub success: bool,
    pub message: String,
}

const AUTHORING_SKILL_NAME: &str = "author-beledarians-markdown";

fn user_home_dir() -> Result<PathBuf, String> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map(PathBuf::from)
        .map_err(|_| "Could not determine the user home directory".to_string())
}

fn authoring_skill_destination(home: &Path, target: &str) -> Option<PathBuf> {
    let skills_root = match target {
        "claude" => home.join(".claude").join("skills"),
        "codex" => home.join(".agents").join("skills"),
        "antigravity" | "gemini" => home.join(".gemini").join("skills"),
        _ => return None,
    };

    Some(skills_root.join(AUTHORING_SKILL_NAME).join("SKILL.md"))
}

fn authoring_skill_source(app: &AppHandle) -> Result<PathBuf, String> {
    let bundled = app
        .path()
        .resolve(
            format!("skills/{AUTHORING_SKILL_NAME}/SKILL.md"),
            tauri::path::BaseDirectory::Resource,
        )
        .map_err(|error| format!("Could not resolve the bundled skill: {error}"))?;

    if bundled.is_file() {
        return Ok(bundled);
    }

    let development = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("skills")
        .join(AUTHORING_SKILL_NAME)
        .join("SKILL.md");
    if development.is_file() {
        return Ok(development);
    }

    Err("The bundled Markdown authoring skill is missing".to_string())
}

fn install_authoring_skill(
    source: &Path,
    home: &Path,
    target: &str,
) -> McpSetupResult {
    let result_target = format!("{target}-skill");
    let Some(destination) = authoring_skill_destination(home, target) else {
        return McpSetupResult {
            target: result_target,
            success: false,
            message: format!("Skill installation is not supported for {target}"),
        };
    };

    let source_contents = match std::fs::read(source) {
        Ok(contents) => contents,
        Err(error) => {
            return McpSetupResult {
                target: result_target,
                success: false,
                message: format!("Could not read the bundled Markdown skill: {error}"),
            };
        }
    };

    if destination.is_file() {
        match std::fs::read(&destination) {
            Ok(existing) if existing == source_contents => {
                return McpSetupResult {
                    target: result_target,
                    success: true,
                    message: format!(
                        "Markdown authoring skill is already installed for {target}"
                    ),
                };
            }
            Ok(_) => {
                return McpSetupResult {
                    target: result_target,
                    success: false,
                    message: format!(
                        "Kept the existing {target} skill because it differs from the bundled copy"
                    ),
                };
            }
            Err(error) => {
                return McpSetupResult {
                    target: result_target,
                    success: false,
                    message: format!("Could not inspect the existing {target} skill: {error}"),
                };
            }
        }
    }

    let Some(parent) = destination.parent() else {
        return McpSetupResult {
            target: result_target,
            success: false,
            message: format!("Could not resolve the {target} skill directory"),
        };
    };

    if let Err(error) = std::fs::create_dir_all(parent) {
        return McpSetupResult {
            target: result_target,
            success: false,
            message: format!("Could not create the {target} skill directory: {error}"),
        };
    }

    match std::fs::write(&destination, source_contents) {
        Ok(()) => McpSetupResult {
            target: result_target,
            success: true,
            message: format!(
                "Installed the Markdown authoring skill for {target} at {}",
                destination.display()
            ),
        },
        Err(error) => McpSetupResult {
            target: result_target,
            success: false,
            message: format!("Could not install the {target} skill: {error}"),
        },
    }
}

#[tauri::command]
async fn configure_mcp_integrations(
    app: AppHandle,
    targets: Vec<String>,
    install_skill: bool,
) -> Result<Vec<McpSetupResult>, String> {
    use std::process::Command;

    let mut results = Vec::new();
    let cli_path = std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("cli")
        .join("md.mjs");
    let cli_str = cli_path.to_string_lossy().to_string();

    for target in &targets {
        match target.as_str() {
            "claude" => {
                let status = Command::new("claude")
                    .args(["mcp", "add", "mdedit", "--", "node", &cli_str, "mcp"])
                    .status();
                match status {
                    Ok(s) if s.success() => results.push(McpSetupResult {
                        target: "claude".to_string(),
                        success: true,
                        message: "Registered mdedit MCP server in Claude Code".to_string(),
                    }),
                    _ => results.push(McpSetupResult {
                        target: "claude".to_string(),
                        success: false,
                        message: "Failed to run 'claude mcp add' (ensure Claude Code CLI is in PATH)".to_string(),
                    }),
                }
            }
            "codex" => {
                let status = Command::new("codex")
                    .args(["mcp", "add", "mdedit", "--", "node", &cli_str, "mcp"])
                    .status();
                match status {
                    Ok(s) if s.success() => results.push(McpSetupResult {
                        target: "codex".to_string(),
                        success: true,
                        message: "Registered mdedit MCP server in Codex".to_string(),
                    }),
                    _ => results.push(McpSetupResult {
                        target: "codex".to_string(),
                        success: false,
                        message: "Failed to run 'codex mcp add' (ensure Codex CLI is in PATH)".to_string(),
                    }),
                }
            }
            "antigravity" | "gemini" => {
                let home = std::env::var("USERPROFILE")
                    .or_else(|_| std::env::var("HOME"))
                    .map(PathBuf::from)
                    .unwrap_or_else(|_| PathBuf::from("."));
                let config_dir = home.join(".gemini").join("antigravity");
                let _ = std::fs::create_dir_all(&config_dir);
                let config_file = config_dir.join("mcp_config.json");

                let mut config: serde_json::Value = if config_file.exists() {
                    let content = std::fs::read_to_string(&config_file).unwrap_or_default();
                    serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({ "mcpServers": {} }))
                } else {
                    serde_json::json!({ "mcpServers": {} })
                };

                if let Some(obj) = config.as_object_mut() {
                    let servers = obj.entry("mcpServers").or_insert_with(|| serde_json::json!({}));
                    if let Some(servers_obj) = servers.as_object_mut() {
                        servers_obj.insert("mdedit".to_string(), serde_json::json!({
                            "command": "node",
                            "args": [cli_str.clone(), "mcp"]
                        }));
                    }
                }

                match std::fs::write(&config_file, serde_json::to_string_pretty(&config).unwrap()) {
                    Ok(_) => results.push(McpSetupResult {
                        target: "antigravity".to_string(),
                        success: true,
                        message: format!("Updated Antigravity/Gemini config at {}", config_file.display()),
                    }),
                    Err(e) => results.push(McpSetupResult {
                        target: "antigravity".to_string(),
                        success: false,
                        message: format!("Failed writing Antigravity config: {}", e),
                    }),
                }
            }
            _ => {}
        }
    }

    if install_skill {
        let source = authoring_skill_source(&app)?;
        let home = user_home_dir()?;
        for target in &targets {
            results.push(install_authoring_skill(&source, &home, target));
        }
    }

    Ok(results)
}

// ===== Agent Tool Backend Commands =====

#[derive(Debug, Serialize, Clone)]
pub struct GrepResult {
    file: String,
    line: usize,
    content: String,
}

#[tauri::command]
async fn grep_files(
    query: String,
    search_path: String,
    case_sensitive: bool,
    max_results: usize,
) -> Result<Vec<GrepResult>, String> {
    use std::fs;
    use std::path::Path;

    let mut results = Vec::new();
    let max = if max_results == 0 { 50 } else { max_results };

    fn scan_dir(
        dir: &Path,
        query: &str,
        case_sensitive: bool,
        results: &mut Vec<GrepResult>,
        max: usize,
        depth: usize,
    ) {
        if depth > 6 || results.len() >= max {
            return;
        }

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                if results.len() >= max {
                    return;
                }

                let path = entry.path();
                let name = path.file_name().unwrap_or_default().to_string_lossy();

                // Skip hidden dirs and common excluded dirs
                if name.starts_with('.')
                    || name == "node_modules"
                    || name == "target"
                    || name == "dist"
                    || name == "build"
                {
                    continue;
                }

                if path.is_dir() {
                    scan_dir(&path, query, case_sensitive, results, max, depth + 1);
                } else if path.is_file() {
                    // Skip binary files
                    let ext = path.extension().unwrap_or_default().to_string_lossy();
                    if [
                        "png", "jpg", "jpeg", "gif", "ico", "exe", "dll", "bin", "wasm", "pdf",
                    ]
                    .contains(&ext.as_ref())
                    {
                        continue;
                    }

                    if let Ok(content) = fs::read_to_string(&path) {
                        let (search_content, search_query) = if case_sensitive {
                            (content.clone(), query.to_string())
                        } else {
                            (content.to_lowercase(), query.to_lowercase())
                        };

                        if search_content.contains(&search_query) {
                            for (idx, line) in content.lines().enumerate() {
                                if results.len() >= max {
                                    return;
                                }

                                let line_to_check = if case_sensitive {
                                    line.to_string()
                                } else {
                                    line.to_lowercase()
                                };
                                if line_to_check.contains(&search_query) {
                                    results.push(GrepResult {
                                        file: path.to_string_lossy().to_string(),
                                        line: idx + 1,
                                        content: line.trim().to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let path = Path::new(&search_path);
    if !path.exists() {
        return Err(format!("Path not found: {}", search_path));
    }

    scan_dir(path, &query, case_sensitive, &mut results, max, 0);
    Ok(results)
}

#[tauri::command]
async fn find_files(pattern: String, search_path: String) -> Result<Vec<String>, String> {
    use std::fs;
    use std::path::Path;

    let mut results = Vec::new();
    let pattern_lower = pattern.to_lowercase();

    fn scan_dir(dir: &Path, pattern: &str, results: &mut Vec<String>, depth: usize) {
        if depth > 6 || results.len() >= 100 {
            return;
        }

        if let Ok(entries) = fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_name().unwrap_or_default().to_string_lossy();

                if name.starts_with('.')
                    || name == "node_modules"
                    || name == "target"
                    || name == "dist"
                {
                    continue;
                }

                if path.is_dir() {
                    scan_dir(&path, pattern, results, depth + 1);
                } else if path.is_file() {
                    let name_lower = name.to_lowercase();
                    // Check for glob-like patterns
                    let matches = if pattern.starts_with('*') {
                        name_lower.ends_with(&pattern[1..])
                    } else if pattern.ends_with('*') {
                        name_lower.starts_with(&pattern[..pattern.len() - 1])
                    } else {
                        name_lower.contains(pattern)
                    };

                    if matches && results.len() < 100 {
                        results.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    let path = Path::new(&search_path);
    if !path.exists() {
        return Err(format!("Path not found: {}", search_path));
    }

    scan_dir(path, &pattern_lower, &mut results, 0);
    Ok(results)
}

#[derive(Debug, Serialize)]
pub struct WebSearchResult {
    #[serde(rename = "type")]
    result_type: String,
    title: Option<String>,
    content: String,
    url: Option<String>,
    source: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct WebSearchResponse {
    query: String,
    results: Vec<WebSearchResult>,
    result_count: usize,
}

#[tauri::command]
async fn search_web(query: String) -> Result<WebSearchResponse, String> {
    let url = format!(
        "https://api.duckduckgo.com/?q={}&format=json&no_html=1&skip_disambig=1",
        urlencoding::encode(&query)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;

    let mut results = Vec::new();

    // Abstract
    if let Some(abstract_text) = data["Abstract"].as_str() {
        if !abstract_text.is_empty() {
            results.push(WebSearchResult {
                result_type: "abstract".to_string(),
                title: data["Heading"].as_str().map(|s| s.to_string()),
                content: abstract_text.to_string(),
                url: data["AbstractURL"].as_str().map(|s| s.to_string()),
                source: data["AbstractSource"].as_str().map(|s| s.to_string()),
            });
        }
    }

    // Answer
    if let Some(answer) = data["Answer"].as_str() {
        if !answer.is_empty() {
            results.push(WebSearchResult {
                result_type: "answer".to_string(),
                title: None,
                content: answer.to_string(),
                url: None,
                source: data["AnswerType"].as_str().map(|s| s.to_string()),
            });
        }
    }

    // Related topics
    if let Some(topics) = data["RelatedTopics"].as_array() {
        for topic in topics.iter().take(5) {
            if let Some(text) = topic["Text"].as_str() {
                results.push(WebSearchResult {
                    result_type: "related".to_string(),
                    title: None,
                    content: text.to_string(),
                    url: topic["FirstURL"].as_str().map(|s| s.to_string()),
                    source: None,
                });
            }
        }
    }

    let count = results.len();
    Ok(WebSearchResponse {
        query,
        results,
        result_count: count,
    })
}

#[derive(Debug, Serialize)]
pub struct FetchUrlResponse {
    title: Option<String>,
    content: String,
    content_length: usize,
    truncated: bool,
}

#[tauri::command]
async fn fetch_url(url: String, max_length: usize) -> Result<FetchUrlResponse, String> {
    let max = if max_length == 0 { 50000 } else { max_length };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .get(&url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let html = res.text().await.map_err(|e| e.to_string())?;

    let title = if let Some(start) = html.find("<title>") {
        if let Some(end) = html[start..].find("</title>") {
            Some(html[start + 7..start + end].trim().to_string())
        } else {
            None
        }
    } else {
        None
    };

    let mut content = String::with_capacity(max);
    let mut in_tag = false;
    let mut in_script_or_style = false;
    let mut tag_buffer = String::with_capacity(10);
    let mut entity_buffer = String::with_capacity(10);
    let mut in_entity = false;
    let mut last_char_was_whitespace = true; // To collapse whitespace

    for c in html.chars() {
        if content.len() >= max {
            break;
        }

        if in_entity {
            if c.is_alphanumeric() && entity_buffer.len() < 10 {
                entity_buffer.push(c);
                continue;
            } else {
                if c == ';' {
                    let entity = match entity_buffer.as_str() {
                        "nbsp" => " ",
                        "lt" => "<",
                        "gt" => ">",
                        "amp" => "&",
                        "quot" => "\"",
                        _ => "",
                    };
                    if !entity.is_empty() {
                        if entity == " " {
                            if !last_char_was_whitespace {
                                content.push(' ');
                                last_char_was_whitespace = true;
                            }
                        } else {
                            content.push_str(entity);
                            last_char_was_whitespace = false;
                        }
                    }
                }
                in_entity = false;
                // fallthrough to process current char `c` if it wasn't the semicolon
                if c == ';' {
                    continue;
                }
            }
        }

        if c == '<' {
            in_tag = true;
            tag_buffer.clear();
        } else if c == '>' {
            in_tag = false;
            let tag_name = tag_buffer.to_lowercase();
            if tag_name.starts_with("script") || tag_name.starts_with("style") {
                in_script_or_style = true;
            } else if tag_name.starts_with("/script") || tag_name.starts_with("/style") {
                in_script_or_style = false;
            }
        } else if in_tag {
            if !c.is_whitespace() && c != '/' && tag_buffer.len() < 10 {
                tag_buffer.push(c);
            }
        } else if c == '&' {
            in_entity = true;
            entity_buffer.clear();
        } else if !in_script_or_style {
            if c.is_whitespace() {
                if !last_char_was_whitespace {
                    content.push(' ');
                    last_char_was_whitespace = true;
                }
            } else {
                content.push(c);
                last_char_was_whitespace = false;
            }
        }
    }

    let truncated = content.len() >= max;
    content.truncate(max); // Final trim to max length

    let trimmed_content = content.trim();
    Ok(FetchUrlResponse {
        title,
        content: trimmed_content.to_string(),
        content_length: trimmed_content.len(),
        truncated,
    })
}

// ===== CLI Control Server =====

const CLI_SERVER_PORT: u16 = 51234;

/// Validates that the HTTP request contains an exact `Host` header matching `127.0.0.1` or `localhost` (with optional expected port).
///
/// # Security & Residual Risk Note
/// Exact Host header validation protects against browser-based Cross-Origin Request / DNS rebinding / CSRF attacks.
/// Residual local-process trust: No cross-process authentication token is implemented because the CLI client is owned
/// and invoked separately without pre-shared secrets. Consequently, any local process running under any local user account
/// with access to TCP networking can send HTTP requests to 127.0.0.1:51234 to control the editor.
fn validate_host_header(raw_request: &str, expected_port: u16) -> bool {
    let headers_part = if let Some(pos) = raw_request.find("\r\n\r\n") {
        &raw_request[..pos]
    } else if let Some(pos) = raw_request.find("\n\n") {
        &raw_request[..pos]
    } else {
        raw_request
    };

    let expected_port_str = expected_port.to_string();

    for line in headers_part.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line.len() >= 5 && line[..5].eq_ignore_ascii_case("host:") {
            let val = line[5..].trim().to_ascii_lowercase();
            return val == "127.0.0.1"
                || val == "localhost"
                || val == format!("127.0.0.1:{}", expected_port_str)
                || val == format!("localhost:{}", expected_port_str);
        }
    }

    false
}

/// Validates that if an `Origin` or `Referer` header is sent by a browser, it originates strictly from a trusted local context.
/// Web browsers automatically send `Origin` / `Referer` on cross-origin requests. Rejecting unauthorized origins prevents web-based CSRF.
fn validate_origin_header(raw_request: &str, expected_port: u16) -> bool {
    let headers_part = if let Some(pos) = raw_request.find("\r\n\r\n") {
        &raw_request[..pos]
    } else if let Some(pos) = raw_request.find("\n\n") {
        &raw_request[..pos]
    } else {
        raw_request
    };

    let port_str = expected_port.to_string();

    let is_allowed = |val: &str| {
        let clean = val.trim().to_ascii_lowercase();
        let origin_part = if let Some(idx) = clean.find("://") {
            let rest = &clean[idx + 3..];
            if let Some(path_idx) = rest.find('/') {
                &clean[..idx + 3 + path_idx]
            } else {
                clean.as_str()
            }
        } else {
            clean.as_str()
        };

        if origin_part == "http://127.0.0.1"
            || origin_part == "http://localhost"
            || origin_part == format!("http://127.0.0.1:{}", port_str)
            || origin_part == format!("http://localhost:{}", port_str)
            || origin_part == "https://tauri.localhost"
            || origin_part == "tauri://localhost"
        {
            return true;
        }
        if origin_part.starts_with("vscode-webview://") {
            return true;
        }
        if let Some(rest) = origin_part.strip_prefix("http://127.0.0.1:") {
            return !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit());
        }
        if let Some(rest) = origin_part.strip_prefix("http://localhost:") {
            return !rest.is_empty() && rest.chars().all(|c| c.is_ascii_digit());
        }
        false
    };

    for line in headers_part.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if line.len() >= 7 && line[..7].eq_ignore_ascii_case("origin:") {
            let val = line[7..].trim();
            if !is_allowed(val) {
                return false;
            }
        }
        if line.len() >= 8 && line[..8].eq_ignore_ascii_case("referer:") {
            let val = line[8..].trim();
            if !is_allowed(val) {
                return false;
            }
        }
    }

    true
}

/// Starts a background thread that listens for CLI commands on localhost:51234.
/// Accepts simple HTTP POST / with a JSON body:
///   {"cmd":"open",  "path":"C:/..."}
///   {"cmd":"new",   "name":"draft.md"}
///   {"cmd":"status"}
///   {"cmd":"pdf",   "path":"C:/..."}
fn start_cli_server<R: Runtime + 'static>(app: AppHandle<R>) {
    std::thread::spawn(move || {
        use std::io::{Read, Write};
        let addr = format!("127.0.0.1:{}", CLI_SERVER_PORT);
        let listener = match std::net::TcpListener::bind(&addr) {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[md-cli] Failed to bind control server: {}", e);
                return;
            }
        };
        println!("[md-cli] Control server listening on {}", addr);

        for stream_result in listener.incoming() {
            let mut stream = match stream_result {
                Ok(s) => s,
                Err(_) => continue,
            };
            let _ = stream.set_read_timeout(Some(std::time::Duration::from_secs(2)));

            let mut buf = vec![0u8; 8192];
            let n = match stream.read(&mut buf) {
                Ok(n) => n,
                Err(_) => {
                    let _ =
                        stream.write_all(b"HTTP/1.1 400 Bad Request\r\nContent-Length: 0\r\n\r\n");
                    continue;
                }
            };

            let raw = String::from_utf8_lossy(&buf[..n]);

            // Validate Host and Origin/Referer headers for local CSRF protection
            if !validate_host_header(&raw, CLI_SERVER_PORT) || !validate_origin_header(&raw, CLI_SERVER_PORT) {
                let err = r#"{"ok":false,"error":"Forbidden - Host/Origin must be local"}"#;
                let resp = format!("HTTP/1.1 403 Forbidden\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", err.len(), err);
                let _ = stream.write_all(resp.as_bytes());
                continue;
            }

            // Find the JSON body after the blank line separator
            let body_str = if let Some(pos) = raw.find("\r\n\r\n") {
                raw[pos + 4..].trim().to_string()
            } else if let Some(pos) = raw.find("\n\n") {
                raw[pos + 2..].trim().to_string()
            } else {
                // Treat entire request as JSON if no headers (plain TCP use)
                raw.trim().to_string()
            };

            // Special-case: GET /status from CLI
            if raw.starts_with("GET") && raw.contains("/status") {
                let resp_body = r#"{"ok":true,"status":"running"}"#;
                let resp = format!("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", resp_body.len(), resp_body);
                let _ = stream.write_all(resp.as_bytes());
                continue;
            }

            let cmd_val: serde_json::Value = match serde_json::from_str(&body_str) {
                Ok(v) => v,
                Err(_) => {
                    let err = r#"{"ok":false,"error":"invalid JSON"}"#;
                    let resp = format!("HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", err.len(), err);
                    let _ = stream.write_all(resp.as_bytes());
                    continue;
                }
            };

            let cmd_name = cmd_val["cmd"].as_str().unwrap_or("").to_string();
            let emit_result = match cmd_name.as_str() {
                "open" | "pdf" | "new" | "status" => {
                    let windows = app.webview_windows();
                    let target_win = windows
                        .values()
                        .find(|w| w.is_focused().unwrap_or(false))
                        .or_else(|| windows.values().next());

                    if let Some(win) = target_win {
                        let _ = win.unminimize();
                        let _ = win.set_focus();
                        app.emit_to(win.label(), "cli-command", &cmd_val)
                    } else {
                        // No windows open: create a new window
                        let _ = create_new_window(&app, None);
                        app.emit("cli-command", &cmd_val)
                    }
                }
                _ => {
                    let err = format!(
                        "{{\"ok\":false,\"error\":\"unknown command: {}\"}}",
                        cmd_name
                    );
                    let resp = format!("HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}", err.len(), err);
                    let _ = stream.write_all(resp.as_bytes());
                    continue;
                }
            };

            let resp_body = if emit_result.is_ok() {
                format!("{{\"ok\":true,\"cmd\":\"{}\"}}", cmd_name)
            } else {
                "{\"ok\":false,\"error\":\"emit failed\"}".to_string()
            };
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\n\r\n{}",
                resp_body.len(),
                resp_body
            );
            let _ = stream.write_all(resp.as_bytes());
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(not(feature = "cua-verifier"))]
    let builder = builder
        // single-instance must be the first plugin so it runs before anything else
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            // argv: [exe_path, possibly flags, file_path?]
            let file_path = resolve_file_arg(argv.get(1..).unwrap_or(&[]), Some(Path::new(&cwd)));

            let windows = app.webview_windows();
            // Prefer the focused window, fall back to any open one.
            let target = windows
                .values()
                .find(|w| w.is_focused().unwrap_or(false))
                .or_else(|| windows.values().next())
                .cloned();

            match (target, file_path) {
                (Some(win), Some(path)) => {
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                    // Open as a new tab in the existing window.
                    let _ = app.emit_to(win.label(), "open-file", path);
                }
                (Some(win), None) => {
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
                (None, path) => {
                    // No windows open (e.g. all closed): create one.
                    let _ = create_new_window(app, path);
                }
            }
        }));

    builder
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .manage(IsQuitting::default())
        .manage(PendingFiles::default())
        .invoke_handler(tauri::generate_handler![
            read_file,
            get_file_last_modified,
            write_markdown_file,
            open_new_window,
            list_mcp_servers,
            get_initial_file,
            configure_mcp_integrations,
            // Agent tool commands
            grep_files,
            find_files,
            search_web,
            fetch_url
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            // Start the CLI control server on port 51234
            start_cli_server(app.handle().clone());

            // Check CLI args for an initial file (launch via Explorer / "Open with").
            // Queue it in PendingFiles instead of eval'ing into the webview:
            // at this point the frontend hasn't loaded yet, so an eval'd event
            // would be lost. The frontend invokes `get_initial_file` on mount.
            let args: Vec<String> = std::env::args().collect();
            if let Some(path) = resolve_file_arg(args.get(1..).unwrap_or(&[]), None) {
                if let Ok(mut pending) = app.state::<PendingFiles>().0.lock() {
                    pending.insert("main".to_string(), path);
                }
            }

            let handle = app.handle();
            #[cfg(target_os = "macos")]
            {
                let file_menu = Submenu::with_items(
                    handle,
                    "File",
                    true,
                    &[
                        &MenuItem::with_id(handle, "new", "New", true, Some("CmdOrControl+N"))?,
                        &MenuItem::with_id(
                            handle,
                            "open",
                            "Open...",
                            true,
                            Some("CmdOrControl+O"),
                        )?,
                        &MenuItem::with_id(handle, "save", "Save", true, Some("CmdOrControl+S"))?,
                        &PredefinedMenuItem::close_window(handle, Some("Close"))?,
                    ],
                )?;
                let edit_menu = Submenu::with_items(
                    handle,
                    "Edit",
                    true,
                    &[
                        &PredefinedMenuItem::undo(handle, None)?,
                        &PredefinedMenuItem::redo(handle, None)?,
                        &PredefinedMenuItem::separator(handle)?,
                        &PredefinedMenuItem::cut(handle, None)?,
                        &PredefinedMenuItem::copy(handle, None)?,
                        &PredefinedMenuItem::paste(handle, None)?,
                        &PredefinedMenuItem::select_all(handle, None)?,
                    ],
                )?;
                let view_menu = Submenu::with_items(
                    handle,
                    "View",
                    true,
                    &[&PredefinedMenuItem::fullscreen(handle, None)?],
                )?;
                let window_menu = Submenu::with_items(
                    handle,
                    "Window",
                    true,
                    &[
                        &PredefinedMenuItem::minimize(handle, None)?,
                        &PredefinedMenuItem::hide(handle, None)?,
                        &PredefinedMenuItem::hide_others(handle, None)?,
                        &PredefinedMenuItem::show_all(handle, None)?,
                    ],
                )?;
                let help_menu = Submenu::with_items(
                    handle,
                    "Help",
                    true,
                    &[&MenuItem::with_id(
                        handle,
                        "settings",
                        "Settings",
                        true,
                        Some("CmdOrControl+,"),
                    )?],
                )?;
                let app_menu = Submenu::with_items(
                    handle,
                    "Beledarians Markdown Editor",
                    true,
                    &[
                        &MenuItem::with_id(handle, "about", "About", true, None::<&str>)?,
                        &PredefinedMenuItem::separator(handle)?,
                        &PredefinedMenuItem::quit(handle, None)?,
                    ],
                )?;
                let menu = Menu::with_items(
                    handle,
                    &[
                        &app_menu,
                        &file_menu,
                        &edit_menu,
                        &view_menu,
                        &window_menu,
                        &help_menu,
                    ],
                )?;
                app.set_menu(menu)?;
            }

            let open_i =
                MenuItem::with_id(handle, "open_editor", "Open Editor", true, None::<&str>)?;
            let autostart_i =
                MenuItem::with_id(handle, "autostart", "Autostart on Boot", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(handle, "quit", "Quit", true, None::<&str>)?;
            let tray_menu = Menu::with_items(handle, &[&open_i, &autostart_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&tray_menu)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(
                    |app, event: tauri::menu::MenuEvent| match event.id().as_ref() {
                        "open_editor" => {
                            let _ = create_new_window(app, None);
                        }
                        "autostart" => {
                            let autostart_manager = app.autolaunch();
                            if let Ok(enabled) = autostart_manager.is_enabled() {
                                if enabled {
                                    let _ = autostart_manager.disable();
                                } else {
                                    let _ = autostart_manager.enable();
                                }
                            }
                        }
                        "quit" => {
                            app.state::<IsQuitting>().request_quit();
                            app.exit(0);
                        }
                        _ => {}
                    },
                )
                .on_tray_icon_event(|tray, event: tauri::tray::TrayIconEvent| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        let _ = create_new_window(app, None);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            RunEvent::ExitRequested { api, .. } => {
                if app_handle.state::<IsQuitting>().should_prevent_exit() {
                    api.prevent_exit();
                }
            }
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            RunEvent::Opened { urls } => {
                for url in urls {
                    let path = url
                        .to_file_path()
                        .ok()
                        .map(|p| p.to_string_lossy().to_string());
                    let _ = create_new_window(app_handle, path);
                }
            }
            _ => {}
        });
}

fn create_new_window<R: Runtime>(
    app: &AppHandle<R>,
    file_path: Option<String>,
) -> tauri::Result<()> {
    // Unique label for new windows
    let label = if app.webview_windows().is_empty() {
        "main".to_string()
    } else {
        format!(
            "win-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        )
    };

    // Queue the file BEFORE building the window so it's ready whenever the
    // frontend mounts and calls `get_initial_file` (no eval race).
    if let Some(path) = file_path {
        if let Ok(mut pending) = app.state::<PendingFiles>().0.lock() {
            pending.insert(label.clone(), path);
        }
    }

    let win = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title("Beledarians Markdown Editor")
        .inner_size(1200.0, 800.0)
        .build()?;
    let _ = win.set_focus();

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn explicit_quit_allows_exit_while_ordinary_exit_is_prevented() {
        let is_quitting = IsQuitting::default();

        assert!(is_quitting.should_prevent_exit());

        is_quitting.request_quit();

        assert!(!is_quitting.should_prevent_exit());
    }

    #[test]
    fn authoring_skill_uses_each_agents_supported_user_directory() {
        let home = Path::new("home");

        assert_eq!(
            authoring_skill_destination(home, "codex"),
            Some(
                home.join(".agents")
                    .join("skills")
                    .join(AUTHORING_SKILL_NAME)
                    .join("SKILL.md")
            )
        );
        assert_eq!(
            authoring_skill_destination(home, "claude"),
            Some(
                home.join(".claude")
                    .join("skills")
                    .join(AUTHORING_SKILL_NAME)
                    .join("SKILL.md")
            )
        );
        assert_eq!(
            authoring_skill_destination(home, "antigravity"),
            Some(
                home.join(".gemini")
                    .join("skills")
                    .join(AUTHORING_SKILL_NAME)
                    .join("SKILL.md")
            )
        );
        assert_eq!(authoring_skill_destination(home, "unknown"), None);
    }

    #[test]
    fn markdown_writer_rejects_other_file_types() {
        let result = write_markdown_file("notes.txt".to_string(), "content".to_string());
        assert_eq!(
            result,
            Err("Only .md and .markdown files can be written".to_string())
        );
    }

    #[test]
    fn test_validate_host_header_valid() {
        assert!(validate_host_header(
            "POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\n\r\n{}",
            51234
        ));
        assert!(validate_host_header(
            "POST / HTTP/1.1\r\nHost: localhost:51234\r\n\r\n{}",
            51234
        ));
        assert!(validate_host_header(
            "GET /status HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n",
            51234
        ));
        assert!(validate_host_header(
            "GET /status HTTP/1.1\r\nHost: localhost\r\n\r\n",
            51234
        ));
        assert!(validate_host_header(
            "POST / HTTP/1.1\r\nhost: LOCALHOST:51234\r\n\r\n{}",
            51234
        ));
    }

    #[test]
    fn test_validate_host_header_invalid() {
        assert!(!validate_host_header(
            "POST / HTTP/1.1\r\nHost: attacker.com\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header(
            "POST / HTTP/1.1\r\nHost: 127.0.0.1.attacker.com\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header(
            "POST / HTTP/1.1\r\nHost: 127.0.0.1:8080\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header(
            "POST / HTTP/1.1\r\nHost: localhost:8080\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header(
            "POST /?Host:127.0.0.1:51234 HTTP/1.1\r\nHost: evil.com\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header(
            "POST / HTTP/1.1\r\nX-Custom: Host: 127.0.0.1:51234\r\n\r\n{}",
            51234
        ));
        assert!(!validate_host_header("POST / HTTP/1.1\r\n\r\n{}", 51234));
    }

    #[test]
    fn test_validate_origin_header() {
        assert!(validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: http://localhost:5173\r\n\r\n{}", 51234));
        assert!(validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: http://127.0.0.1:5173\r\n\r\n{}", 51234));
        assert!(validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: tauri://localhost\r\n\r\n{}", 51234));
        assert!(validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nReferer: http://localhost:5173/editor\r\n\r\n{}", 51234));
        
        // Block untrusted external origins & subdomain spoofing attempts
        assert!(!validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: http://attacker.com\r\n\r\n{}", 51234));
        assert!(!validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: http://127.0.0.1.attacker.com\r\n\r\n{}", 51234));
        assert!(!validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nOrigin: http://localhost.attacker.com\r\n\r\n{}", 51234));
        assert!(!validate_origin_header("POST / HTTP/1.1\r\nHost: 127.0.0.1:51234\r\nReferer: https://malicious-site.org/phish\r\n\r\n{}", 51234));
    }
}
