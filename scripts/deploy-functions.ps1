param(
  [string]$ProjectRef = "hnsuxguzwibnxhumedhs"
)

$ErrorActionPreference = "Stop"
$functions = @(
  "create-order",
  "update-order-status",
  "delete-order",
  "approve-refund",
  "search-orders",
  "list-orders",
  "get-order-status",
  "update-quota"
)

foreach ($functionName in $functions) {
  Write-Host "Deploying $functionName..."
  & supabase functions deploy $functionName --project-ref $ProjectRef --no-verify-jwt
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to deploy $functionName."
  }
}

Write-Host "All Edge Functions now use the same shared auth revision."
