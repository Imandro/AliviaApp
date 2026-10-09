// Red de la VM: VNet, subred delegada a Postgres y NSG.
//
// El NSG deja entrar a internet solo por 22, 80 y 443. PostgreSQL (5432) y el
// backend Node (3000) no tienen regla de entrada: se alcanzan por loopback y por
// la IP privada de la VM, nunca desde internet.

@description('Region de la red.')
param location string = resourceGroup().location

@description('Rango CIDR de la VNet. 10.1.0.0/16.')
param addressPrefix string = '10.1.0.0/16'

@description('Origen permitido para SSH. 0.0.0.0/0 acepta cualquier origen.')
param sshSourceAddressPrefix string = '0.0.0.0/0'

var vnetName = 'vnet-alivia'
var subnetName = 'snet-alivia'

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [addressPrefix]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: '10.1.1.0/24'
          // Delegar la subred a Postgres es lo que permite desplegarlo con
          // `publicNetworkAccess: Disabled`. La VM tambien vive aqui: sin
          // delegacion, la IP privada quedaria reservada para el servicio.
delegations: [
              {
                name: 'postgresql'
                properties: {
                  serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers'
                }
              }
            ]
        }
      }
    ]
  }
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: 'nsg-alivia'
  location: location
  properties: {
    securityRules: [
      {
        name: 'allow-ssh'
        properties: {
          priority: 1000
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: sshSourceAddressPrefix
          sourcePortRange: '22'
          destinationAddressPrefix: '*'
          destinationPortRange: '22'
        }
      }
      {
        name: 'allow-http'
        properties: {
          priority: 1010
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '80'
          destinationAddressPrefix: '*'
          destinationPortRange: '80'
        }
      }
      {
        name: 'allow-https'
        properties: {
          priority: 1020
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourceAddressPrefix: '*'
          sourcePortRange: '443'
          destinationAddressPrefix: '*'
          destinationPortRange: '443'
        }
      }
      {
        // Todo lo demas (5432 de Postgres, 3000 del backend Node) queda
        // bloqueado: no hay regla que lo permita.
        name: 'deny-all-inbound'
        properties: {
          priority: 4000
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourceAddressPrefix: '*'
          sourcePortRange: '*'
          destinationAddressPrefix: '*'
          destinationPortRange: '*'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output vnetName string = vnet.name
output subnetId string = vnet.properties.subnets[0].id
output subnetName string = vnet.properties.subnets[0].name
output nsgId string = nsg.id
output nsgName string = nsg.name