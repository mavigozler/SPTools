Set-StrictMode -Version Latest
# ====================== Configurable constants here ===================
$projectRootDir = "d:\dev\SharePoint\SPTools\"
$copyTargetRootDir = "C:\Users\Mitch\California Department of Water Resources\Compliance Program Repository ME - Site Assets\SPTools\"
$transpiledPath = $projectRootDir
$tsSourcePathsAndCopyTargets = @(
   @{ SourceRelativePath = "src\ts\"; CopyTargetRelativePath = "" };
   @{ SourceRelativePath = "SPREST\src\";  CopyTargetRelativePath = "SPREST\" }
)
$otherSourceFiles = @(
   @{ Path = $projectRootDir + "src\"; FName = "SPTools.aspx"; CopyTargetRelativePath = "" };
   @{ Path = $projectRootDir + "src\"; FName = "SPTools.css"; CopyTargetRelativePath = "" };
   @{ Path = $projectRootDir + "src\"; FName = "LibraryListing.aspx"; CopyTargetRelativePath = "" };
   @{ Path = $projectRootDir + "src\"; FName = "RestRequesting.css"; CopyTargetRelativePath = "" };
   @{ Path = $projectRootDir + "src\"; FName = "liblisting.css"; CopyTargetRelativePath = "" };
)

$tsconfigJsonPath = $projectRootDir + "tsconfig.json"
# get the lastSaved date
$lastCompileTimeFilePath = $projectRootDir + "lastCompileTime.txt"
$doClean = $false
$tsconfigChanged = $false

# ===============  Function Defintions here =========================

function Update-ItemLastTimesToNow {  # updates specified items with date now or specified date
   [CmdletBinding()]
   param (
      [string[]]$Paths,
      [string[]]$Filters,
      [DateTime]$UseTime = (Get-Date -Format s)  # default = now
   )
   process {
      foreach ($path in $Paths) {
         foreach ($filter in $Filters) {
            $fileList = Get-ChildItem -Path $path -Filter $filter
            foreach ($file in $fileList) {
               $file.LastWriteTime = $UseTime
            }
         }
      }
   }
   end {}
}

# ====================  Script Scope code here =====================

# collect last saved compile time
$lastSavedDate = Get-Content $lastCompileTimeFilePath | Select-Object -First 1 | Get-Date

# check if tsconfig.json file updated: if so, a full clean should be done
if ((Get-Item -Path $tsconfigJsonPath | Select-Object -Property LastWriteTime | Get-Date) -ge $lastSavedDate) {
   $doClean = $true
   $tsconfigChanged = $true
   Write-Host "tsconfig.json is newer than last compile date...all files should be compiled"
}

# delete compiled files in clean process
if (($args.Length -eq 1 -and $args[0] -eq "clean") -or $doClean -eq $true) {
   if (Test-Path -Path $transpiledPath) {
      Remove-Item -Path $transpiledPath -Recurse
   }
}

# perform a touch operation of clean or touch is specified
if (($args.Length -eq 1 -and ($args[0] -eq "clean" -or $args[0] -eq "touch")) -or $doClean -eq $true) {
   [String[]]$sourcePaths = foreach ($srcPath in $tsSourcePathsAndCopyTargets) {
      $projectRootDir + $srcPath.SourceRelativePath
   }
   Update-ItemLastTimesToNow $sourcePaths @("*.ts")
}

# Check other sources (*.aspx, *.css ) need to be copied over, if updated
foreach ($file in $otherSourceFiles) {
   if ((Test-Path -Path ($file.Path + $file.FName)) -eq $true) {
      if (((Get-Item -Path ($file.Path + $file.FName) | Where-Object -Property LastWriteTime) | Get-Date) -lt $lastSavedDate) {
         Copy-Item -Path ($file.Path + $file.FName) -Destination ($copyTargetRootDir + $file.CopyTargetRelativePath)
      }
   } else {
      Write-Host "Error finding file '" + ($file.Path + $file.FName) + "' to test date for copying"
   }
}

# find out the TS files to be compiled and number of them
$fileCount = 0
$tsFilesTables = foreach ($pathInfo in $tsSourcePathsAndCopyTargets) {
   $path = $projectRootDir + $pathInfo.SourceRelativePath
   $foundTsFiles = Get-ChildItem -Path $path -Filter "*.ts" | Where-Object LastWriteTime -gt $lastSavedDate
   $fileCount++
   @{
      SrcRelPath = $pathInfo.SourceRelativePath
      CopyToDestination = $copyTargetRootDir + $pathInfo.CopyTargetRelativePath
      FileList = $foundTsFiles
   }
}
Write-Host ("TypeScript source files (.ts) found newer than last compile date: " + $fileCount)

# begin the tsc with tsconfig.json use
if ($tsconfigChanged -eq $true -or $fileCount -gt 0) {
   d:\dev\SharePoint\SPTools\node_modules\.bin\tsc.cmd -b $tsconfigJsonPath
   if ($? -eq $false) {
      Write-Host "There was error (non-true exit code) in the tsc tsconfig compilation command. Exiting script"
      Exit-PSSession
   }
   # build the list of TS, JS, JSMAP files to copy
   $tsjsFileList = foreach ($table in $tsFilesTables) {
      foreach ($tsFile in $table.FileList) {
         [PSCustomObject]@{
            Path = $projectRootDir + $table.SrcRelPath
            FName = $tsFile.PSChildName
            CopyTargetPath = $table.CopyToDestination
            FType = "ts"
         },
         [PSCustomObject]@{
            Path = $transpiledPath + $table.SrcRelPath
            FName = $tsFile.PSChildName.Substring(0, $tsFile.PSChildName.IndexOf(".")) + ".js"
            CopyTargetPath = $table.CopyToDestination
            FType = "js"
         },
         [PSCustomObject]@{
            Path = $transpiledPath + $table.SrcRelPath
            FName = $tsFile.PSChildName.Substring(0, $tsFile.PSChildName.IndexOf(".")) + ".js.map"
            CopyTargetPath = $table.CopyToDestination
            FType = "jsmap"
         }
      }
   }

   # run the copy operation on all files in the list
   foreach ($file in $tsjsFileList) {
      $fileFullPath = $file.Path + $file.Fname
      Copy-Item $fileFullPath -Destination $file.CopyTargetPath
      if ($file.FType -eq "ts") {
         Write-Host ("File '" + $fileFullPath + "' updated and copied.")
      }
   }
   # update the last saved compile time file
   ($nowTime = Get-Date -Format s) | Out-File -FilePath $lastCompileTimeFilePath
   Write-Host ("`n Last compile time file updated with datetime: " + $nowTime + "`n")
} else {
   Write-Host "There were no TS files found to be updated and copied."
}
Write-Host "`nScript completed.`n"
