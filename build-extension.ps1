# Dog vs. Street - Chrome Extension Build Script
# Run this script to package the extension for distribution

Write-Host "Building Dog vs. Street Chrome Extension v1.5.0..." -ForegroundColor Cyan

# Create extension directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "extension" | Out-Null
New-Item -ItemType Directory -Force -Path "extension/icons" | Out-Null

# Copy game files
Write-Host "Copying game files..." -ForegroundColor Yellow
Copy-Item index.html extension/
Copy-Item style.css extension/
Copy-Item script.js extension/
Copy-Item -Recurse graphics extension/ -Force

# Copy icons (using game_cover as placeholder)
Write-Host "Setting up icons..." -ForegroundColor Yellow
Copy-Item graphics/game_cover.png extension/icons/icon16.png -Force
Copy-Item graphics/game_cover.png extension/icons/icon48.png -Force
Copy-Item graphics/game_cover.png extension/icons/icon128.png -Force

# Create zip file for Chrome Web Store
$version = "1.6.1"
$zipFile = "rioracer-extension-v$version.zip"

Write-Host "Creating distribution package..." -ForegroundColor Yellow

# Remove old zip if exists
if (Test-Path $zipFile) {
    Remove-Item $zipFile
}

# Create zip
Compress-Archive -Path "extension/*" -DestinationPath $zipFile -Force

Write-Host "`n✅ Extension packaged successfully!" -ForegroundColor Green
Write-Host "📦 Package: $zipFile" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Load unpacked extension from 'extension' folder to test locally" -ForegroundColor White
Write-Host "2. Upload to Chrome Web Store Developer Dashboard: $zipFile" -ForegroundColor White
