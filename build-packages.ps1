# RioRacer Distribution Package Builder
# Creates ZIP files for itch.io and Newgrounds

Write-Host "Building RioRacer distribution packages..." -ForegroundColor Cyan

# Create dist directory
New-Item -ItemType Directory -Path "dist" -Force | Out-Null

# Files to include
$files = @(
    "index.html",
    "style.css",
    "script.js",
    "manifest.json",
    "sw.js",
    "robots.txt",
    "sitemap.xml",
    "graphics/*"
)

# Create itch.io package
Write-Host "`nCreating itch.io package..." -ForegroundColor Yellow
Compress-Archive -Path $files -DestinationPath "dist/rioracer-itchio.zip" -Force
Write-Host "✓ Created: dist/rioracer-itchio.zip" -ForegroundColor Green

# Create Newgrounds standalone HTML
Write-Host "`nCreating Newgrounds standalone..." -ForegroundColor Yellow
Copy-Item "index.html" "dist/rioracer-newgrounds.html"
Write-Host "✓ Created: dist/rioracer-newgrounds.html" -ForegroundColor Green
Write-Host "  (Note: You'll need to zip this with the graphics folder for upload)" -ForegroundColor Gray

Write-Host "`nPackages ready in ./dist/" -ForegroundColor Cyan
Write-Host "See distribution_guide.md for upload instructions." -ForegroundColor White
