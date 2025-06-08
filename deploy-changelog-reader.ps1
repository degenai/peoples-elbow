# Deploy the changelog reader worker to Cloudflare
# Run this script from the root directory of the project

Write-Host "Deploying D1 Changelog Reader Worker..." -ForegroundColor Green

# Change to workers directory
Set-Location workers

# Deploy the worker using its specific wrangler config
npx wrangler deploy --config wrangler-changelog-reader.toml

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "The changelog reader should be available at: https://changelog-reader.alex-adamczyk.workers.dev" -ForegroundColor Yellow
Write-Host "Remember to update the baseUrl in js/d1-changelog.js if the worker URL is different." -ForegroundColor Yellow

# Return to root directory
Set-Location ..
