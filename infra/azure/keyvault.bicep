// Key Vault con la contrasena SSH y la de PostgreSQL (distinta, a proposito).
//
// La contrasena de PostgreSQL se genera aqui en vez de pasarla como parametro:
// quien despliega no la inventa ni queda en el historial de shell. Ambas
// secretos se usan despues en vm-setup.sh (argumentos $1 y $2).

param location string = resourceGroup().location

@secure()
@description('Contrasena SSH de la VM (usuario azureuser).')
param adminPassword string

var kvName = 'kv-alivia-${uniqueString(resourceGroup().id)}'

// La contrasena de PostgreSQL es distinta de la de SSH a proposito: si
// comparten secreto, entrar en la base de datos da tambien entrada por SSH.
var pgPassword = 'alivia-${uniqueString(subscription().id, resourceGroup().id, 'pg')}'

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: kvName
  location: location
  tags = {
    project: 'alivia'
    role: 'secrets'
  }
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: false
    enableRbacAuthorization: true
    publicNetworkAccess: 'Enabled'
  }

  resource databasePassword 'secrets@2023-07-01' = {
    name: 'database-password'
    properties: {
      value: pgPassword
    }
  }

  resource databaseUrl 'secrets@2023-07-01' = {
    name: 'database-url'
    properties: {
      value: 'postgresql://alivia_admin:${pgPassword}@127.0.0.1:5432/alivia'
    }
  }

  resource cronSecret 'secrets@2023-07-01' = {
    name: 'cron-secret'
    properties: {
      value: guid(subscription().id, resourceGroup().id, 'cron')
    }
  }

  resource openaiKey 'secrets@2023-07-01' = {
    name: 'openai-api-key'
    properties: {
      value: ''
    }
  }

  resource groqKey 'secrets@2023-07-01' = {
    name: 'groq-api-key'
    properties: {
      value: ''
    }
  }

  resource sshPasswordSecret 'secrets@2023-07-01' = {
    name: 'ssh-admin-password'
    properties: {
      value: adminPassword
    }
  }
}

output keyVaultName string = kv.name
output keyVaultId string = kv.id
output keyVaultUri string = kv.properties.vaultUri
@secure()
output postgresPassword string = pgPassword
@secure()
output cronSecret string = guid(subscription().id, resourceGroup().id, 'cron')
@secure()
output sshAdminPassword string = adminPassword