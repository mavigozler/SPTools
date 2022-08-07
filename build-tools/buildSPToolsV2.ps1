using module "d:/dev/SharePoint/SPTools/build-tools/PowerShell Modules/Library.psm1"
Import-Module ($PSScriptRoot + "/PowerShell Modules/Library.psm1") -Force

Set-StrictMode -Version Latest

<# ====================== Configurable constants here =================== #>
# put the path to the JSON file here; if not absolute, the current directory will be used!
$BUILD_JSON_FILE_PATH = "SPToolsBuild.json"

$doClean = $false
$tsconfigChanged = $false

<# ===============  Function Defintions here ========================= #>

# ====================  Script Scope code here =====================

if ((Test-Path -Path $BUILD_JSON_FILE_PATH) -eq $false) {
   $newPath = $PSScriptRoot + "/" + $BUILD_JSON_FILE_PATH
   if ((Test-Path -Path $newPath) -eq $false) {
      throw "The path to configuration JSON file '" + $BUILD_JSON_FILE_PATH + " '" + `
      " does not exist. Even '" + $newPath + "' was tried and failed. " + `
      "`n`nThe script variable `$BUILD_JSON_FILE_PATH must be set to an existing path."
   } else {
      $buildJSON = Get-Content -Path $newPath | ConvertFrom-Json
   }
} else {
   $buildJSON = Get-Content -Path $BUILD_JSON_FILE_PATH | ConvertFrom-Json
}

$environments = "dev", "test", "prod"
for ($i = 0; $i -lt $args.Length; $i++) {
   if ($args[$i] -eq "-Env") {
      if ($environments -contains $args[$i + 1]) {
         $workingEnv = $args[$i + 1].toLower()
         break
      }
   }
}
$envConfig = $buildJSON.$workingEnv
$envConfigDict = Build-DictionaryFromJson $envConfig
$projectRootDir = Expand-Variable $envConfig.rootpaths.projectRootDir $envConfigDict
$copyTargetRootDir = Expand-Variable $envConfig.rootpaths.copyTargetRootDir $envConfigDict
# collect last saved compile time
$lastCompileTimeFilePath = Expand-Variable $envConfig.specialFiles.lastCompileDateFileName $envConfigDict
$lastSavedDate = Get-Content $lastCompileTimeFilePath | Select-Object -First 1 | Get-Date

<# ====================== Pre-Build Backup =================== #>
$preBuildBackup = $envConfig.backup.preBuildBackup
if ($null -ne $preBuildBackup) {
   [BackupItems]::new(
      $preBuildBackup,
      $envConfigDict
   ).DoBackup()
}

# Check ASPX/HTML entry file for defined $(...) variables
$entryFile = Expand-Variable $envConfig.source.entryFile.path $envConfigDict
$entryFileVariableDefs = $envConfig.entryFile.variableValues
If ($null -eq $entryFile) {
   throw "The entry file path/name has not been defined in the script"
}
if  ((Test-Path -Path $entryFile) -eq $false) {
   throw "The defined entry file path/name does not point to an existing file"
}
$matchingNames = Select-String -Path $entryFile -Pattern '\$\(([^\)]+)\)' -CaseSensitive -AllMatches
foreach ($fVariable in $matchingNames) {
   $fVariable = $fVariable.Matches[0].Groups[1]
   if ($null -eq (Get-Variable $entryFileVariableDefs[$fVariable])) {
      throw ("The variable '`$`(" + $fVariable + "`)' in the entry file is not defined in the PS script") + `
            "`nVariables in entry file in that format must be defined in the script as `$<variable-name>" + `
            " OR as the custom object '`$EntryFilePaths' with <variable-name>=<path-of-script-source-value> " + `
            "as properties."
   }
}

<# ====================== Post-Build Backup =================== #>




# check tsconfig.json file for "outDir" setting
$tsconfigJsonPath = $envConfig.tsFiles.tsconfigJsonPath
if ($envConfig.tsFiles.transpiledSameFolder -eq $false) {
   if ((Test-Path -Path $tsconfigJsonPath) -eq $false) {
      throw "The tsconfig.json file was not found where specified: " + $tsconfigJsonPath + `
            "`nOtherwise set '`$transpiledSameFolder' to `$true"
   }
   $transpiledPath = Select-String -Path $tsconfigJsonPath -Pattern '^\s*(.*)\s*"outDir"\s*:\s*"(.*)"'
   if ($null -eq $transpiledPath) {
      throw "A transpiled output directory was specified for the tsconfig.json file '" + $tsconfigJsonPath + "'" + `
            ", but no output directory was specified in the config file" + `
            "`nOtherwise set '`$transpiledSameFolder' to `$true"
   }
   if ($transpiledPath.Matches.Groups[1].Value.IndexOf("//") -ge 0) {
      throw "A transpiled output directory was specified for the tsconfig.json file '" + $tsconfigJsonPath + "'" + `
            ", but the output director 'outDir' was commented out in the config file." + `
            "`nOtherwise set '`$transpiledSameFolder' to `$true"
   }
   $transpiledPath = $projectRootDir + $groups[2].Value
}


# check if tsconfig.json file updated: if so, a full clean should be done
if ((Get-Item -Path $tsconfigJsonPath | Select-Object -Property LastWriteTime | Get-Date) -ge $lastSavedDate) {
   $doClean = $true
   $tsconfigChanged = $true
   Write-Output "tsconfig.json is newer than last compile date...all files should be compiled"
}

# delete compiled files in clean process
if (($args.Length -eq 1 -and $args[0] -eq "clean") -or $doClean -eq $true) {
   if ($transpiledPath -eq $projectRootDir) {
      throw "Bad setting!! An operation to delete all files and folders in the Project root directory was going to occur. Stopping script"
   }
   if ((Test-Path -Path $transpiledPath) -eq $true) {
      if ($transpiledSameFolder -eq $true) {
         Write-Output "`nALERT: A recursive directory deletion is about to take place!`n"
         Get-ChildItem -Path $transpiledPath -Include *.js,*.js.map | Remove-Item -Confirm
      } else {
         Write-Output "`nALERT: A recursive directory deletion is about to take place!`n"
         Get-ChildItem -Path $transpiledPath -Recurse | Remove-Item -Confirm
      }
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
   if ((Test-Path -Path ($file.Path + "\" + $file.FName)) -eq $true) {
      if (((Get-Item -Path ($file.Path + "\" + $file.FName) | Where-Object -Property LastWriteTime) | Get-Date) -lt $lastSavedDate) {
         Copy-Item -Path ($file.Path + "\" + $file.FName) -Destination ($copyTargetRootDir + $file.LocalFinalCopyPath)
         Copy-Item -Path ($file.Path + "\" + $file.FName) -Destination ($copyTargetRootDir + $file.LocalFinalCopyPath)
      }
   } else {
      Write-Output ("Error finding file '" + $file.Path + "\" + $file.FName + "' to test date for copying")
   }
}

# find out the TS files to be compiled and number of them
$fileCount = 0
$tsFilesTables = foreach ($pathInfo in $tsSourcePathsAndCopyTargets) {
   $path = $projectRootDir + $pathInfo.SourceRelativePath
   $foundTsFiles = Get-ChildItem -Path $path -Filter "*.ts" | Where-Object LastWriteTime -gt $lastSavedDate
   if ($null -ne $foundTsFiles) {
      $fileCount += $foundTsFiles.Length
      @{
         SrcRelPath = $pathInfo.SourceRelativePath
         CopyToDestination = $copyTargetRootDir + $pathInfo.CopyTargetRelativePath
         FileList = $foundTsFiles
      }
   }
}
Write-Output ("TypeScript source files (.ts) found newer than last compile date: " + $fileCount + "`n")

# begin the tsc with tsconfig.json use
if ($tsconfigChanged -eq $true -or $fileCount -gt 0) {
   tsc -p $tsconfigJsonPath
   if ($? -eq $false) {
      throw "There was error (non-true exit code) in the tsc tsconfig compilation command. Exiting script"
   }
   # build the list of TS, JS, JSMAP files to copy
   $tsjsFileList = foreach ($table in $tsFilesTables) {
      # need to check existence of transpiled path and of source, if they exist
      if ($transpiledSameFolder -eq $false) {
         $partialPath = $projectRootDir + $transpiledPath
         if (Test-Path -Path $partialPath -eq $false -or Test-Path -Path ($partialPath + $table.SrcRelPath) -eq $false) {
            throw "A path to transpiled output was specified but does not exist: '" + $partialPath + $table.SrcRelPath + "'"
         }
      } else {
         $transpiledPath = $projectRootDir
      }

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
      $fileFullPath = $file.Path + "\" + $file.Fname
      Copy-Item $fileFullPath -Destination $file.CopyTargetPath
      if ($file.FType -eq "ts") {
         Write-Output ("File '" + $fileFullPath + "' updated and copied.")
      }
   }
   # update the last saved compile time file
   ($nowTime = Get-Date -Format s) | Out-File -FilePath $lastCompileTimeFilePath
   Write-Output ("`n Last compile time file updated with datetime: " + $nowTime + "`n")
} else {
   Write-Output "There were no TS files found to be updated and copied."
}
Write-Output "`nScript completed.`n"
