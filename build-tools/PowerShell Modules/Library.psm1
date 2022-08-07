function Expand-Variable {   # case sensitivity is not an issue
   [CmdletBinding()]
   [OutputType("Variable")]
   param (
      [Parameter(
            ValueFromPipeline=$true
      )]
      [string]$Variable,
      [hashtable]$Dictionary
   )
   process {
      $anyMatches = $Variable | Select-String -Pattern "\$\{([^\)]+)\}" -AllMatches
      foreach ($match in $anyMatches) {
         $value = $Dictionary.($match.Matches[0].Groups[1])
         if ($null -eq $value) {
            $value = $($match.Matches[0].Groups[1])  # Get value from global space
            if ($null -eq $value) {
               throw "The variable '`${" + $match + "} was not found in " + `
               "either the dictionary argument or the global variable scope. This is not allowed."
            }
         }
         $Variable = $Variable -replace ('${' + $match + '}'), $property
      }
   }
   end {
      return $Variable
   }
}

function Get-PromptedKeyPress {  # case sensitivity is not an issue
   [CmdletBinding()]
   [OutputType()]
   param (
      [string]$InitialPrompt,
      [string]$ErrorPrompt,
      [string[]]$AcceptableResponses
   )

   Write-Host $InitialPrompt
   $response = [Console]::ReadKey("NoEcho,IncludeKeyDown").Key.toString()
   $keyedin = $AcceptableResponses -contains $response
   while ($keyedin -eq $false) {
      Write-Output $ErrorPrompt
      $response = [Console]::ReadKey("NoEcho,IncludeKeyDown").Key.toString()
      $keyedin = $AcceptableResponses -contains $response
   }
   foreach ($elem in $AcceptableResponses) {
      if ($response -eq $elem) {
         $response = $elem
         break
      }
   }
   return $response
}
function Update-ItemLastTimesToNow {  # updates specified items with date now or specified date
   [CmdletBinding(
         SupportsShouldProcess
   )]
   [OutputType(
      [System.Void]
   )]
   param (
      [string[]]$Paths,
      [string[]]$Filters,
      [DateTime]$UseTime = (Get-Date -Format s)  # default = now
   )
   process {
      if ($PSCmdlet.ShouldProcess()) {
         foreach ($path in $Paths) {
            foreach ($filter in $Filters) {
               $fileList = Get-ChildItem -Path $path -Filter $filter
               foreach ($file in $fileList) {
                  $file.LastWriteTime = $UseTime
               }
            }
         }
      }
   }
   end {}
}

function Build-DictionaryFromJson {
   [CmdletBinding()]
   [OutputType([hashtable])]
   param (
      [PSObject]$Json
   )
   function Read-Object {
      [CmdletBinding()]
      [OutputType([System.Void])]
      param (
         [PSObject]$Object
      )

      foreach ($prop in $Object | Get-Member) {
         if ($prop.MemberType -eq "Method") {
            continue
         }
         if ($prop.Definition | Select-String -Pattern "^System[^\s]*Object") {
            $Breadcrumb.Push($prop.Name)
            Read-Object $Object.($prop.Name)
            $Breadcrumb.Pop() | Out-Null
         } else {
            $Breadcrumb.Push($prop.Name)
            $BreadcrumbToReverse = $Breadcrumb.toArray().Clone()
            [array]::Reverse($BreadcrumbToReverse)
            $Dictionary.Add($BreadcrumbToReverse -join ".", $Object.($prop.Name))
            $Breadcrumb.Pop() | Out-Null
         }
      }
   }

   $Breadcrumb = [System.Collections.Generic.Stack[String]]::new()
   $Dictionary = @{}
   Read-Object $Json
   return $Dictionary
}

class BackupItems {
   static [boolean]$DoingBackupsChecked = $false
   static [boolean]$VerifyDoingBackups
   [PSObject]$BackupDefinition
   [PSObject]$BackupInfo
   [hashtable]$ConfigDictionary

   BackupItems(
      [PSObject]$BackupDefs,
      [hashtable]$ConfigDictionary
   ) {
      # examine the definitions
      if ([BackupItems]::DoingBackupsChecked -eq $false) {
         $response = Get-PromptedKeyPress `
               -InitialPrompt "Backups are available for this process: confirm whether to proceed with backups (y/n)`n" `
               -ErrorPrompt "Response should be y/n" `
               -AcceptableResponses "y","n"
         if ($response -eq "n") {
            [BackupItems]::VerifyDoingBackups = $false
         } else {
            [BackupItems]::VerifyDoingBackups = $true
         }
         [BackupItems]::DoingBackupsChecked = $true
      }
      if ($null -eq $BackupDefs -or $null -eq $BackupDefs.backupDestinationPath -or
            $null -eq $BackupDefs.items) {
         throw "BackupItems requires a definintion of object with two properties:`n" + `
               "`n1. [string]backupDestinationPath" + `
               "`n2. [{}[]]items where {[string]from; [string]to;}"
      }
      foreach ($item in $BackupDefs.items) {
         if ($null -eq $item.from -or $null -eq $item.to) {
            throw "A definition element [object] was not in correct format: an object with 'From' and 'To' properties is required"
         }
      }
      $this.BackupDefinition = $BackupDefs
      $this.BackupInfo = @{}
      # enumerate properties and put them in global space
      foreach ($prop in $BackupDefs | Get-Member) {
         if ($prop.Name -ne "items" -and $prop.MemberType -ne "Method") {
            $this.BackupInfo.Add($prop.Name, $BackupDefs.($prop.Name))
         }
      }
   }

   DoBackup () {
      if ([BackupItems]::VerifyDoingBackups -eq $false) {
         return
      }
      foreach ($def in $this.BackupDefinition.items) {
         $to = Expand-Variable $def.to $this.ConfigDictionary
         $from = Expand-Variable $def.from $this.ConfigDictionary
         if (Test-Path -Path $from -eq $false) {
            throw ("The definition with From = '" + $from +  "' leads to an non-existent path/file. Re-check definitions.")
         }
         if (Test-Path $to -eq $false) {
            $response = Get-PromptedKeyPress `
               -InitialPrompt ("Copy destination '" + $to + "' does not exist for target`ncreate path`nShall it be created? (y/n)`n") `
               -ErrorPrompt "Response must by a 'y' or 'n'`n" `
               -AcceptableResponses "y","n"
            if ($response -eq "y") {
               New-Item $to -ItemType Directory
            } else {
               continue
            }
         }
         Copy-Item $from -Destination $to
      }
   }
}

# Export-ModuleMember -Function Expand-Variable
# Export-ModuleMember -Function Get-PromptedKeyPress
# Export-ModuleMember -Function Update-ItemLastTimesToNow
