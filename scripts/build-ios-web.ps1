# Build web assets for iOS (relative paths, VITE_IOS_SHELL=1) and copy to ios/Web/
$ErrorActionPreference = "Stop"
Push-Location (Split-Path $PSScriptRoot)

Write-Host "Building iOS web assets..."
npm run build:ios:web

Write-Host "Copying dist-ios/ → ios/Web/"
if (Test-Path "ios/Web") { Remove-Item "ios/Web" -Recurse -Force }
New-Item -ItemType Directory -Path "ios/Web" -Force | Out-Null
Copy-Item -Path "dist-ios\*" -Destination "ios\Web" -Recurse -Force

Write-Host "✓ ios/Web/ ready for XcodeGen"
Pop-Location
