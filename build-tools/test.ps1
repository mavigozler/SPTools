function Get-ObjectProperty {
   [CmdletBinding()]
   param (
       [Parameter(Mandatory, ValueFromPipeline)]
       [PSObject]$PSObject,
       [string]$ObjectProperty
   )

   process {
      Write-Host 'In Get-ObjectProperty:'
      Write-Host "`$PSObject.`$ObjectProperty -is [array]:" ($PSObject.$ObjectProperty -is [array])
      Write-Host "`$PSObject.`$ObjectProperty.GetType(): " $PSObject.$ObjectProperty.GetType()
      Write-Host "`$PSObject.`$ObjectProperty: " $PSObject.$ObjectProperty
      $PSObject.PSObject.Properties.Item($ObjectProperty) ? $PSObject.$ObjectProperty : $null
   }
}

@{ include = @('./src/ts/**/*') } | ConvertTo-Json | Set-Content -Path "config.json"
Write-Host "`n======== Part 1 ========="
$configInfo = Get-Content "config.json" | ConvertFrom-Json
$returnedValue = Get-ObjectProperty $configInfo 'include'
Write-Host "`nglobal scope:"
Write-Host "`$configInfo.include -is [array]:" ($configInfo.include -is [array])
Write-Host "`$configInfo.include.GetType(): " $configInfo.include.GetType()
Write-Host "`$configInfo.include: " $configInfo.include
Write-Host "`n`$returnedValue -is [array]: " ($returnedValue -is [array])
Write-Host "`$returnedValue.GetType(): " $returnedValue.GetType()
Write-Host "`$returnedValue: " $returnedValue

@{ include = @('./src/ts/**/*', './src/css/**/*') } | ConvertTo-Json | Set-Content -Path "config.json"
Write-Host "`n======== Part 2 ========="
$configInfo = Get-Content "config.json" | ConvertFrom-Json
$returnedValue = Get-ObjectProperty $configInfo 'include'
Write-Host "`nglobal scope:"
Write-Host "`$configInfo.include -is [array]:" ($configInfo.include -is [array])
Write-Host "`$configInfo.include.GetType(): " $configInfo.include.GetType()
Write-Host "`$configInfo.include: " $configInfo.include
Write-Host "`n`$returnedValue -is [array]: " ($returnedValue -is [array])
Write-Host "`$returnedValue.GetType(): " $returnedValue.GetType()
Write-Host "`$returnedValue: " $returnedValue
