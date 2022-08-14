function Get-ObjectProperty {
   [CmdletBinding()]
   param (
       [Parameter(Mandatory, ValueFromPipeline)]
       [PSObject]$PSObject,
       [string]$ObjectProperty
   )

   process {
      Write-Host "In Get-ObjectProperty:"
      Write-Host ("`$PSObject.`$ObjectProperty -is [array]: " + $PSObject.$ObjectProperty -is [array])
      Write-Host ("`$PSObject.`$ObjectProperty: " + $PSObject.$ObjectProperty -is [array])
      $PSObject.PSObject.Properties.Item($ObjectProperty) ? $PSObject.$ObjectProperty : $null
   }
}


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
      while ($null -ne ($anyMatches = $Variable | Select-String -Pattern "\$\{([^\)]+)\}" -AllMatches)) {
         foreach ($match in $anyMatches) {
            $key = $match.Matches[0].Groups[1].Value
            $value = $Dictionary[$key]
            if ($null -eq $value) {
               $value = $($key)  # Get value from global space
               if ($null -eq $value) {
                  throw "The variable '`${" + $key + "} was not found in " + `
                  "either the dictionary argument or the global variable scope. This is not allowed."
               }
            }
            $Variable = $Variable -replace ('\$\{' + $key + '\}'), $value
         }
      }
   }
   end {
      return $Variable
   }
}

function Check-NonexistentPath {
   [CmdletBinding()]
   [OutputType([boolean])]
   param (
      [string]$Path,
      [string]$PathType,
      [boolean]$CreateOption
   )
   if ($Path -eq $null -or $PathType -eq $null -or $CreateOption -eq $null) {
      throw "Check-NonexistentPath requires 3 arguments: [string]`$Path, [string]`$PathType, [boolean]`$CreateOption"
   }
   $AllowedPathTypes = "File", "Directory", "Folder"
   if (($AllowedPathTypes -contains $PathType) -eq $false) {
      throw "Check-NonexistentPath [string]`$PathType parameter with only " + $AllowedPathTypes + " as arguments"
   }
   if ($PathType -eq "Folder") {
      $PathType = "Directory"
   }
   if ($PathType -eq "File") {
      $testPathType = "Leaf"
   } else {
      $testPathType = "Container"
   }
   if ((Test-Path -Path $Path -PathType $testPathType) -eq $false) {
      if ($CreateOption -eq $true) {
         New-Item -Path $Path -ItemType $PathType
      } else {
         return $false
      }
   }
   return $true
}

function Show-UserPrompt {
   [CmdletBinding()]
   [OutputType([System.Void])]
   param (
      [string]$UserPrompt
   )
   Write-Host $UserPrompt
}

function Get-PromptedKeyPress {  # case sensitivity is not an issue
   [CmdletBinding()]
   [OutputType()]
   param (
      [string]$InitialPrompt,
      [string]$ErrorPrompt,
      [string[]]$AcceptableResponses
   )

   Show-UserPrompt $InitialPrompt
   $response = [Console]::ReadKey("NoEcho,IncludeKeyDown").Key.toString()
   $keyedin = $AcceptableResponses -contains $response
   while ($keyedin -eq $false) {
      Show-UserPrompt $ErrorPrompt
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
   [CmdletBinding()]
   [OutputType(
      [System.Void]
   )]
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
      $this.ConfigDictionary = $ConfigDictionary
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
         if ((Test-Path -Path $from) -eq $false) {
            throw ("The definition with From = '" + $from +  "' leads to an non-existent path/file. Re-check definitions.")
         }
         if ((Test-Path $to) -eq $false) {
            $response = Get-PromptedKeyPress `
               -InitialPrompt ("Copy destination '" + $to + "' does not exist as a target path`nShall the target path be created? (y/n)") `
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


class SubbedFileInfoList {
<# documentation for 'System.Collections.Generic.List<T> is at bottom of file #>
   [System.Collections.Generic.List[PSCustomObject]]$SubbedFilesList = [System.Collections.Generic.List[PSCustomObject]]::new()
   [System.Collections.Generic.List[PSCustomObject]]$UsedKeys = [System.Collections.Generic.List[PSCustomObject]]::new()
   [string]$SubbingString

   SubbedFileInfoList(
      [string]$SubbingString
   ) {
      $this.SubbingString = $SubbingString
   }

   SubbedFileInfoList() {
      $this.SubbingString = "(subbed)"
   }

   [int32]AddFileInfo(
      [string]$OriginalSourceFilePath,
      [string]$DestinationPath
   ) {
      $key = $null
      $filePathData = Get-Item $OriginalSourceFilePath | Select-Object *
      $subbedFileName = $filePathData.PSParentPath + "\" + $filePathData.BaseName + $this.SubbingString + $filePathData.Extension
      do {
         $key = Get-Random -Minimum 1000000
      } while ($this.UsedKeys.Contains($key) -eq $true)
      $this.UsedKeys.Add($key)

      $this.SubbedFilesList.Add(@{
         SourcePathFile = $OriginalSourceFilePath
         CopyTargetPath = $DestinationPath
         SubbedPathFile = $subbedFileName
         Key = $key
      })
      return $key
   }

   [boolean]CopySubbedFileToTarget(
      [string]$Key
   ) {
      foreach ($entry in $this.SubbedFilesList) {
         if ($entry.Key -eq $Key) {
            Copy-Item -Path $entry.SubbedPathFile -Destination $entry.CopyTargetPath
            return $?
         }
      }
      return $false
   }

   [boolean]CopyAllSubbedFilesToTargets() {
      foreach ($entry in $this.SubbedFilesList) {
         Copy-Item -Path $entry.SubbedPathFile -Destination $entry.CopyTargetPath
         if ($? -eq $false) {
            return $false
         } else {
            Write-Host ("'" + $entry.SubbedPathFile + "' copied to '" + $entry.CopyTargetPath + "'")
         }
      }
      return $true
   }

   [boolean]RemoveSubbedFile(
      [string]$Key
   ) {
      foreach ($entry in $this.SubbedFilesList) {
         if ($entry.Key -eq $Key) {
            Remove-Item -Path $entry.SubbedPathFile
            return $?
         }
      }
      return $false
   }

   [boolean]RemoveAllSubbedFiles() {
      foreach ($entry in $this.SubbedFilesList) {
         Remove-Item -Path $entry.SubbedPathFile
         if ($? -eq $false) {
            return $false
         } else {
            Write-Host ("'" + $entry.SubbedPathFile + "' deleted.")
         }
      }
      return $true
   }

   [PSCustomObject]GetFileInfo(
      [string]$Key
   ) {
      foreach ($entry in $this.SubbedFilesList) {
         if ($entry.Key -eq $Key) {
            return $entry
         }
      }
      return $null
   }

   [boolean]RemoveFileInfo(
      [string]$Key
   ) {
      $found = $false
      foreach ($entry in $this.SubbedFilesList) {
         if ($entry.Key -eq $Key) {
            break
         }
         if ($found -eq $true) {
            $this.SubbedFilesList.Remove($entry.$Key)
         } else {
            return $false
         }
      }
      return $true
   }

   [boolean]ReplaceFileInfo(
      [string]$Key,
      [string]$OriginalSourceFilePath,
      [string]$DestinationPath
   ) {
      $this.RemoveFileInfo($Key)
      return $this.AddFileInfo(
         $OriginalSourceFilePath,
         $DestinationPath
      )
   }

   [boolean]ClearFileInfo() {
      $this.SubbedFilesList = $null
      $this.SubbedFilesList = [System.Collections.Generic.List[PSCustomObject]]::new()
      return $true
   }
}

# Export-ModuleMember -Function Expand-Variable
# Export-ModuleMember -Function Get-PromptedKeyPress
# Export-ModuleMember -Function Update-ItemLastTimesToNow

<# -----------------------------------------------------------------------------
Constructors
   List<T>()
   Initializes a new instance of the List<T> class that is empty and has the default initial capacity.

   List<T>(IEnumerable<T>)
   Initializes a new instance of the List<T> class that contains elements copied from the specified collection and has sufficient capacity to accommodate the number of elements copied.

   List<T>(Int32)
   Initializes a new instance of the List<T> class that is empty and has the specified initial capacity.

Properties
   Capacity
   Gets or sets the total number of elements the internal data structure can hold without resizing.

   Count
   Gets the number of elements contained in the List<T>.

   Item[Int32]
   Gets or sets the element at the specified index.

Methods
   Add(T)
      Adds an object to the end of the List<T>.

   AddRange(IEnumerable<T>)
      Adds the elements of the specified collection to the end of the List<T>.

   AsReadOnly()
      Returns a read-only ReadOnlyCollection<T> wrapper for the current collection.

   BinarySearch(Int32, Int32, T, IComparer<T>)
      Searches a range of elements in the sorted List<T> for an element using the specified
      comparer and returns the zero-based index of the element.

   BinarySearch(T)
      Searches the entire sorted List<T> for an element using the default comparer and
      returns the zero-based index of the element.

   BinarySearch(T, IComparer<T>)
      Searches the entire sorted List<T> for an element using the specified comparer and
      returns the zero-based index of the element.

   Clear()
      Removes all elements from the List<T>.

   Contains(T)
      Determines whether an element is in the List<T>.

   ConvertAll<TOutput>(Converter<T,TOutput>)
      Converts the elements in the current List<T> to another type, and returns a list
      containing the converted elements.

   CopyTo(Int32, T[], Int32, Int32)
      Copies a range of elements from the List<T> to a compatible one-dimensional array,
      starting at the specified index of the target array.

   CopyTo(T[])
      Copies the entire List<T> to a compatible one-dimensional array, starting
      at the beginning of the target array.

   CopyTo(T[], Int32)
      Copies the entire List<T> to a compatible one-dimensional array, starting
      at the specified index of the target array.

   EnsureCapacity(Int32)
      Ensures that the capacity of this list is at least the specified capacity.
      If the current capacity is less than capacity, it is successively increased
      to twice the current capacity until it is at least the specified capacity.

   Equals(Object)
      Determines whether the specified object is equal to the current object.

   (Inherited from Object)
   Exists(Predicate<T>)
      Determines whether the List<T> contains elements that match the conditions
      defined by the specified predicate.

   Find(Predicate<T>)
      Searches for an element that matches the conditions defined by the specified
      predicate, and returns the first occurrence within the entire List<T>.

   FindAll(Predicate<T>)
      Retrieves all the elements that match the conditions defined by the specified predicate.

   FindIndex(Int32, Int32, Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the first occurrence within the range of elements
      in the List<T> that starts at the specified index and contains the specified number of elements.

   FindIndex(Int32, Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the first occurrence within the range of elements
      in the List<T> that extends from the specified index to the last element.

   FindIndex(Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the first occurrence within the entire List<T>.

   FindLast(Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the last occurrence within the entire List<T>.

   FindLastIndex(Int32, Int32, Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the last occurrence within the range of elements
      in the List<T> that contains the specified number of elements and ends at the specified index.

   FindLastIndex(Int32, Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the last occurrence within the range of elements
      in the List<T> that extends from the first element to the specified index.

   FindLastIndex(Predicate<T>)
      Searches for an element that matches the conditions defined by the specified predicate,
      and returns the zero-based index of the last occurrence within the entire List<T>.

   ForEach(Action<T>)
      Performs the specified action on each element of the List<T>.

   GetEnumerator()
      Returns an enumerator that iterates through the List<T>.

   GetHashCode()
      Serves as the default hash function.

   (Inherited from Object)
   GetRange(Int32, Int32)
      Creates a shallow copy of a range of elements in the source List<T>.

   GetType()
      Gets the Type of the current instance.

   (Inherited from Object)
   IndexOf(T)
      Searches for the specified object and returns the zero-based index of
      the first occurrence within the entire List<T>.

   IndexOf(T, Int32)
      Searches for the specified object and returns the zero-based index of
      the first occurrence within the range of elements in the List<T> that
      extends from the specified index to the last element.

   IndexOf(T, Int32, Int32)
      Searches for the specified object and returns the zero-based index of the
      first occurrence within the range of elements in the List<T> that starts
      at the specified index and contains the specified number of elements.

   Insert(Int32, T)
      Inserts an element into the List<T> at the specified index.

   InsertRange(Int32, IEnumerable<T>)
      Inserts the elements of a collection into the List<T> at the specified index.

   LastIndexOf(T)
      Searches for the specified object and returns the zero-based index of the
      last occurrence within the entire List<T>.

   LastIndexOf(T, Int32)
      Searches for the specified object and returns the zero-based index of the
      last occurrence within the range of elements in the List<T> that extends
      from the first element to the specified index.

   LastIndexOf(T, Int32, Int32)
      Searches for the specified object and returns the zero-based index of
      the last occurrence within the range of elements in the List<T> that
      contains the specified number of elements and ends at the specified index.

   MemberwiseClone()
      Creates a shallow copy of the current Object.

   (Inherited from Object)
   Remove(T)
      Removes the first occurrence of a specific object from the List<T>.

   RemoveAll(Predicate<T>)
      Removes all the elements that match the conditions defined by the specified predicate.

   RemoveAt(Int32)
      Removes the element at the specified index of the List<T>.

   RemoveRange(Int32, Int32)
      Removes a range of elements from the List<T>.

   Reverse()
      Reverses the order of the elements in the entire List<T>.

   Reverse(Int32, Int32)
      Reverses the order of the elements in the specified range.

   Sort()
      Sorts the elements in the entire List<T> using the default comparer.

   Sort(Comparison<T>)
      Sorts the elements in the entire List<T> using the specified Comparison<T>.

   Sort(IComparer<T>)
      Sorts the elements in the entire List<T> using the specified comparer.

   Sort(Int32, Int32, IComparer<T>)
      Sorts the elements in a range of elements in List<T> using the specified comparer.

   ToArray()
      Copies the elements of the List<T> to a new array.

   ToString()
      Returns a string that represents the current object.

   (Inherited from Object)
   TrimExcess()
      Sets the capacity to the actual number of elements in the List<T>, if
      that number is less than a threshold value.

   TrueForAll(Predicate<T>)
      Determines whether every element in the List<T> matches the conditions
      defined by the specified predicate.

-------------------------------------------------------------------------------- #>
