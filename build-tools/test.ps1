
function Build-DictionaryFromJson {
   [CmdletBinding()]
   [OutputType([hashtable])]
   [Parameter(ValueFromPipeline=$true)]
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

Build-DictionaryFromJson (Get-Content -Path ($PSScriptRoot + "/test.json") | ConvertFrom-Json) | Write-Output