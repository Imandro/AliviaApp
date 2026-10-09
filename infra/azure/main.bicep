// ALIVIA - Infraestructura en Azure (una VM, sin serverless).
//
// Despliegue:
//   az login
//   az group create --name alivia-rg --location eastus
//   az deployment group create \
//     --resource-group alivia-rg \
//     --template-file infra/azure/main.bicep \
//     --parameters vmAdminUsername=azureuser adminPassword=<seguro>

param resourceGroupName string = 'alivia-rg'
param location string = 'eastus'

@allowed([
  'Standard_B1s'
  'Standard_B2as_v2'
])
@description('Tamano de la VM. Standard_B2as_v2 = 2 vCPU / 8 GB. Standard_B1s = free tier.')
param vmSize string = 'Standard_B2as_v2'

@description('Usuario SSH. En Azure no se admiten nombres reservados como root o admin.')
param vmAdminUsername string = 'azureuser'

@secure()
@description('Contrasena SSH.')
param adminPassword string

@description('Tamano del disco de datos en GB. 30 GB cubre el SO, Node, Postgres y los builds.')
@minValue(30)
param dataDiskSizeGB int = 30

// ---------------------------------------------------------------------------
// Grupo de recursos
// ---------------------------------------------------------------------------

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: resourceGroupName
  location: location
}

// ---------------------------------------------------------------------------
// Key Vault
// ---------------------------------------------------------------------------

module keyVault 'keyvault.bicep' = {
  name: 'alivia-kv-deploy'
  scope: rg
  params: {
    location: location
    adminPassword: adminPassword
  }
}

// ---------------------------------------------------------------------------
// Red
// ---------------------------------------------------------------------------

module network 'network.bicep' = {
  name: 'alivia-net-deploy'
  scope: rg
  params: {
    location: location
    sshSourceAddressPrefix: '0.0.0.0/0'
  }
}

// ---------------------------------------------------------------------------
// VM
// ---------------------------------------------------------------------------

module vm 'vm.bicep' = {
  name: 'alivia-vm-deploy'
  scope: rg
  params: {
    location: location
    vmSize: vmSize
    adminUsername: vmAdminUsername
    adminPassword: adminPassword
    dataDiskSizeGB: dataDiskSizeGB
    subnetId: network.outputs.subnetId
    nsgId: network.outputs.nsgId
  }
}

// ---------------------------------------------------------------------------
// Script de aprovisionamiento (cloud-init via deployment script)
// ---------------------------------------------------------------------------

// El script se ejecuta la primera vez que arranca la VM y vuelve a correr en
// cada `az deployment group create`. Instala Node 22, PostgreSQL, nginx y la
// unidad systemd del backend. El contenido del script va en el deployment
// script para que el despliegue sea autocontenido (no depende de GitHub).

resource setupScript 'Microsoft.Resources/deploymentScripts@2020-10-01' = {
  name: 'alivia-vm-setup'
  location: location
  kind: 'AzureCLI'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    mode: 'Always'
    forceUpdateTag: utcNow()
    azCliVersion: '2.54.0'
    timeout: 'PT30M'
    // El script espera argumentos posicionados:
    //   $1 adminPassword (SSH)  $2 pgPassword (PostgreSQL)  $3 publicIp
    arguments: '-p ${adminPassword} -q ${keyVault.outputs.postgresPassword} -i ${vm.outputs.publicIpAddress}'
    scriptContent: loadTextContent('./vm-setup.sh')
    environmentVariables: [
      {
        name: 'ALIVIA_REPO'
        value: 'https://github.com/Imandro/AliviaApp.git'
      }
      {
        name: 'ALIVIA_BRANCH'
        value: 'main'
      }
    ]
  }
  dependsOn: [vm, keyVault]
}

// ---------------------------------------------------------------------------
// Salidas
// ---------------------------------------------------------------------------

output resourceGroupName string = rg.name
output publicIpAddress string = vm.outputs.publicIpAddress
output adminUsername string = vmAdminUsername
output sshCommand string = 'ssh ${vmAdminUsername}@${vm.outputs.publicIpAddress}'
output keyVaultName string = keyVault.outputs.keyVaultName
output appUrl string = 'http://${vm.outputs.publicIpAddress}'
output apiUrl string = 'http://${vm.outputs.publicIpAddress}/api'
output apkUrl string = 'http://${vm.outputs.publicIpAddress}/releases/v1.2.1/ALIVIA-android.apk'