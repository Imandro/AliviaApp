$ErrorActionPreference = 'Stop'

# Run once while signed in with az login to the team's Azure subscription.
# Requires permission to create Entra applications and assign Azure roles.
function Invoke-AliviaAz {
    param([string[]]$Arguments)
    $result = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw 'Azure command failed. Stop here and resolve the preceding error.'
    }
    return $result
}

$aliviaSubscription = 'c19b7bb0-4ae3-4b30-b19c-4fff1fbc2810'
$aliviaTenant = 'bf983c20-cf30-4418-85af-a41d4c9f956d'
$aliviaAppScope = "/subscriptions/$aliviaSubscription/resourceGroups/rg-alivia/providers/Microsoft.App/containerApps/alivia-web-app"
$aliviaRegistryScope = "/subscriptions/$aliviaSubscription/resourceGroups/rg-alivia/providers/Microsoft.ContainerRegistry/registries/ca7b8d71f95facr"

Invoke-AliviaAz -Arguments @('account', 'set', '--subscription', $aliviaSubscription)
$aliviaClientId = Invoke-AliviaAz -Arguments @('ad', 'app', 'list', '--display-name', 'alivia-github-azure', '--query', '[0].appId', '-o', 'tsv')
if (-not $aliviaClientId) {
    $aliviaClientId = Invoke-AliviaAz -Arguments @('ad', 'app', 'create', '--display-name', 'alivia-github-azure', '--query', 'appId', '-o', 'tsv')
}

$aliviaPrincipalId = Invoke-AliviaAz -Arguments @('ad', 'sp', 'list', '--filter', "appId eq '$aliviaClientId'", '--query', '[0].id', '-o', 'tsv')
if (-not $aliviaPrincipalId) {
    $aliviaPrincipalId = Invoke-AliviaAz -Arguments @('ad', 'sp', 'create', '--id', $aliviaClientId, '--query', 'id', '-o', 'tsv')
}

$aliviaFederatedId = Invoke-AliviaAz -Arguments @('ad', 'app', 'federated-credential', 'list', '--id', $aliviaClientId, '--query', "[?name=='github-main'].id | [0]", '-o', 'tsv')
if (-not $aliviaFederatedId) {
    $aliviaTempFile = [System.IO.Path]::GetTempFileName()
    try {
        $aliviaFederated = @{
            name = 'github-main'
            issuer = 'https://token.actions.githubusercontent.com'
            subject = 'repo:Imandro/AliviaApp:ref:refs/heads/main'
            audiences = @('api://AzureADTokenExchange')
        } | ConvertTo-Json
        [System.IO.File]::WriteAllText($aliviaTempFile, $aliviaFederated)
        Invoke-AliviaAz -Arguments @('ad', 'app', 'federated-credential', 'create', '--id', $aliviaClientId, '--parameters', "@$aliviaTempFile", '-o', 'none')
    } finally {
        Remove-Item -LiteralPath $aliviaTempFile -ErrorAction SilentlyContinue
    }
}

Invoke-AliviaAz -Arguments @('role', 'assignment', 'create', '--assignee-object-id', $aliviaPrincipalId, '--assignee-principal-type', 'ServicePrincipal', '--role', 'Contributor', '--scope', $aliviaAppScope, '-o', 'none')
Invoke-AliviaAz -Arguments @('role', 'assignment', 'create', '--assignee-object-id', $aliviaPrincipalId, '--assignee-principal-type', 'ServicePrincipal', '--role', 'AcrPush', '--scope', $aliviaRegistryScope, '-o', 'none')

Write-Host 'Create these repository Actions variables in Imandro/AliviaApp:'
Write-Host "AZURE_CLIENT_ID = $aliviaClientId"
Write-Host "AZURE_TENANT_ID = $aliviaTenant"
Write-Host "AZURE_SUBSCRIPTION_ID = $aliviaSubscription"
