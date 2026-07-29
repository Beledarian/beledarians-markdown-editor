#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Adds "Markdown Document (.md)" to Windows Explorer's "New" context menu.

.DESCRIPTION
    This script modifies the Windows Registry to add a "Markdown Document" option
    to the right-click > New menu in Windows Explorer. After running this script,
    you can create new .md files directly from the context menu.

.NOTES
    Requires Administrator privileges to modify HKEY_CLASSES_ROOT.
    
.EXAMPLE
    .\Install-MarkdownNewMenu.ps1
#>

param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

function Install-MarkdownNewMenu {
    Write-Host "Installing Markdown Document to New menu..." -ForegroundColor Cyan
    
    # Create .md extension key
    $mdKeyPath = "Registry::HKEY_CLASSES_ROOT\.md"
    if (-not (Test-Path $mdKeyPath)) {
        New-Item -Path $mdKeyPath -Force | Out-Null
    }
    Set-ItemProperty -Path $mdKeyPath -Name "(Default)" -Value "Markdown.Document"
    Set-ItemProperty -Path $mdKeyPath -Name "Content Type" -Value "text/markdown"
    Set-ItemProperty -Path $mdKeyPath -Name "PerceivedType" -Value "text"
    
    # Create Markdown.Document class
    $docKeyPath = "Registry::HKEY_CLASSES_ROOT\Markdown.Document"
    if (-not (Test-Path $docKeyPath)) {
        New-Item -Path $docKeyPath -Force | Out-Null
    }
    Set-ItemProperty -Path $docKeyPath -Name "(Default)" -Value "Markdown Document"
    
    # Set default icon
    $iconKeyPath = "$docKeyPath\DefaultIcon"
    if (-not (Test-Path $iconKeyPath)) {
        New-Item -Path $iconKeyPath -Force | Out-Null
    }
    Set-ItemProperty -Path $iconKeyPath -Name "(Default)" -Value "%SystemRoot%\System32\notepad.exe,0"
    
    # Create ShellNew key for "New" menu
    $shellNewPath = "$mdKeyPath\ShellNew"
    if (-not (Test-Path $shellNewPath)) {
        New-Item -Path $shellNewPath -Force | Out-Null
    }
    Set-ItemProperty -Path $shellNewPath -Name "NullFile" -Value ""
    
    Write-Host "✅ Successfully added 'Markdown Document' to New menu!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now right-click in Windows Explorer and select:" -ForegroundColor Yellow
    Write-Host "  New > Markdown Document" -ForegroundColor Yellow
}

function Uninstall-MarkdownNewMenu {
    Write-Host "Removing Markdown Document from New menu..." -ForegroundColor Cyan
    
    $shellNewPath = "Registry::HKEY_CLASSES_ROOT\.md\ShellNew"
    if (Test-Path $shellNewPath) {
        Remove-Item -Path $shellNewPath -Force
        Write-Host "✅ Successfully removed 'Markdown Document' from New menu!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ ShellNew key not found. Nothing to remove." -ForegroundColor Yellow
    }
}

# Main execution
try {
    if ($Uninstall) {
        Uninstall-MarkdownNewMenu
    } else {
        Install-MarkdownNewMenu
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure you are running this script as Administrator." -ForegroundColor Yellow
    exit 1
}
