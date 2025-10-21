# Install dependencies and setup the project

Write-Host "Fidelidade Pet Tracker - Setup Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""

# Create .env file if it doesn't exist
if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host ".env file created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Edit .env file with your Trackimo API credentials" -ForegroundColor Yellow
    Write-Host "The default credentials are already configured." -ForegroundColor Gray
} else {
    Write-Host ".env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Review .env file (already configured with Trackimo credentials)" -ForegroundColor White
Write-Host "  2. Run: npm run dev" -ForegroundColor White
Write-Host "  3. Open: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Documentation: README.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to start dev server
$response = Read-Host "Would you like to start the development server now? (Y/n)"
if ($response -eq "" -or $response -eq "Y" -or $response -eq "y") {
    Write-Host ""
    Write-Host "Starting development server..." -ForegroundColor Green
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Run npm run dev when you are ready to start!" -ForegroundColor Cyan
}
