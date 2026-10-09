// La VM de Azure: Ubuntu 22.04, IP publica estatica, disco de datos.
//
// Standard_B2as_v2 (2 vCPU, 8 GB) es el default: sobrado para Node + PostgreSQL.
// Standard_B1s (1 vCPU, 1 GB) es el unico del free tier de Azure (cuenta de
// estudiante). Cabe, pero Node + PostgreSQL + SO rozan 900 MB y conviene swap.

param location string = resourceGroup().location

@allowed([
  'Standard_B1s'
  'Standard_B2as_v2'
])
@description('Tamano de la VM. Standard_B2as_v2 = 2 vCPU / 8 GB. Standard_B1s = free tier.')
param vmSize string = 'Standard_B2as_v2'

@description('Usuario SSH. Azure rechaza nombres reservados como root o admin.')
param adminUsername string

@secure()
@description('Contrasena SSH.')
param adminPassword string

@description('Tamano del disco de datos en GB.')
param dataDiskSizeGB int = 30

@description('Id de la subred donde se coloca la NIC.')
param subnetId string

@description('Id del NSG que filtra el trafico de la NIC.')
param nsgId string

// Ubuntu 22.04 LTS (imagen Gen2, probada con Node 22).
var ubuntuImage = {
  publisher: 'canonical'
  offer: '0001-com-ubuntu-server-jammy'
  sku: '22_04-lts-gen2'
  version: 'latest'
}

var vmName = 'vm-alivia'
var nicName = 'nic-alivia'
var pipName = 'pip-alivia'

resource pip 'Microsoft.Network/publicIPAddresses@2023-11-01' = {
  name: pipName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Regional'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    idleTimeoutInMinutes: 30
  }
  tags = {
    project: 'alivia'
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: nicName
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetId
          }
          publicIPAddress: {
            id: pip.id
          }
        }
      }
    ]
    networkSecurityGroup: {
      id: nsgId
    }
  }
  dependsOn: [pip]
}

resource vm 'Microsoft.Compute/virtualMachines@2023-11-01' = {
  name: vmName
  location: location
  tags = {
    project: 'alivia'
  }
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: 'alivia'
      adminUsername: adminUsername
      adminPassword: adminPassword
      linuxConfiguration: {
        disablePasswordAuthentication: false
        ssh: {
          publicKeys: []
        }
      }
    }
    storageProfile: {
      imageReference: ubuntuImage
      osDisk: {
        createOption: 'FromImage'
        caching: 'ReadWrite'
        managedDisk: {
          storageAccountType: 'Standard_LRS'
        }
        diskSizeGB: 30
      }
      dataDisks: [
        {
          name: 'datadisk'
          createOption: 'Empty'
          caching: 'ReadWrite'
          managedDisk: {
            storageAccountType: 'Standard_LRS'
          }
          diskSizeGB: dataDiskSizeGB
          lun: 0
        }
      ]
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
        }
      ]
    }
    diagnosticsProfile: {
      bootDiagnostics: {
        enabled: true
      }
    }
  }
}

output vmId string = vm.id
output vmName string = vm.name
output nicId string = nic.id
output publicIpAddress string = pip.properties.ipAddress
output privateIpAddress string = nic.properties.ipConfigurations[0].properties.privateIPAddress