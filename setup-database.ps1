# Database Setup Script for Note-Taking App
# This script initializes the MySQL database with schema and seed data

Write-Host "Setting up Note-Taking App Database..." -ForegroundColor Green

# Get MySQL installation path (adjust if needed)
$mysqlPath = "mysql"

# Check if MySQL is installed
$mysqlCheck = Invoke-Expression "$mysqlPath --version" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: MySQL is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please ensure MySQL is installed and the 'mysql' command is available" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found MySQL: $mysqlCheck" -ForegroundColor Green

# Get database credentials
$dbUser = "root"
$dbPassword = ""
$dbName = "noteAppDb"

# Construct connection string
$connectionStr = "-u$dbUser"
if ($dbPassword -ne "") {
    $connectionStr += " -p$dbPassword"
}

Write-Host ""
Write-Host "Running database schema..." -ForegroundColor Cyan
# Run schema.sql
Invoke-Expression "cat 'c:\Users\mmark\Note-Taking App\database\schema.sql' | mysql $connectionStr" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create schema" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Schema created successfully" -ForegroundColor Green

Write-Host ""
Write-Host "Seeding test data..." -ForegroundColor Cyan
# Run seed.sql
Invoke-Expression "cat 'c:\Users\mmark\Note-Taking App\database\seed.sql' | mysql $connectionStr" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to seed database" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database seeded successfully" -ForegroundColor Green

Write-Host ""
Write-Host "=== DATABASE SETUP COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: alice@demo.com" -ForegroundColor White
Write-Host "  Password: Password123!" -ForegroundColor White
Write-Host ""
Write-Host "  Email: bob@demo.com" -ForegroundColor White
Write-Host "  Password: Password123!" -ForegroundColor White
Write-Host ""
