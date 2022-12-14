<!DOCTYPE html>
<html lang="en">

<head>
  <title>SP Tools</title>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/js/bootstrap.min.js"
      integrity="sha384-ODmDIVzN+pFdexxHEHFBQH3/9/vQ9uori45z4JjnFsRydbmQbmL5t1tQ0culUzyK"
      crossorigin="anonymous"></script>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css" integrity="sha384-gH2yIJqKdNHPEq0n4Mqa/HGKIhSkIHeL5AyhkYV8i59U5AR6csBvApHHNl/vI1Bx" crossorigin="anonymous">

  <script src="https://cdnjs.cloudflare.com/ajax/libs/bootbox.js/5.5.2/bootbox.min.js"></script>
  <!--
  <script src="https://cdnjs.cloudflare.com/ajax/libs/knockout/3.5.1/knockout-latest.js"
            integrity="sha512-2AL/VEauKkZqQU9BHgnv48OhXcJPx9vdzxN1JrKDVc4FPU/MEE/BZ6d9l0mP7VmvLsjtYwqiYQpDskK9dG8KBA=="
            crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  -->
  <script src="https://ajax.aspnetcdn.com/ajax/4.0/1/MicrosoftAjax.js"></script>
  <script src="/_layouts/15/sp.runtime.js"></script>
  <script src="/_layouts/15/sp.js"></script>

  <script src="./SPRESTGlobals.js"></script>
  <script src="./SPListREST.js"></script>
  <script src="./SPSiteREST.js"></script>
  <script src="./SPUserREST.js"></script>
  <script src="./SPRESTSupportLib.js"></script>

 <script src="./SPTools.js"></script>
  <script src="./SPOtherTools.js"></script>
 <!-- <script src="testing.js"></script> -->
  <script src="./REST%20Requesting.js"></script>
  <script src="./liblisting.js"></script>
  <link href="./RestRequesting.css" rel="stylesheet" />
  <link href="./liblisting.css" rel="stylesheet" />
  <link href="./SPTools.css" rel="stylesheet" />
</head>

<body>

  <div id="container">
    <p style="float:right;height:75px;margin:0;"><img
        src="Leap%20Tall%20Buildings%20In%20A%20Single%20Bound%20IT%20Solutions%20Logo%20compressed.png"
        alt="Leap Tall Buildings In A Single Bound logo" /></p>
    <p id="title">SharePoint (SP) Tools
      <span id="top-button-block">
        <button type="button" onclick="displayPage('restreq-container');">REST Requesting</button>
        <button type="button" onclick="displayPage('liblist-container');">Library Tools</button>
      </span>
    </p>
    <form id="SPToolsForm">
      <div id="menu-tabs">
        <span class="menu-button fff8ff" onclick="selectMenu(this);" id="server-button">Server</span>
        <span class="menu-button fffff8" onclick="selectMenu(this);" id="site-button">Site</span>
        <span class="menu-button f8f8ff" onclick="selectMenu(this);" id="list-button">List/Library</span>
        <span class="menu-button fff8f8" onclick="selectMenu(this);" id="user-button">User</span>
      </div>
      <div id="content-panel">

        <div id="server-panel">

          <p class="four-col-grid">
            <label for="serverName">URL:</label>
            <span>
              <input name="server-name" id="serverName" size="35" />
            </span>

            <label style="padding-left:1.5em;" for="sites-list">Sites on this server</label>
            <span>
              <select id="sites-list" size="3"></select>
            </span>

            <span style="grid-column:1 / span 4;">
              <label>Properties</label>
            </span>
            <span style="grid-column:2 / 4">
              <select name="server-properties" size="6" onchange="showValue('server', this);"></select>
            </span>
            <span style="justify-self:start;">
              <button type="button" onclick="expandProp(this, 'server');">Expand</button>
              <br />
              <span id="error-set">&nbsp;</span>
            </span>

            <span style="grid-column:1 / span 4;">
              <label for="PropertyValue">Property Value</label>
            </span>
            <span style="grid-column:2 / 4">
              <textarea name="property-value" id="PropertyValue" rows="4" style="min-width:80%;"></textarea>
              <input type="hidden" name="selectedProperty" />
            </span>

          </p>

        </div> <!-- id=server-panel -->
        <!--
                 SITE PANEL
-->
        <div id="site-panel">

          <div class="four-col-grid">
            <label for="siteName">URL:</label>
            <span>
              <input name="site-name" id="siteName" size="55" onchange="setSiteAsCurrent(this);" />
            </span>

            <label style="padding-left:1.5em;" for="sites-list">Subites to this site</label>
            <span style="display:grid;grid-template-columns: auto 1fr;column-gap:1em;">
              <select name="subsites-list" size="3"></select>
              <span>
                <button type="button" onclick="setSiteAsCurrent(this);">Set To Current</button>
              </span>
            </span>

            <label>Properties</label>
            <span style="display:grid;grid-template-columns: auto 1fr;column-gap:1em;">
              <select name="site-properties" size="6" onchange="showValue('site', this);"></select>
              <span>
                <button type="button" onclick="expandProp(this, 'site');">Expand</button>
                <br />
                <span id="site-error-set">&nbsp;</span>
              </span>
            </span>

            <label for="sitePropertyValue">Property Value</label>
            <span>
              <textarea name="site-property-value" id="sitePropertyValue" rows="4" cols="60"></textarea>
              <input type="hidden" name="selectedSiteProperty" />
            </span>

            <label>Content Types</label>
            <span style="display:grid;grid-template-columns: auto 1fr;column-gap:1em;">
              <select name="site-content-types" size="4" onchange="showValue('contentType', this);"></select>
            </span>
            <span style="display:block;text-align:right;">
              <label>Content Type Properties</label>
              <span id="copied-text">Copied</span>
            </span>
            <p class="two-col-grid">
              <label class="inner-label" for="contTypeId">Content Type ID</label>
              <input onfocus="makeCopy(this);" class="prop-value" name="cont-type-id" id="contTypeId"/>

              <label class="inner-label" for="contTypeGroup">Group</label>
              <input onfocus="makeCopy(this);" class="prop-value" name="cont-type-group" id="contTypeGroup"/>

              <label class="inner-label" for="contTypeParent">Parent (+ID)</label>
              <input onfocus="makeCopy(this);" class="prop-value" name="cont-type-parent" id="contTypeParent" />

              <span style="grid-column: 1 / span 2;">
                <label class="inner-label" for="contTypeReadonly">Read Only</label>
                <input type="checkbox" disabled name="cont-type-readonly" id="contTypeReadonly"/>

                <label class="inner-label" for="contTypeSealed">Sealed</label>
                <input type="checkbox" disabled name="cont-type-sealed" id="contTypeSealed"/>

                <span style="display:inline-block;text-align:right;font:normal 83% Arial,sans-serif;">
                  Click inside an input box to automatically copy the text
                </span>
              </span>

            </p>

            <label>Lists for this site</label>
            <span style="display:grid;grid-template-columns: auto 1fr;column-gap:1em;">
              <select name="site-lists" size="4"></select>
              <span>
                <button type="button" onclick="selectListFromSiteTab(this.form);">Go To List</button>
              </span>
            </span>

          </div>
        </div> <!-- id=site-panel -->

        <!--
                 LIST PANEL
-->
        <div id="list-panel">
          <div class="four-col-grid">
            <label style="grid-row:1 / span 2;" for="siteLists2">Site lists</label>
            <select style="grid-row: 1 / span 2;" name="site-lists2" id="siteLists2" size="4"
              onchange="selectListFromSiteTab(this)"></select>

            <div style="grid-column:3 / span 2;width:100%;">
              <span style="float:right;font:normal 9pt 'Arial Narrow',sans-serifl">
                <input type="checkbox" name="xcludeBaseTypes" style="margin-left:1em;"
                  onchange="updateXcludeBaseTypes(this.checked);" />Exclude Base Types
            </span>
              <label for="fields-list">Fields (Columns)</label>
              <select id="fields-list" size="4" onchange="updateListTables('fields-select', this);">
                <option>Select a list to populate fields</option>
              </select>

              <div class="tableFixHead" style="grid-column: 1/ span 2;">
                <table id="fields-table">
                  <thead>
                    <tr>
                      <th>Field Property</th>
                      <th>Field Property Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colspan="2">Select a list to build table of field properties</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <hr />
          <div class="tableFixHead" style="grid-column: 1/ span 2;">
            <table id="list-props-table">
              <thead>
                <tr>
                  <th>List Property</th>
                  <th>List Property Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="2">Select a list to build table of a list's properties</td>
                </tr>
              </tbody>
            </table>
          </div>
          <hr />
          <div style="display:grid;grid-template-columns:auto auto auto 1fr;">
            <p id="dials" style="grid-column:1 / span 3">
              <label>Item Count</label> <span id="list-item-count" class="bordered-span">&nbsp;</span>
              <label>Start ID</label> <span id="list-item-start-id" class="bordered-span">&nbsp;</span>
              <label>End ID</label> <span id="list-item-end-id" class="bordered-span">&nbsp;</span>
            </p>
            <span>
              <label for="currentId">Select Id:</label>
              <button type="button" onclick="fetchListItemId(this, 'nextdown')"><img
                  src="../Site%20Images/left%20arrowhead.png" style="width:20px;" alt="decrease" /></button>
              <input name="currentId" id="currentId" onchange="fetchListItemId(this, this.value)" size="5"
                style="text-align:center;" />
              <button type="button" onclick="fetchListItemId(this, 'nextup')"><img
                  src="../Site%20Images/right%20arrowhead.png" style="width:20px;" alt="increase" /></button>
            </span>

            <p style="grid-column:1 / span 4">
              <span id="list-error">&nbsp;</span>
            </p>

            <div class="tableFixHead" style="grid-column: 1/ span 4;">
              <table id="items-table">
                <thead>
                  <tr>
                    <th>Item Column</th>
                    <th>Item Column Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="2">Select a list to build table of item metadata</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <fieldset>
            <legend>Copy List/Library</legend>
            <span style="margin: auto 0.5em;text-align:right;">
              <button type="button" onclick="copylist(this);">Copy</button></span>
            <span>
              <label for="newCopyName">Dest list/lib name:</label><input name="newCopyName" id="newCopyName" size="35" />
              <br /><label for="itemsToCopy"># items:</label><input name="itemsToCopy" id="itemsToCopy" size="4" />
            </span>
            <div>
              <!-- Setting columns for copy list/library -->
              <p id="field-selector"></p>
              <table id="selections">
                <thead>
                  <tr>
                    <th>Selected</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody></tbody>
              </table>
            </div>
          </fieldset>
        </div> <!-- id=list-panel -->

        <div id="user-panel">
          <select id="site-users"></select>
        </div> <!-- id=user-panel -->
      </div> <!-- content-panel -->
    </form> <!-- id=main-form -->
  </div> <!-- id=container -->

  <!-- =================================================
         REST REQUESTING PAGE
===================================================== -->

  <div id="restreq-container">
    <form id="REST-Requesting-form">
      <p style="margin-top:-2em;"><button type="button" onclick="_displayPage('container');">Home</button></p>
      <!-- Start HTML Form Web Part -->
      <div id="main-grid">
        <span></span> <!-- necessary for grid -->
        <fieldset style="border:none;padding:0;margin:0;">
          <span style="float:right;">
            <button type="button" onclick="formatDate(this.form);">Format date</button>:
            <input name="dateformat" size="30" />
            <button id="request-button" type="button" onclick="sendRequest(this.form);">Request</button>
          </span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="GET"
              checked /> GET</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="POST" />
            POST</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="PUT" />
            PUT</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="PATCH" />
            PATCH</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="DELETE" />
            DELETE</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="HEAD" />
            HEAD</span>
          <span class="radio-control"><input type="radio" name="method" onchange="setupMethod(this);" value="OPTIONS" />
            OPTIONS</span>
        </fieldset>

        <label for="request-url">URL:</label> <input size="120" id="request-url" name="url" data-lpignore="true" value="https://" />
        <label for="ODataSelect">select:</label> <input size="120" name="ODataSelect" id="ODataSelect" data-lpignore="true" />
        <label for="ODataFilter">filter:</label> <input size="120" name="ODataFilter" id="ODataFilter" data-lpignore="true" />
        <label>expand:</label>
        <p style="margin:0;padding:0;display:inline;">
          <input id="expand-input" name="ODataExpand" style="width:100%;" data-lpignore="true" />
          <span id="headermenu">Header:
            <button type="button" onclick="hideHeaderSet();">Hide</button>
            <button type="button" onclick="addHeader(this);">Add</button>
          </span>

        </p>
        <label>Headers:</label>
        <span id="showheaders">
          <button type="button" onclick="showHeaderSet();">Show headers and special settings</button>
        </span>
        <div id="special-sets">
          <p id="settings">
            <input type="checkbox" class="restreq" name="xdigest" onchange="setupXDigest(this);" /> Include Form Request
            Digest
            <br /><span id="header-count-display">&nbsp;</span>
          </p>
          <p id="headers">
            <input type="hidden" name="headerCount" value="2" />
            <span class="headerset">
              <input class="hname" name="header-1-name" value="Content-type" /> :
              <input class="hvalue" name="header-1-value" value="applicationon;odata=verbose" /><button type="button"
                class="trash-button" onclick="deleteHeader('header-1', this);">&#x1f5d1;</button>
            </span>
            <span class="headerset">
              <input class="hname" name="header-2-name" value="Accept" /> :
              <input class="hvalue" name="header-2-value" value="applicationon;odata=verbose" /><button type="button"
                class="trash-button" onclick="deleteHeader('header-2', this);">&#x1f5d1;</button>
            </span>
          </p>

        </div>
        <label>Body:</label>
        <textarea rows="6" cols="120" name="body"></textarea>
        <label>Previous:</label>
        <select id="previousRequest" onchange="fillPrevious(this);" size="5"></select>

        <div style="margin:0;grid-column:1 / span 2;">
          <p style="margin:0;float:right;width:40em;">
            <label>Response Date/Time:</label> <span id="response-datetime">&nbsp;</span>
          </p>
          <label>HTTP status:</label> <span id="http-status">&nbsp;</span>
          <br /><label>Constructed URL:</label> <span id="sent-url">&nbsp;</span>
        </div>
        <label style="margin-right:0.5em;">Response:</label>
        <textarea rows="6" cols="120" name="response"></textarea>
        <label style="margin-right:0.5em;">Object:</label>
        <div id="object-area"></div>
      </div> <!-- id=main grid -->
      <!-- end aspx web part -->
    </form>
  </div> <!-- id=restreq-container -->

  <!-- =================================================
        LIBRARY LISTING PAGE
===================================================== -->
  <div id="liblist-container">
      <!--
      <p style="float:right;" id="custom-listing-genurl">
      <input name="generatedUrl" onblur="this.style.display = 'none';"
          style="font:normal 10pt 'Arial Narrow',sans-serif;" size="125" />
      <button type="button" onclick="generateURL('liblisting');">Generate URL from Settings</button>
    </p>
  -->
    <div>
      <span style="display:inline-block;margin-left:3em;"><button type="button" onclick="displayPage('container');">Home</button></span>
      <span id="ll-title">Library Listing</span>
      <span id="working" style="display:none;margin-left:100px;">
        <img src="../Site%20Images/processing.gif" alt="working" style="width:100px" />
        Working
      </span>
      <p style="display:inline-block;margin-left:10em;">
      <span>Records read/processed: </span>
      <span id="processed-count" style="font:bold 120% Tahoma,sans-serif;color:navy;">&nbsp;</span>
      <span> of </span>
      <span id="total-listing-count" style="font:bold 110% Tahoma,sans-serif;color:maroon;"></span>
      </p>
    </div>
    <script>
      function showLibForm(inputObj) {
        inputObj.parentNode.style.display = "none";
        LibListingForm.style.display = "block";
      }
    </script>
    <p id="show-libform" style="display:none;"><button onclick="showLibForm(this);">Show Form</button></p>
    <form id="LibListingForm">
    <div id="request-controls">
      <p class="request-control">
        <span>
          <button type="button" onclick="customListing();">Custom listing</button>
        </span>
        <span class="sub-control"></span>
      </p>
      <hr />
      <p class="request-control">
      <span><button type="button" onclick="listingControl('duplicatelisting', this.form);">List library duplicates</button> </span>
      <span><button type="button" onclick="listingControl('listFoldersAndFiles', this.form);">List Folders with Their Files</button> </span>
      <span class="sub-control">
        <span class="input-control">Site:<br /><input name="SiteNameDuplicates" size="60"
          onchange="localStorage.setItem('sitenamedups', this.value);" /></span>
        <span class="input-control">Libary Name:<br /><input name="LibraryNameDuplicates" size="25"
          onchange="localStorage.setItem('libnamedups', this.value);" /></span>
      </span>
      <span>
        <button type="button" onclick="generateURL('dupOrFolderFiles');">Generate URL from Settings</button><br />
        <input type="radio" onchange="this.form.duplicatesGenUrl.value='';" name="dupOrFolderFiles" value="dups" /> for duplicate files
        <input type="radio" onchange="this.form.duplicatesGenUrl.value='';" name="dupOrFolderFiles" value="folderfiles" /> for folders with files
        <textarea name="duplicatesGenUrl" rows="4" cols="80"
            style="font:normal 10pt 'Arial Narrow',sans-serif;" ></textarea>
      </span>
      </p>
    <hr />
      <p class="request-control"><span>
        <button type="button" onclick="listingControl('makelibcopy', this.form);">Copy a list</button> </span>
        <span class="sub-control">
          <span class="input-control">Site of source:<br /><input name="SourceSiteCopy" size="60"
            onchange="localStorage.setItem('sourcesitecopy', this.value);" /></span>
          <span class="input-control">Name of source:<br /><input name="SourceNameCopy" size="25"
            onchange="localStorage.setItem('sourcenamecopy', this.value);" /></span>
          <span class="input-control">Site of destination:<br /><input name="DestSiteCopy" size="60"
            onchange="localStorage.setItem('destsitecopy', this.value);" /></span>
          <span class="input-control">Name of destination:<br /><input name="DestNameCopy" size="25"
            onchange="localStorage.setItem('destnamecopy', this.value);" /></span>
        </span>
        <span>
          <button type="button" onclick="generateURL('copylib');">Generate URL from Settings</button><br />
          <textarea name="copyingGenUrl" rows="4" cols="80"
              style="font:normal 10pt 'Arial Narrow',sans-serif;" ></textarea>
        </span>
      </p>
    <hr />
      <p class="request-control"><span>
        <button type="button" onclick="listingControl('findfilediff', this.form);">Check file differences</button> </span>
        <span class="sub-control">
          <span class="input-control">Site of library 1:<br /><input name="Lib1SitePath" size="60"
              onchange="localStorage.setItem('lib1sitepath', this.value);" /></span>
          <span class="input-control">Name of library 1:<br /><input name="Lib1Name" size="25"
            onchange="localStorage.setItem('lib1name', this.value);" /></span>
          <span class="input-control">Site of library 2:<br /><input name="Lib2SitePath" size="60"
            onchange="localStorage.setItem('lib2sitepath', this.value);" /></span>
          <span class="input-control">Name of library 2:<br /><input name="Lib2Name" size="25"
            onchange="localStorage.setItem('lib2name', this.value);" /></span>
        </span>
        <span>
          <button type="button" onclick="generateURL('filediff');">Generate URL from Settings</button><br />
          <textarea name="filediffGenUrl" rows="4" cols="80"
              style="font:normal 10pt 'Arial Narrow',sans-serif;" ></textarea>
       </span>
      </p>
      </div>
  <!-- undisplayed part -->
    <div id="custom-listing" style="display:none;">
      <label>Site URL path: <input name="clistingSiteUrl" size="80"
          onchange="localStorage.setItem('clistingsiteurl', this.value);" /></label>
      <label>List/Library name: <input name="clistingListName" size="25"
        onchange="localStorage.setItem('clistinglistname', this.value);" /></label>
      <div> <!-- options panel -->
        <button type="button" onclick="listingControl(null, this.form);">Update Listing</button>
        <span class="option-input">
          <input type="checkbox" name="rowNumbering"
              onchange="this.checked == true ? ListingOptions |= ROW_NUMBERING : ListingOptions &= ~ROW_NUMBERING ;" /> Include row numbering
        </span>
        <span class="option-input">
          <input type="checkbox" name="listFilesOnly"
              onchange="this.checked == true ? ListingOptions |= LIST_FILES_ONLY : ListingOptions &= ~LIST_FILES_ONLY;" /> List files only
        </span>
        <span class="option-input">
          <input type="checkbox" name="includeId"
              onchange="this.checked == true ? ListingOptions |= INCLUDE_ID_IN_LISTING : ListingOptions &= ~INCLUDE_ID_IN_LISTING;" /> Include ID in listing
        </span>
        <span class="option-input">
          <input type="checkbox" name="sortById"
              onchange="this.checked == true ? ListingOptions |= SORT_LISTING_BY_ID : ListingOptions &= ~SORT_LISTING_BY_ID;" /> Sort listing by ID
        </span>
        <span class="option-input">
          <input type="checkbox" name="versioning"
              onchange="this.checked == true ? ListingOptions |= VERSIONING : ListingOptions &= ~VERSIONING;" /> Show versioning data
        </span>
      </div>
      <fieldset id="date-control">
        <p id="date-error" style="grid-column:1 / span 4;display:none;color:red;font:normal 10pt Arial,sans-serif;">
          Date search missing settings: select created or modified, before or after,
          then the date
        </p>
        <p>
          <input type="radio" name="displaytype" id="created" value="created" onchange="clearErrors();" /><label
            for="created">Display files created:</label> <br />
          <input type="radio" name="displaytype" id="modified" value="modified" onchange="clearErrors();" /><label
            for="modified">Display files modified:</label>
        </p>
        <p>
          <input type="radio" name="datecutoff" id="before" value="before" onchange="clearErrors();" /><label
            for="before">before and on</label> <br />
          <input type="radio" name="datecutoff" id="after" value="after" onchange="clearErrors();" /><label
            for="after">on and after</label>
        </p>
        <p>
          <input type="date" name="date" />
        </p>
        <p>
          <button type="button" onclick="this.form.reset();">Clear</button>
        </p>
      </fieldset>
      <div id="html-table"></div>
    </div>
    </form>
  </div> <!-- id=liblist-container -->
<script>
  LibListingForm = document.getElementById("LibListingForm");
  LibListingForm.Lib1SitePath.value = localStorage.getItem('lib1sitepath');
  LibListingForm.Lib1Name.value = localStorage.getItem('lib1name');
  LibListingForm.Lib2SitePath.value = localStorage.getItem('lib2sitepath');
  LibListingForm.Lib2Name.value = localStorage.getItem('lib2name');
  LibListingForm.SourceSiteCopy.value = localStorage.getItem('sourcesitecopy');
  LibListingForm.SourceNameCopy.value = localStorage.getItem('sourcenamecopy');
  LibListingForm.DestSiteCopy.value = localStorage.getItem('destsitecopy');
  LibListingForm.DestNameCopy.value = localStorage.getItem('destnamecopy');
  LibListingForm.SiteNameDuplicates.value = localStorage.getItem('sitenamedups');
  LibListingForm.LibraryNameDuplicates.value = localStorage.getItem('libnamedups');
</script>
</body>
</html>