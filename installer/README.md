# Windows Context Menu Installer

This folder contains files to add "Markdown Document" to the Windows Explorer right-click **New** menu.

## Quick Install

### Option 1: Registry File (Manual)

1. Double-click `add-markdown-new-menu.reg`
2. Click "Yes" when prompted to allow changes
3. Click "OK" to confirm

To uninstall, double-click `remove-markdown-new-menu.reg`.

### Option 2: PowerShell Script (Automated)

1. Open PowerShell **as Administrator**
2. Navigate to this folder
3. Run:
   ```powershell
   .\Install-MarkdownNewMenu.ps1
   ```

To uninstall:
```powershell
.\Install-MarkdownNewMenu.ps1 -Uninstall
```

## Result

After installation, you can right-click in any folder and select:

**New → Markdown Document**

This will create a new empty `.md` file that you can rename and edit.

## Customization

### Custom Icon

To use a custom icon for `.md` files, modify the `DefaultIcon` path in the registry:

```
HKEY_CLASSES_ROOT\Markdown.Document\DefaultIcon
```

Change the value from `%SystemRoot%\System32\notepad.exe,0` to your custom icon path, e.g.:
```
C:\Path\To\Your\markdown-icon.ico
```

### Associate with Markdown Editor

To open `.md` files directly with this Markdown Editor app, modify the shell open command after the app is installed.

## For Developers

These files can be included in an installer (Inno Setup, NSIS, WiX, etc.) to automatically add this functionality during installation.

### Inno Setup Example

```inno
[Registry]
Root: HKCR; Subkey: ".md"; ValueType: string; ValueData: "Markdown.Document"; Flags: uninsdeletevalue
Root: HKCR; Subkey: ".md"; ValueName: "Content Type"; ValueType: string; ValueData: "text/markdown"
Root: HKCR; Subkey: ".md\ShellNew"; ValueName: "NullFile"; ValueType: string; ValueData: ""
Root: HKCR; Subkey: "Markdown.Document"; ValueType: string; ValueData: "Markdown Document"; Flags: uninsdeletekey
Root: HKCR; Subkey: "Markdown.Document\DefaultIcon"; ValueType: string; ValueData: "{app}\icon.ico"
```
