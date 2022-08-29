using module "d:/dev/SharePoint/SPTools/build-tools/PowerShell Modules/Library.psm1"
Import-Module ($PSScriptRoot + "/PowerShell Modules/Library.psm1") -Force

Set-StrictMode -Version Latest

$NO_BACKUP = $true
$COMPILE_COMMAND = "tsc --build --listEmittedFiles `${workspaceFolder}/tsconfig.json | "

<# ====================== Configurable constants here =================== #>
# put the path to the JSON file here; if not absolute, the current directory will be used!
$BUILD_JSON_FILE_PATH = "SPToolsBuild.json"
$VariableSubstitutionPattern = '\$\{([^\}]+)\}'
$doClean = $false
$tsconfigChanged = $false
$SubbedFilesList = [SubbedFileInfoList]::new()

<# ===============  Function Defintions here ========================= #>
function Get-AllTSConfigReferences {
   [CmdletBinding()]
   param (
       [PSObject]$TSConfigFullPath,
       [System.Collections.Generic.List[PSObject]]$RefsList
   )

   process {
      if ($null -eq $RefsList) {
         $RefsList = [System.Collections.Generic.List[PSObject]]::new()
      }
      if ((Test-Path -Path $TSConfigFullPath) -ne $false) {
         $local:tsconfigJsonPathParent = (Get-Item -Path $TSConfigFullPath | Select-Object *).PSParentPath.Split("::")[1]
         $local:tsconfigJson = Get-Content -Path $TSConfigFullPath | ConvertFrom-Json
         $local:references = Get-ObjectProperty $local:tsconfigJson 'references'
         if ($local:references.PSObject.Properties.Match("Length").Count -gt 0) {
            foreach ($local:reference in $local:references) {
               $local:refFile = Get-ChildItem -Path (Resolve-Path ($local:tsconfigJsonPathParent + "/" + $local:reference.path)) -Filter 'tsconfig.json'
               $RefsList.Add($refFile)
               Get-AllTSConfigReferences $local:refFile $RefsList
            }
            Write-Output -NoEnumerate $RefsList
         }
      } else {
         Write-Output -NoEnumerate $null
      }
   }
}

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

# Control Arguments here

$environments = "dev", "test", "prod"
for ($i = 0; $i -lt $args.Length; $i++) {
   if ($args[$i] -eq "-Env") {
      if ($environments -contains $args[$i + 1]) {
         $workingEnv = $args[$i + 1].toLower()
         $i++
      } else {
         throw "The required command parameter '-Env' does not recognize the parameter value '" + `
            $args[$i + 1] + "'. Only one of 'dev'|'test'|'prod' is recognized. These environments " + `
               "must be defined in a separate configuration JSON file"
      }
   } elseif ($args[$i] -eq "-Clean") {
      $doClean = $true
   } else {
      throw "The command parameter specifier or argument '" + $args[$i] + "' is unknown/invalid. " + `
         "`r`nCommand format: " + $MyInvocation.MyCommand + " -Env {'dev' | 'test' | 'prod' } [ -Clean ]"
   }
}
$envConfig = $buildJSON.$workingEnv
$envConfigDict = Build-DictionaryFromJson $envConfig
$projectRootDir = Expand-Variable $envConfig.rootpaths.projectRootDir $envConfigDict
$remoteRootDir = Expand-Variable $envConfig.rootpaths.remoteRootDir $envConfigDict
# collect last saved compile time
$lastCompileTimeFilePath = Expand-Variable $envConfig.specialFiles.lastCompileDateFileName $envConfigDict
$lastSavedDate = Get-Content $lastCompileTimeFilePath | Select-Object -First 1 | Get-Date

<# ====================== Pre-Build Backup =================== #>
if ($NO_BACKUP -ne $true) {
   $preBuildBackup = $envConfig.backup.preBuildBackup
   if ($null -ne $preBuildBackup) {
      [BackupItems]::new(
         $preBuildBackup,
         $envConfigDict
      ).DoBackup()
   }
}

# Check ASPX/HTML entry file for defined $(...) variables
$entryFile = Expand-Variable $envConfig.source.entryFile.sourcepath $envConfigDict
$entryFileVariableDefs = $envConfig.source.entryFile.variableValues
If ($null -eq $entryFile) {
   throw "The entry file path/name has not been defined in the script"
}
if  ((Test-Path -Path $entryFile) -eq $false) {
   throw "The defined entry file path/name does not point to an existing file"
}
$entryFileContent = Get-Content $entryFile
$matchingNames = $entryFileContent | Select-String -Pattern $VariableSubstitutionPattern -AllMatches
foreach ($fVariable in $matchingNames) {
   $fVariable = $fVariable.Matches[0].Groups[1].Value
   $found = $false
   foreach ($elem in $entryFileVariableDefs) {
      if ($elem.variableName -eq $fVariable) {
         $found = $true
         break
      }
   }
   if ($found -eq $true) {
      $entryFileContent = $entryFileContent -replace ('\$\{' + $elem.variableName + '\}'), $elem.value
   } else {
      throw ("The variable '`$`(" + $fVariable + "`)' in the entry file is not defined in the PS script") + `
            "`nVariables in entry file in that format must be defined in the script as `$<variable-name>" + `
            " OR as the custom object '`$EntryFilePaths' with <variable-name>=<path-of-script-source-value> " + `
            "as properties."
   }
}
$filePathData = Get-Item $entryFile | Select-Object *
if (($filePathData.GetType() -match 'Object\[\]') -eq $true) {
   throw "Config setting to 'source.entryFile.sourcepath' does not specify a single ASPX/HTML file. It cannot have wildcard characters"
}
$entryFileInfo = $SubbedFilesList.AddFileInfo(
   $entryFile,
   (Expand-Variable $envConfig.source.entryFile.destinationpath $envConfigDict)
)

# check tsconfig.json file for "outDir" setting and 'rootDir'
$tsconfigJsonPath = Expand-Variable $envConfig.source.tsFiles.tsconfigJsonPath $envConfigDict
if ((Test-Path -Path $tsconfigJsonPath) -eq $false) {
   throw "The tsconfig.json file was not found where specified: " + $tsconfigJsonPath + `
            "`nOtherwise set '`$transpiledSameFolder' to `$true"
}



# use references to find projects first
$allProjects = Get-AllTSConfigReferences $tsconfigJsonPath
$allProjects.Insert(0, $tsconfigJsonPath)
$allConfigs = [System.Collections.Generic.List[PSObject]]::new()
foreach ($project in $allProjects.ToArray()) {
   $config = @{}
   $config.PathParent = (Get-Item -Path $project | Select-Object *).PSParentPath.Split("::")[1]
   $tsconfigJson = Get-Content -Path $project | ConvertFrom-Json
   $config.OutDir = Get-ObjectProperty $tsconfigJson.compilerOptions 'outDir'
   $config.RootDir = Get-ObjectProperty $tsconfigJson.compilerOptions 'rootDir'
   $tsconfigFiles = Get-ObjectProperty $tsconfigJson 'files'
   $config.Files = foreach ($tsconfigFile in $tsconfigFiles) {
      Resolve-Path ($config.PathParent + "/" + $tsconfigFile)
   }
   $tsconfigIncludes = Get-ObjectProperty $tsconfigJson 'include'
   $config.Include = foreach ($tsconfigInclude in $tsconfigIncludes) {
      Resolve-Path ($config.PathParent + "/" + $tsconfigInclude.Replace("**/*", "*.ts") )
   }
   $tsconfigExcludes = Get-ObjectProperty $tsconfigJson 'exclude'
   $config.Exclude = foreach ($tsconfigExclude in $tsconfigExcludes) {
      Resolve-Path ($config.PathParent + "/" + $tsconfigExclude.Replace("**/*", "*.ts"))
   }
   $allConfigs.Add($config)
}

# check if tsconfig.json file updated: if so, a full clean should be done
if ((Get-Item -Path $tsconfigJsonPath | Select-Object -Property LastWriteTime | Get-Date) -ge $lastSavedDate) {
   $doClean = $true
   $tsconfigChanged = $true
   Write-Output "tsconfig.json is newer than last compile date...all files should be compiled"
}

# delete compiled files in clean process
if ($doClean -eq $true) {
   foreach ($path in $envConfig.source.tsFiles.pathsAndCopyTargets) {
      $transpiledFullPath = $transpiledPathRoot + $path.sourceRelativePath
      if ($transpiledFullPath -eq $projectRootDir) {
         throw "Bad setting!! An operation to delete all files and folders in the Project root directory was going to occur. Stopping script"
      }
      Get-ChildItem -Path ($transpiledFullPath + "\*") -Include *.js,*.js.map | Remove-Item
   }
}

# perform a touch operation of clean or touch is specified
if ($doClean -eq $true) {
   [String[]]$sourcePaths = foreach ($srcPath in $envConfig.source.tsFiles.pathsAndCopyTargets) {
      $projectRootDir + $srcPath.SourceRelativePath
   }
   Update-ItemLastTimesToNow $sourcePaths @("*.ts")
}

# Check other sources (*.aspx, *.css ) need to be copied over, if updated
$otherSourceFiles = $envConfig.source.otherSourceFiles
foreach ($file in $otherSourceFiles) {
   $fPathName = (Expand-Variable $file.path $envConfigDict) + "/" + (Expand-Variable $file.fName $envConfigDict)
   $localCopyTargetPath = Expand-Variable $file.localFinalCopyPath $envConfigDict
   if ((Check-NonexistentPath -Path $localCopyTargetPath -CreateOption $envConfig.createNonExistentPathsOnCopy -PathType Directory) -eq $false) {
      throw "The local device copy target path '" + $localCopyTargetPath + "' does not exist and cannot be created or was not specified to be created."
   }
   $remoteCopyTargetPath = $remoteRootDir + (Expand-Variable $file.copyTargetRelativePath $envConfigDict)
   if ((Check-NonexistentPath -Path $remoteCopyTargetPath -CreateOption $envConfig.createNonExistentPathsOnCopy -PathType Directory) -eq $false) {
      throw "The remote network system copy target path '" + $remoteCopyTargetPath + "' does not exist and cannot be created or was not specified to be created."
   }
   if ((Test-Path -Path $fPathName) -eq $true) {
      if (((Get-Item -Path ($fPathName) | Where-Object -Property LastWriteTime) | Get-Date) -lt $lastSavedDate) {
         Copy-Item -Path $fPathName -Destination $localCopyTargetPath
         Copy-Item -Path $fPathName -Destination $remoteCopyTargetPath
      }
   } else {
      Write-Output ("Error finding file '" + $fPathName + "' to test date for copying")
   }
}

# find out the TS files to be compiled and number of them
$fileCount = 0
$tsFilesTables = foreach ($pathInfo in $envConfig.source.tsFiles.pathsAndCopyTargets) {
   $path = $projectRootDir + $pathInfo.sourceRelativePath
   $foundTsFiles = Get-ChildItem -Path $path -Filter "*.ts" | Where-Object LastWriteTime -gt $lastSavedDate
   if ($null -ne $foundTsFiles) {
      $fileCount += $foundTsFiles.Length
      @{
         SrcRelPath = $pathInfo.sourceRelativePath
         CopyToDestination = $remoteRootDir + $pathInfo.copyTargetRelativePath
         FileList = $foundTsFiles
      }
   }
}
Write-Output ("TypeScript source files (.ts) found newer than last compile date: " + $fileCount + "`n")

# begin the tsc with tsconfig.json use
if ($tsconfigChanged -eq $true -or $fileCount -gt 0) {
   $COMPILE_COMMAND
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

#Check Subbed Files Array List, fix the name, and write over existing files
$SubbedFilesList.CopyAllSubbedFilesToTargets()

<# ====================== Post-Build Backup goes here =================== #>



Write-Output "`nScript completed.`n"
