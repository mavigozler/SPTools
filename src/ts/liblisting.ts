"use strict";

const SERVER_NAME = location.origin,
    SITE_NAME = "/teams/swp-dom/RSO/CPR",
    apiPrefix = SERVER_NAME + SITE_NAME + "/_api",

	VERSIONING = 0x0001,
	LIST_FILES_ONLY = 0x0002,
	INCLUDE_ID_IN_LISTING = 0x0004,
	SORT_LISTING_BY_ID = 0x0008,
	ROW_NUMBERING = 0x0010;

let theForm: HTMLFormElement,
    SiteUrl: string,
	 ListingOptions: number = 0x0000;

type libItem = {
   id: number;
   name: string;
   type: 0 | 1; // 0 = file, 1 = folder
//   folderPath: string;
   originalUrl: string;
   relativeUrl: string;
   size: number;
   created: Date;
   modified: Date;
   tag: "o" | "c" | string;
}

type libItemEx = libItem & {
   itsFiles: libItem[];
   itsFolders: libItem[];
}

type TListingOptions = {
	versioning?: boolean;
	rowNumbering?: boolean;
	dateSetStatus?: boolean;
	dateType?: "created" | "modified";
	dateBorder?: "before" | "after";
	date?: Date;
	listFilesOnly?: boolean;
	includeId?: boolean;
	sortListingByID?: boolean;
};

type TProcessedFile = {
	id: number;
	itemName: string;
	serverRelativeUrl: string; // SERVER + [[[  SITE + LIB NAME + FOLDER PATH + FILE NAME ]]]
	folderPath: string; // SERVER + SITE + LIB NAME + [[[ FOLDER PATH ]]]
	size: number;
	authorName: string;
	created: Date;
	editorName: string;
	modified: Date;
	versions?: {
		Url: string;
		IsCurrentVersion: string;
		ID: number;
		Size: string;
		Created: string;
		Modified: string;
	}[];
};

type TProcessedFolder = {
	id: number;
	name: string;
	path: string;  // SERVER + [[[ SITE + LIB NAME + FOLDER PATH including FOLDER itself  ]]]
	itemCount: number;
	foldersCount: number;
	files: TProcessedFile[];
};


function simplifyFileSize(size: number): string | undefined {
	if (size > 1024 * 1024)
		return (size / (1024 * 1024)).toFixed(0).toString() + " MB";
	else if (size > 1024)
   	return (size / 1024).toFixed(0).toString() + " KB";
}

function listingOp(
	which: string | URLSearchParams,
	theForm: HTMLFormElement
): void {
	let siteREST: SPSiteREST,
			value: string | null,
         listingFunc: string | null = null,
         queryParts: URLSearchParams | null = null,
         insertionPoint: HTMLDivElement,
         parentNode: HTMLElement = theForm.parentNode! as HTMLElement,
			options: TListingOptions = {},
			dpage: string | null;

   if (typeof which == "string")
      listingFunc = which as unknown as string;
   else { // this is button click and not URL sending
      queryParts = which as unknown as URLSearchParams;
      listingFunc = queryParts.get("listingfunc") || queryParts.get("listingFunc");
      if (listingFunc == null)
         return alert("The use of a URL to invoke functionality requires that 'listingfunc' name be set with a valid value");
      if ((value = queryParts.get("displaypage")) != null)
         displayPage(value);
   }

   insertionPoint = parentNode.appendChild(document.createElement("div"));
	switch (listingFunc.toLowerCase()) {
   case "findfilediff":
      if (queryParts)
         findFileDifferences(
            queryParts.get("lib1sitepath") as string,
            queryParts.get("lib1name") as string,
            queryParts.get("lib2sitepath") as string,
            queryParts.get("lib2name") as string,
            insertionPoint
         );
      else
         findFileDifferences(
            theForm.Lib1SitePath.value,
            theForm.Lib1Name.value,
            theForm.Lib2SitePath.value,
            theForm.Lib2Name,
            insertionPoint
         );
      break;
   case "duplicatelisting":
      if (queryParts) {
         theForm.SiteNameDuplicates.value =  queryParts.get("sitenamedups");
         theForm.LibraryNameDuplicates.value = queryParts.get("libnamedups");
         if (duplicateListing(
            theForm.SiteNameDuplicates.value,
            theForm.LibraryNameDuplicates.value,
            insertionPoint
         ) == false)
            return alert("To use duplicate listing function, the query string must be of the form " +
                  "'?callfunc=DuplicateListing&siteURL=<site-url>&libName=<lib-name>&displaypage=liblist-container'");
      } else {
         if (duplicateListing(
            theForm.SiteNameDuplicates.value,
            theForm.LibraryNameDuplicates.value,
            insertionPoint
         ) == false)
            return alert("To use duplicate listing function, the query string must be of the form " +
                  "'?callfunc=DuplicateListing&siteURL=<site-url>&libName=<lib-name>&displaypage=liblist-container'");
      }
      break;
	case "makelibcopy":
      if (queryParts) {
         if (queryParts.get("server") == null || queryParts.get("site") == null ||
                  queryParts.get("sourceLib") == null || queryParts.get("destLib") == null)
            return alert("To use copy library function, the query string must be of the form:\n\n" +
                  "'?listingfunc=makelibcopy&\n" +
                  "sourcesitecopy=<source-site-url>&\n"  +
                  "sourcenamecopy=<source-list-name>&\n" +
                  "destsitecopy=<dest-site-url>&\n" +
                  "destnamecopy<dest-list-name>'");
         siteREST = new SPSiteREST({
            server: SERVER_NAME,
            site: SITE_NAME!
         });
         siteREST.init().then(() => {
            siteREST.makeLibCopyWithItems(
               queryParts!.get("sourceLib") as string,
               queryParts!.get("destSite") as string,
               queryParts!.get("destLib") as string
            ).then((response) => {
               alert("Success: " + response);
            }).catch((response) => {
               alert("Failure: " + response);
            });
         }).catch((response) => {
            alert("Failure to initialize" + response);
         });
      } else {

      }
		break;
   case "listfoldersandfiles":
      if (queryParts) {
         theForm.SiteNameDuplicates.value =  queryParts.get("siteurl");
         theForm.LibraryNameDuplicates.value = queryParts.get("libname");
         listFoldersAndFiles(
            theForm.SiteNameDuplicates.value,
            theForm.LibraryNameDuplicates.value,
            insertionPoint
         );
      }
      break;
   case "speciallisting":
      if (queryParts) {
         specialListing(
            queryParts.get("siteurl")!,
            queryParts.get("libname")!,
            insertionPoint
         );
      }
      break;
   }
}

function generateURL(which: string): void {
	// location.href + query part
   let queryPos = location.href.lastIndexOf("?"),
      noQueryLocation: string = queryPos > 0 ? location.href.substring(0, queryPos) : location.href;
   switch (which) {
   case "dupOrFolderFiles":
      if (theForm.dupOrFolderFiles.value == "dups")
         theForm.duplicatesGenUrl.value = noQueryLocation + "?listingfunc=duplicateListing&sitenamedups=" +
               encodeURIComponent(theForm.SiteNameDuplicates.value) +
               "&libnamedups=" + encodeURIComponent(theForm.LibraryNameDuplicates.value) +
               "&displaypage=liblist-container";
      else if (theForm.dupOrFolderFiles.value == "folderfiles")
         theForm.duplicatesGenUrl.value = noQueryLocation + "?listingfunc=listFoldersAndFiles&siteurl=" +
               encodeURIComponent(theForm.SiteNameDuplicates.value) +
               "&libname=" + encodeURIComponent(theForm.LibraryNameDuplicates.value) +
               "&displaypage=liblist-container";
      break;
   case "copylib":
      theForm.copyingGenUrl.value = noQueryLocation + "?listingfunc=makelibcopy&sourcesitecopy=" +
            encodeURIComponent(theForm.SourceSiteCopy.value) +
            "&sourcenamecopy=" + encodeURIComponent(theForm.SourceSiteCopy.value) +
            "&destsitecopy=" + encodeURIComponent(theForm.DestSiteCopy.value) +
            "&destnamecopy=" + encodeURIComponent(theForm.DestNameCopy.value) +
            "&displaypage=liblist-container";
      break;
   case "filediff":
      theForm.filediffGenUrl.value = noQueryLocation + "?listingfunc=findfilediff&lib1sitepath=" +
            encodeURIComponent(theForm.Lib1SitePath.value) +
            "&lib1name=" + encodeURIComponent(theForm.Lib1Name.value) +
            "&lib2sitepath=" + encodeURIComponent(theForm.Lib2SitePath.value) +
            "&lib2name=" + encodeURIComponent(theForm.Lib2Name.value) +
            "&displaypage=liblist-container";
      break;
   case "liblisting":
      theForm.generatedUrl.value = noQueryLocation +
            "?listingfunc=customlisting&csiteurl=" + encodeURIComponent(theForm.clistingSiteUrl.value) +
            "&clibname=" + encodeURIComponent(theForm.clistingListName.value) +
            ((theForm.date.valueAsDate != null) ? ("&date=".concat(theForm.date.valueAsDate.toISOString())) : "") +
            ((theForm.displaytype.value != "") ? ("&dateType=".concat(theForm.displaytype.value)) : "") +
            ((theForm.datecutoff.value != "") ? ("&dateBorder=".concat(theForm.datecutoff.value)) : "") +
            (theForm.versioning.checked == true ? "&versioning=true" : "") +
            (theForm.listFilesOnly.checked == true ? "&listFilesOnly=true" : "") +
            (theForm.includeId.checked == true ? "&includeId=true" : "");
      theForm.generatedUrl.style.display = "inline";
      break;
   }
}

function duplicateListing(
   siteName: string,
   libName: string,
   insertionPoint: HTMLDivElement
): boolean {
   let select: string = "Id,FileSystemObjectType,File/Name,File/ServerRelativeUrl,File/Length,Folder/Name,Folder/ServerRelativeUrl,Created,Modified",
         expand: string = "File,Folder",
         leadingPath: RegExpMatchArray | null | string;

	if (siteName.length == 0)
		return false;
   if ((leadingPath = siteName.match(/https:\/\/[^\/]+(\/.*)$/)) == null)
      return false;
   leadingPath = leadingPath[1] as string;

   document.getElementById("working")!.style.display = "inline-block";
   RESTrequest({
      url: siteName + "/_api/web/lists/getByTitle('" + libName + "')/items" +
          "?$select=" + select + "&$expand=" + expand,
      method: "GET",
      headers: {
          "Accept": "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
      },
      successCallback: (data: any /*, text, reqObj */) => {
         let files: libItem[] = [],
            folders: libItem[] = [],
            start: number,
            relUrl: string,
            dupFiles: libItem[] = [],
            dupFolders: libItem[] = [],
            duping: boolean = false,
            libParts: RegExpMatchArray,
 //           libPart: string,
            pElem: HTMLParagraphElement,
            sElem: HTMLSpanElement;

         // compute the start index
         libParts = data[0].File.ServerRelativeUrl.match(leadingPath);
//         libPart = libParts[0] + libParts.input!.substring(
//               libParts[0].length,
//               libParts[0].length + 1 + libParts.input!.substring(libParts[0].length + 1).search(/\//)
//            );
         start = siteName.length - siteName.match(/(https:\/\/[^\/]+)\//)![1].length;
         if ((relUrl = data[0].File.ServerRelativeUrl) == null)
            relUrl = data[0].Folder.ServerRelativeUrl;
         start += relUrl.substring(start).match(/(\/[^\/]+)/)![1].length;
         for (let datum of data)
            if (datum.FileSystemObjectType == 0)
               files.push({
                  id: datum.Id,
                  name: datum.File.Name,
                  type: 0,
                  originalUrl: datum.File.ServerRelativeUrl,
                  relativeUrl: datum.File.ServerRelativeUrl.substr(start,
                           datum.File.ServerRelativeUrl.length - start - datum.File.Name.length),
   //               folderPath: datum.File.ServerRelativeUrl.substring(libPart.length, datum.File.ServerRelativeUrl.lastIndexOf("/") + 1),
                  size: datum.File.Length,
                  created: datum.Created,
                  modified: datum.Modified,
                  tag: ""
               });
            else
               folders.push({
                  id: datum.Id,
                  name: datum.Folder.Name,
                  type: 1,
                  originalUrl: datum.Folder.ServerRelativeUrl,
                  relativeUrl: datum.Folder.ServerRelativeUrl.substr(start,
                           datum.Folder.ServerRelativeUrl.length - start - datum.Folder.Name.length),
    //              folderPath: datum.Folder.ServerRelativeUrl.substring(libPart.length, datum.Folder.ServerRelativeUrl.lastIndexOf("/") + 1),
                  size: -1,
                  created: datum.Created,
                  modified: datum.Modified,
                  tag: ""
               });

         files.sort((a: any, b: any) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
         });

         for (let i = 0; i < files.length - 1; i++)
            if (files[i].name == files[i + 1].name) {
               dupFiles.push(files[i]);
               duping = true;
            } else if (duping == true) {
               dupFiles.push(files[i]);
               duping = false;
            }

         makeTable({
            title: "Replicate File Names in " + libName,
            subtitle: "(Site: " + siteName + ")",
            headers: [ "ID", "File Name", "Folder Path", "Size", "Created", "Modified" ],
            display: [
               () => { return "$$id" },
               () => { return "$$name" },
               () => { return "$$folderPath" },
               () => { return "$$size" },
               (item) => { return new Date(item.created).toLocaleDateString() },
               (item) => { return new Date(item.modified).toLocaleDateString() },
               ],
            data: dupFiles,
            attach: insertionPoint,
            options: ["addCounter{1}"]
         });

         folders.sort((a: any, b: any) => {
            return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
         });

         for (let i = 0; i < folders.length - 1; i++)
            if (folders[i].name == folders[i + 1].name) {
               dupFolders.push(folders[i]);
               duping = true;
            } else if (duping == true) {
               dupFolders.push(folders[i]);
               duping = false;
            }

         makeTable({
            title: "Replicate Folder Names in " + libName,
            subtitle: "(Site: " + siteName + ")",
            headers: [ "ID", "Folder Name", "Folder Path", "Created", "Modified" ],
            display: [
               () => { return "$$id" },
               () => { return "$$name" },
               () => { return "$$folderPath" },
               (item) => { return new Date(item.created).toLocaleDateString() },
               (item) => { return new Date(item.modified).toLocaleDateString() },
               ],
            data: dupFolders,
            attach: insertionPoint,
            options: ["addCounter{1}"]
         });
         document.getElementById("working")!.style.display = "none";
      },
      errorCallback: (reqObj) => {
         alert("Error on library request:\n\n" +
            JSON.stringify(reqObj, null, "  "));
      }
   });
   return true;  // only applies to validity of arguments
}

function errorInput(message: string): void {
   alert(message);
}

function copyLibrary() {
    let srcSiteREST: SPSiteREST, destSiteREST: SPSiteREST;

    if (theForm.SourceSiteCopy.value.length == 0)
        return errorInput("Missing valid path URL to site for source library to be copied");
    if (theForm.SourceNameCopy.value.length == 0)
        return errorInput("Missing valid name for source library to be copied");
    if (theForm.DestSiteCopy.value.length == 0)
        return errorInput("Missing valid path URL to site for destination library for copy");
    if (theForm.DestNameCopy.value.length == 0)
        return errorInput("Missing valid name for destination library for copy");
    srcSiteREST = new SPSiteREST({
        server: ParseSPUrl(location.origin)!.server,
        site: theForm.SourceSiteCopy.value
     });
    if (srcSiteREST == null)
        return errorInput("Problem with information on the source site. Check your entries");
    srcSiteREST.init().then(() => {
        srcSiteREST.makeLibCopyWithItems(
           theForm.SourceNameCopy.value,
           theForm.DestSiteCopy.value,
           theForm.DestNameCopy.value
        ).then((response) => {
           alert("Success: " + response);
        }).catch((response) => {
           alert("Failure: " + response);
        });
    }).catch((response) => {
        alert("Failure to initialize" + response);
    });
}

function findFileDifferences(
   lib1SitePath: string,
   lib1Name: string,
   lib2SitePath: string,
   lib2Name: string,
   insertionPoint: HTMLDivElement
) {   // compares the O&PEvidence original and copy libraries for file differences
    let missingFiles: libItem[]  = [],
        commonFiles: libItem[] = [],
        missingFolders: libItem[] = [],
        commonFolders: libItem[] = [],
        selectExpr: string = "Id,FileSystemObjectType,File/Name,File/Length,File/TimeCreated,File/TimeLastModified,File/ServerRelativeUrl," +
                  "Folder/Name,Folder/TimeCreated,Folder/TimeLastModified,Folder/ServerRelativeUrl,Created,Modified," +
                  "ParentList/ItemCount,ParentList/Title",
        expandExpr: string = "File,Folder,ParentList",
        lib1ItemCount: number,
        lib2ItemCount: number;

    if (lib1SitePath.length == 0)
        return errorInput("Missing valid path URL to site for library 1");
    if (lib1Name.length == 0)
        return errorInput("Missing valid name for library 1");
    if (lib2SitePath.length == 0)
        return errorInput("Missing valid path URL to site for library 2");
    if (lib2Name.length == 0)
        return errorInput("Missing valid name for library 2");
    RESTrequest({
        url: lib1SitePath + "/_api/web/lists/getByTitle('" + lib1Name +  "')/items" +
            "?$select=" + selectExpr + "&$expand=" + expandExpr,
        method: "GET",
        headers: {
            "Accept": "application/json;odata=verbose",
            "Content-Type": "application/json;odata=verbose",
        },
        successCallback: (data: any /*, text, reqObj */) => {
            let   L1Files: libItem[] = [],
                  L1Folders: libItem[] = [],
                  sitePath: string,
                  start: number;

            if (data.results)
               data = data.results;
            if ((sitePath = data[0].File.ServerRelativeUrl) == null)
               sitePath = data[0].Folder.ServerRelativeUrl;
            lib1ItemCount = data[0].ParentList.ItemCount;
            lib1Name = data[0].ParentList.Title;
            start = lib1SitePath.match(/https?:\/\/[^\/]+(.*)/)![1].length;
            start += sitePath.substring(start).match(/\/[^\/]+/)![0].length;
            for (let datum of data)
               if (datum.FileSystemObjectType == 0)  // file type
                  L1Files.push({
                     id: datum.Id,
                     name: datum.File.Name,
                     type: 0,
                     originalUrl: datum.File.ServerRelativeUrl,
                     relativeUrl: datum.File.ServerRelativeUrl,
  //                   folderPath: datum.File.ServerRelativeUrl.substring(start,
   //                     datum.File.ServerRelativeUrl.length - datum.File.Name.length),
                     size: datum.File.Length,
                     created: datum.File.TimeCreated,
                     modified: datum.File.TimeLastModified,
                     tag: "L1"
                  });
               else if (datum.FileSystemObjectType == 1)  // Folder type
                  L1Folders.push({
                     id: datum.Id,
                     name: datum.Folder.Name,
                     type: 1,
                     originalUrl: datum.Folder.ServerRelativeUrl,
                     relativeUrl: datum.Folder.ServerRelativeUrl,
   //                  folderPath: datum.Folder.ServerRelativeUrl.substring(start),
                     size: -1,
                     created: datum.Folder.TimeCreated,
                     modified: datum.Folder.TimeLastModified,
                     tag: "L1"
                  });

            L1Files.sort((a: any, b: any) => {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
            });
            L1Folders.sort((a: any, b: any) => {
               return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
           });
           RESTrequest({
            url: theForm.Lib2SitePath.value + "/_api/web/lists/getByTitle('" + theForm.Lib2Name.value +  "')/items" +
                  "?$select=" + selectExpr + "&$expand=" + expandExpr,
                 method: "GET",
                headers: {
                    "Accept": "application/json;odata=verbose",
                    "Content-Type": "application/json;odata=verbose",
                },
                successCallback: (data: TSPResponseData/*, text, reqObj */) => {
                  let   L2Files: libItem[] = [],
                        L2Folders: libItem[] = [],
   //                     checkTag: string,
   //                     nextTag: string,
                        checkName: string,
                        checkUrl: string,
                        nextName: string,
                        nextUrl: string,
                        combined: any[],
                        pNode: HTMLParagraphElement,
                        results: any,
                        sNode: HTMLSpanElement;

                  if (data.results)
                     results = data.results;
                  if ((sitePath = results[0].File.ServerRelativeUrl) == null)
                     sitePath = results[0].Folder.ServerRelativeUrl;
                  lib2ItemCount = results[0].ParentList.ItemCount;
                  lib2Name = results[0].ParentList.Title;
                  start = lib2SitePath.match(/https?:\/\/[^\/]+(.*)/)![1].length;
                  start += sitePath.substring(start).match(/\/[^\/]+/)![0].length;
                  for (let result of results)
                     if (result.FileSystemObjectType == 0)
                        L2Files.push({
                           id: result.Id,
                           name: result.File.Name,
                           type: 0,
                           originalUrl: result.File.ServerRelativeUrl,
                           relativeUrl: result.File.ServerRelativeUrl,
  //                         folderPath: result.File.ServerRelativeUrl.substring(start,
   //                           result.File.ServerRelativeUrl.length - result.File.Name.length),
                           size: result.File.Length,
                           created: result.Created,
                           modified: result.Modified,
                           tag: "L2"
                        });
                     else if (result.FileSystemObjectType == 1)  // Folder type
                        L2Folders.push({
                           id: result.Id,
                           name: result.Folder.Name,
                           type: 1,
                           originalUrl: result.Folder.ServerRelativeUrl,
                           relativeUrl: result.Folder.ServerRelativeUrl,
    //                       folderPath: result.Folder.ServerRelativeUrl.substring(start),
                           size: -1,
                           created: result.Created,
                           modified: result.Modified,
                           tag: "L2"
                        });

                     L2Files.sort((a: any, b: any) => {
                        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
                     });
                     L2Folders.sort((a: any, b: any) => {
                        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
                     });
                     combined = L1Files.concat(L2Files);
                     combined.sort((a: any, b: any) => {
                        return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
                     });
/*
                     makeTable({
                        headers: [ "ID", "File Name", "Tag", "Relative URL", "Created", "Modified" ],
                        display: [
                           () => { return "$$id" },
                           () => { return "$$name" },
                           () => { return "$$tag" },
                           () => { return "$$relativeUrl" },
                           (item) => { return new Date(item.created).toLocaleDateString() },
                           (item) => { return new Date(item.modified).toLocaleDateString() },
                         ],
                        data: combined,
                        attach: theForm,
                        options: ["addCounter{1}"]
                     });
                     return;
*/
                     for (let j, i = 0; i < combined.length; i++) {
                        checkName = combined[i].name;
                        checkUrl = combined[i].relativeUrl;
 //                       checkTag = combined[i].tag;
                        j = i + 1;
                        if (j >= combined.length) {
                           missingFiles.push(combined[i]);
                           continue;
                        }
                        do {
                           nextName = combined[j].name;
                           nextUrl = combined[j].relativeUrl;
  //                         nextTag = combined[j].tag;
                           j++;
                           if (nextName == checkName && nextUrl == checkUrl) {
                              commonFiles.push(combined[i]);
                              i = j + 1;
                              break;
                           }
                        } while (nextName == checkName && j < combined.length);
                        if (nextName != checkName && combined[i].tag == "L1")
                           missingFiles.push(combined[i]);
                     }
// data about libraries
                    pNode = document.createElement("p");
                    insertionPoint.appendChild(pNode);

                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(
                        "Library 1: " + lib1Name
                    ));
                    pNode.appendChild(document.createElement("br"));
                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(
                        "SharePoint reported items: " + lib1ItemCount +
                              ",\u000a\u000aFile count: " + L1Files.length +
                              ",\u000a\u000aFolder count: " + L1Folders.length
                    ));

                    pNode = document.createElement("p");
                    insertionPoint.appendChild(pNode);
                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(
                        "Library 2: " + lib2Name
                    ));
                    pNode.appendChild(document.createElement("br"));
                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(
                     "SharePoint reported items:" + lib2ItemCount +
                           ",\u000a\u000aFile count: " + L2Files.length +
                           ",\u000a\u000aFolder count: " + L2Folders.length
                    ));

                    pNode = document.createElement("p");
                    insertionPoint.appendChild(pNode);
                    pNode.appendChild(document.createTextNode("Missing files: "));
                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(missingFiles.length.toString()));
                    pNode.appendChild(document.createElement("br"));
                    pNode.appendChild(document.createTextNode("Common files: "));
                    sNode = document.createElement("span");
                    pNode.appendChild(sNode);
                    sNode.appendChild(document.createTextNode(commonFiles.length.toString()));
                    pNode.appendChild(document.createElement("br"));

// Table to show missing files
                    makeTable({
                     title: "Missing Files",
                     headers: [ "ID", "Tag", "File Name", "Folder Path", "Size", "Created", "Modified" ],
                     display: [
                        () => { return "$$id" },
                        () => { return "$$tag" },
                        () => { return "$$name" },
                        () => { return "$$folderPath" },
                        () => { return "$$size" },
                        (item) => { return new Date(item.created).toLocaleDateString() },
                        (item) => { return new Date(item.modified).toLocaleDateString() },
                      ],
                     data: missingFiles,
                     attach: insertionPoint,
                     options: ["addCounter{1}"]
                  });

// Looking at folder differences

                  combined = L1Folders.concat(L2Folders);
                  combined.sort((a: any, b: any) => {
                     return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
                  });
                  for (let j, i = 0; i < combined.length; i++) {
                     checkName = combined[i].name;
                     checkUrl = combined[i].relativeUrl;
    //                 checkTag = combined[i].tag;
                     j = i + 1;
                     if (j >= combined.length) {
                        missingFiles.push(combined[i]);
                        continue;
                     }
                  do {
                        nextName = combined[j].name;
                         nextUrl = combined[j].relativeUrl;
     //                   nextTag = combined[j].tag;
                        j++;
                        if (nextName == checkName && nextUrl == checkUrl) {
                           commonFolders.push(combined[i]);
                           i = j + 1;
                           break;
                        }
                     } while (nextName == checkName && j < combined.length);
                     if (nextName != checkName && combined[i].tag == "L2")
                        missingFolders.push(combined[i]);
                  }
                  pNode = document.createElement("p");
                  insertionPoint.appendChild(pNode);
                  pNode.appendChild(document.createTextNode("Missing folders: "));
                  sNode = document.createElement("span");
                  pNode.appendChild(sNode);
                  sNode.appendChild(document.createTextNode(missingFolders.length.toString()));
                  pNode.appendChild(document.createElement("br"));
                  pNode.appendChild(document.createTextNode("Common folders: "));
                  sNode = document.createElement("span");
                  pNode.appendChild(sNode);
                  sNode.appendChild(document.createTextNode(commonFolders.length.toString()));
                  pNode.appendChild(document.createElement("br"));

                  makeTable({
                   title: "Missing Folders",
                   headers: [ "ID", "Tag", "Folder Name", "Folder Path", "Size", "Created", "Modified" ],
                   display: [
                      () => { return "$$id" },
                      () => { return "$$tag" },
                      () => { return "$$name" },
                      () => { return "$$folderPath" },
                      () => { return "$$size" },
                      (item) => { return new Date(item.created).toLocaleDateString() },
                      (item) => { return new Date(item.modified).toLocaleDateString() },
                    ],
                   data: missingFolders,
                   attach: insertionPoint,
                   options: ["addCounter{1}"]
                });

// table to show Name-Sorted combined filters
               combined = L1Files.concat(L2Files);
               combined.sort((a: any, b: any) => {
                  return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
               });
               makeTable({
                  title: "Name-Sorted Combined Files",
                  headers: [ "ID", "Tag", "File Name", "Folder Path", "Size", "Created", "Modified" ],
                  display: [
                     () => { return "$$id" },
                     () => { return "$$tag" },
                     () => { return "$$name" },
                     () => { return "$$folderPath" },
                     () => { return "$$size" },
                     (item) => { return new Date(item.created).toLocaleDateString() },
                     (item) => { return new Date(item.modified).toLocaleDateString() },
                   ],
                  data: combined,
                  attach: insertionPoint,
                  options: ["addCounter{1}"]
               });

               combined = L1Folders.concat(L2Folders);
               combined.sort((a: any, b: any) => {
                  return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
               });
               makeTable({
                  title: "Name-Sorted Combined Folders",
                  headers: [ "ID", "Tag", "Folder Name", "Folder Path", "Created", "Modified" ],
                  display: [
                     () => { return "$$id" },
                     () => { return "$$tag" },
                     () => { return "$$name" },
                     () => { return "$$folderPath" },
                     (item) => { return new Date(item.created).toLocaleDateString() },
                     (item) => { return new Date(item.modified).toLocaleDateString() },
                   ],
                  data: combined,
                  attach: insertionPoint,
                  options: ["addCounter{1}"]
               });

                document.getElementById("working")!.style.display = "none";

               },
                errorCallback: (reqObj) => {
                  alert("Error on Library 2 request:\n\n" +
                        JSON.stringify(reqObj, null, "  "));
                }
            });
        },
        errorCallback: (reqObj/*, status, errThrown */) => {
         alert("Error on Library 1 request:\n\n" +
            JSON.stringify(reqObj, null, "  "));
      }
   });
}

function listFoldersAndFiles(
   siteName: string,
   libName: string,
   insertionPoint: HTMLDivElement
) {
   let select: string = "Id,FileSystemObjectType,File/Name,File/ServerRelativeUrl,File/Length,Folder/Name,Folder/ServerRelativeUrl,Created,Modified",
         expand: string = "File,Folder",
         leadingPath: RegExpMatchArray | null | string;

   if (siteName.length == 0)
		return false;
   if ((leadingPath = siteName.match(/https:\/\/[^\/]+(\/.*)$/)) == null)
      return false;
   leadingPath = leadingPath[1] as string;

   document.getElementById("working")!.style.display = "inline-block";
   RESTrequest({
      url: siteName + "/_api/web/lists/getByTitle('" + libName + "')/items" +
      "?$select=" + select + "&$expand=" + expand,
      method: "GET",
      headers: {
         "Accept": "application/json;odata=verbose",
         "Content-Type": "application/json;odata=verbose"
      },
      successCallback: (data: any /*, text, reqObj */) => {
         let files: libItem[] = [],
            folders: libItemEx[] = [],
            start: number,
            relUrl: string,
            sortedItems: {
               id: number;
               name: string;
               href: string;
               size: number;
               created: Date;
               modified: Date;
               type: 0 | 1 | 2;
            }[] = [],
            pElem: HTMLParagraphElement,
            ulElem: HTMLUListElement,
            liElem: HTMLLIElement,
            boldElem: HTMLElement

         // compute the start index
         if ((relUrl = data[0].File.ServerRelativeUrl) == null)
            relUrl = data[0].Folder.ServerRelativeUrl;
         start = siteName.length - siteName.match(/(https:\/\/[^\/]+)\//)![1].length;
         start += relUrl.substring(start).match(/(\/[^\/]+)/)![1].length;
         for (let datum of data)
            if (datum.FileSystemObjectType == 0)
               files.push({
                  id: datum.Id,
                  name: datum.File.Name,
                  type: 0,
                  originalUrl: datum.File.ServerRelativeUrl,
                  relativeUrl: datum.File.ServerRelativeUrl.substr(start,
                           datum.File.ServerRelativeUrl.length - start - datum.File.Name.length),
                  size: datum.File.Length,
                  created: datum.Created,
                  modified: datum.Modified,
                  tag: ""
               });
            else
               folders.push({
                  id: datum.Id,
                  name: datum.Folder.Name,
                  type: 1,
                  originalUrl: datum.Folder.ServerRelativeUrl,
                  relativeUrl: datum.Folder.ServerRelativeUrl.substr(start,
                           datum.Folder.ServerRelativeUrl.length - start - datum.Folder.Name.length),
                  size: -1,
                  created: datum.Created,
                  modified: datum.Modified,
                  tag: "",
                  itsFiles: [],
                  itsFolders: []
               });
/*
         for (let j, i = 0, k = 0; i < 2000; i++) {
            if (files[i].relativeUrl == "/")
               continue;
            k++;
            console.log("file Path = '" + files[i].relativeUrl + "'");
            for (j = 0; j < folders.length; j++) {
  //             console.log("folder Path = '" + folders[j].folderPath + folders[j].name + "'");
               if (files[i].relativeUrl == folders[j].relativeUrl + folders[j].name + "/")
                  break;
            }
            console.log("Folders counted in pass: " + j);
         } */
         {  let found: boolean,
               rootFolder: libItemEx = {
                  id: -1,
                  name: "*** Root Folder ***",
                  itsFiles: [],
                  itsFolders: [],
                  type: 1,
                  size: -1,
                  tag: "",
                  originalUrl: relUrl,
                  relativeUrl: "/",
                  created: new Date(0),
                  modified: new Date(0)
               };

            for (let file of files) {
               found = false;
               for (let folder of folders)
                  if (file.relativeUrl == folder.relativeUrl + folder.name + "/") {
                     folder.itsFiles.push(file);
                     found = true;
                     break;
                  }
               if (found == false)
                  rootFolder.itsFiles.push(file);
            }
            for (let folder1 of folders)
               for (let folder2 of folders)
                  if (folder1.relativeUrl == folder2.relativeUrl + folder2.name + "/")
                     folder2.itsFolders.push(folder1);
            for (let folder of folders)
               if (folder.relativeUrl == "/")
                  rootFolder.itsFolders.push(folder);
            folders.push(rootFolder);
         }
         // put 'Archive' folders first
         {
            let tempFolders1: libItemEx[] = [],
                  tempFolders2: libItemEx[] = [];

            for (let folder of folders)
               if (folder.name.search(/Archive/i) >= 0)
                  tempFolders1.push(folder);
               else
                  tempFolders2.push(folder);
            folders = tempFolders1.concat(tempFolders2);
         }

         // final listing with folders out
         for (let folder of folders) {
            sortedItems.push({
               id: folder.id,
               name: folder.name,
               href: folder.originalUrl,
               size: -1,
               created: folder.created,
               modified: folder.modified,
               type: folder.type
            });
            for (let subfolder of folder.itsFolders)
               sortedItems.push({
                  id: subfolder.id,
                  name: subfolder.name,
                  href: "",
                  size: subfolder.size,
                  created: subfolder.created,
                  modified: subfolder.modified,
                  type: 2
               });
            for (let file of folder.itsFiles)
               sortedItems.push({
                  id: file.id,
                  name: file.name,
                  href: "",
                  size: file.size,
                  created: file.created,
                  modified: file.modified,
                  type: file.type
               });
         }

         pElem = document.createElement("p");
         insertionPoint.appendChild(pElem);
         pElem.appendChild(document.createTextNode("For this document library:"));

         ulElem = document.createElement("ul");
         insertionPoint.appendChild(ulElem);

         liElem = document.createElement("li");
         ulElem.appendChild(liElem);
         liElem.appendChild(document.createTextNode("Folder count: "));
         boldElem = document.createElement("b");
         liElem.appendChild(boldElem);
         boldElem.appendChild(document.createTextNode(folders.length.toString()));

         liElem = document.createElement("li");
         ulElem.appendChild(liElem);
         liElem.appendChild(document.createTextNode("File count: "));
         boldElem = document.createElement("b");
         liElem.appendChild(boldElem);
         boldElem.appendChild(document.createTextNode(files.length.toString()));

         makeTable({
            title: "Folders and The Files in " + libName,
            subtitle: "(Site: " + siteName + ")",
            headers: [ "ID", "Folder of File Name", "Size", "Created", "Modified" ],
            display: [
               () => { return "$$id" },
               (item) => { return {
                     attrib: item.type == 0 ? "class=right italic" :
                           item.type == 1 ? "class=bold" : "class=right green bold",
                     iValue: "$$name",
                     wrapLink: item.href
                  }
               },
               (item) => { return item.type == 2 ? "subfolder" : item.size == -1 ? "" :
                     item.size > (1024 * 1024) ? Math.floor(item.size / (1024 * 1024)) + " MB [ $$size ]" :
                     item.size > 1024 ? Math.floor(item.size / 1024) + " KB [ $$size ]" :
                     "$$size" },
               (item) => { return new Date(item.created).toLocaleDateString() },
               (item) => { return new Date(item.modified).toLocaleDateString() },
               ],
            data: sortedItems,
            attach: insertionPoint,
            options: ["addCounter{1}"]
         });
         document.getElementById("working")!.style.display = "none";
      },
      errorCallback: (reqObj/*, status, errThrown */) => {

      }
   });
}

/*
function ReliabilityStandardValuesCheck() {  // provides listing of Reliability STd column multiple values and counnts
    RESTrequest({
        url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/CPR/_api/web/lists/getByTitle('O&P Evidence_Copy')/items" +
            "?$select=Id,Reliability_x0020_Standard,FileSystemObjectType",
        method: "GET",
        successCallback: (data: TSPResponseData) => {
            let missCount: number = 0,
                multCount: number = 0,
                fileCount: number = 0,
                folderCount: number = 0,
                pNode: HTMLParagraphElement,
                tblNode: HTMLTableElement,
                trNode: HTMLTableRowElement,
                tdNode: HTMLTableCellElement,
                sNode1: HTMLSpanElement,
                sNode2: HTMLSpanElement,
                sNode3: HTMLSpanElement,
                sNode4: HTMLSpanElement,
                sNode5: HTMLSpanElement,
                missingIds: number[] = [],
                arr: string | RegExpMatchArray | Set<any> | any[] | null,
				multCountDiffVals: number = 0,
                parentNode = theForm as HTMLFormElement;

            pNode = document.createElement("p");
            parentNode.appendChild(pNode);
            pNode.appendChild(document.createTextNode(
                "Total of " + data.results!.length + " items retrieved"
            ));

            pNode = document.createElement("p");
            parentNode.appendChild(pNode);
            sNode1 = document.createElement("span");
            sNode2 = document.createElement("span");
            sNode3 = document.createElement("span");
            sNode4 = document.createElement("span");
            sNode5 = document.createElement("span");
            pNode.appendChild(sNode4);
            pNode.appendChild(document.createTextNode(" files, "));
            pNode.appendChild(sNode5);
            pNode.appendChild(document.createTextNode(" folders total."));
            pNode.appendChild(document.createElement("br"));
            pNode.appendChild(document.createTextNode("Total of "));
            pNode.appendChild(sNode1);
            pNode.appendChild(document.createTextNode(" items with missing values."));
            pNode.appendChild(document.createElement("br"));
            pNode.appendChild(document.createTextNode("Total of "));
            pNode.appendChild(sNode2);
            pNode.appendChild(document.createTextNode(" items with multiple values."));
            pNode.appendChild(document.createElement("br"));
            pNode.appendChild(document.createTextNode("Total of "));
            pNode.appendChild(sNode3);
            pNode.appendChild(document.createTextNode(" items with multiple differing values."));

            tblNode = document.createElement("table");
            tblNode.style.width = "auto";
            parentNode.appendChild(tblNode);
            trNode = document.createElement("tr");
            tblNode.appendChild(trNode);
            tdNode = document.createElement("th");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode("ID"));
            tdNode = document.createElement("th");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode("*"));
            tdNode = document.createElement("th");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode("Values"));
            tdNode = document.createElement("th");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode("Comment"));
            for (let datum of data.results!) {
                if (datum.FileSystemObjectType == 0)
                    fileCount++;
                else if (datum.FileSystemObjectType == 1)
                    folderCount++;
               if ( datum.Reliability_x0020_Standard == null ||
                    !datum.Reliability_x0020_Standard.results) {

                    trNode = document.createElement("tr");
                    tblNode.appendChild(trNode);
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    tdNode.appendChild(document.createTextNode(datum.Id));
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
						  tdNode.style.textAlign = "center";
                    tdNode.appendChild(document.createTextNode("--"));
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    tdNode.appendChild(document.createTextNode("Missing values for Reliablility Standard"));

                    missCount++;
                    missingIds.push(datum.Id);
                } else if (datum.Reliability_x0020_Standard.results &&
                            datum.Reliability_x0020_Standard.results.length > 1) {
					multCount++;
					arr = datum.Reliability_x0020_Standard.results.join(";;") as string;
					arr = arr.match(/[A-Z]{3}\-\d{3}/g) as RegExpMatchArray;
					arr = new Set(arr);
					if (arr.size < 2)
					    continue;
                    trNode = document.createElement("tr");
                    tblNode.appendChild(trNode);
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    tdNode.appendChild(document.createTextNode(datum.Id));
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    tdNode.appendChild(document.createTextNode(
                        datum.FileSystemObjectType == 1 ? "fldr" : ""
                    ));
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    if (arr.size > 1) {
                        multCountDiffVals++;
                        tdNode.appendChild(document.createTextNode(
                            JSON.stringify(datum.Reliability_x0020_Standard.results)
                        ));
                    }
                    tdNode = document.createElement("td");
                    trNode.appendChild(tdNode);
                    tdNode.appendChild(document.createTextNode(
                        datum.Reliability_x0020_Standard.results.length + " values for Reliability Standard"
                    ));
                }
            }
            trNode = document.createElement("tr");
            tblNode.appendChild(trNode);
            tdNode = document.createElement("td");
            trNode.appendChild(tdNode);
            tdNode.setAttribute("colspan", "4");
            tdNode.appendChild(document.createTextNode("IDs with missing Reliability Standard values:"));
            tdNode.appendChild(document.createElement("br"));
            for (let id of missingIds)
                tdNode.appendChild(document.createTextNode(id + ", "));
            sNode1.appendChild(document.createTextNode(missCount.toString()));
            sNode2.appendChild(document.createTextNode(multCount.toString()));
            sNode3.appendChild(document.createTextNode(multCountDiffVals.toString()));
            sNode4.appendChild(document.createTextNode(fileCount.toString()));
            sNode5.appendChild(document.createTextNode(folderCount.toString()));
        },
        errorCallback: (reqObj) => {
            console.log(JSON.stringify(reqObj, null, "  "));
        }
    });
} */


function clearErrors(): void {
    (document.getElementById("date-error") as HTMLDivElement).style.display = "none";
}

/**
 * @function makeTable
 * @param params -- the following properties are set
 *      .headers: string[]  the text to be used in column headers
 *      .display: ((arg?: any) => string | {attrib: string; iValue: string}) []
 *               a function to execute to render what is displayed in table cell
 *          can be either a string or object of type {attrib: string; value: string;}
 *           attrib can be td attribs with format "id='<idval>';;class='<classval>';;..."
 *             use split(";;") to disjoin, then use split("=") to get name=value pairs
 *      .data: any[]  the data items as array to be supplied and executed
 *      .attach: the form node to attach the table to
 *      .options: string[]
 */
function makeTable(params: {
    headers: string[];
    display: ((arg?: any) => string |
      {
         attrib: string;
         iValue: string;
         wrapLink?: string; // this is href attribute value
      }) [];
    data: any[];
    attach: HTMLDivElement;
    options: string[];
    title?: string;
    subtitle?: string;
}) {
   const ADD_COUNTER: number = 0x0001;
   let tblNode: HTMLTableElement,
        trNode: HTMLTableRowElement,
        tdNode: HTMLTableCellElement,
        caption: HTMLTableCaptionElement,
        pNode: HTMLParagraphElement,
        value: string |
            {
               attrib: string;
               iValue: string;
               wrapLink?: string;
            },
        cItem: { [key:string]: string;},
        options = 0x0000,

        counterColumn = -1,
        matches,
        counter = 0;

   if (params.options) {
      for (let option of params.options)
         if ((matches = option.match(/addCounter\{(\d+)\}/)) != null) {
            options |= ADD_COUNTER;
            counterColumn = matches[1] ? parseInt(matches[1]) : 1;
            counter = 1;
         }
   }
   tblNode = document.createElement("table");
   tblNode.style.margin = "2em auto";
   if (params.title) {
      caption = document.createElement("caption");
      caption.appendChild(document.createTextNode(params.title));
      caption.style.color = "lime";
      caption.style.backgroundColor = "navy";
      caption.style.captionSide = "top";
      caption.style.fontSize = "125%";
      caption.style.fontWeight = "bold";
      caption.style.paddingLeft = "2em";

      tblNode.appendChild(caption);
      if (params.subtitle) {
         pNode = document.createElement("p");
         caption.appendChild(pNode);
         pNode.style.fontSize = "83%";
         pNode.style.color = "yellow";
         pNode.style.fontWeight = "normal";
         pNode.appendChild(document.createTextNode(params.subtitle));
      }
   }
   params.attach.appendChild(tblNode);
   tblNode.style.width = "auto";
   trNode = document.createElement("tr");
   tblNode.appendChild(trNode);
   for (let i = 0; i < params.headers.length; i++) {
      if ((options & ADD_COUNTER) != 0 && i == counterColumn - 1) {
         tdNode = document.createElement("th");
         trNode.appendChild(tdNode);
         tdNode.appendChild(document.createTextNode("#"));
      }
      tdNode = document.createElement("th");
      trNode.appendChild(tdNode);
      tdNode.appendChild(document.createTextNode(params.headers[i]));
   }
   for (let item of params.data) {
      trNode = document.createElement("tr");
      tblNode.appendChild(trNode);
      for (let i = 0; i < params.display.length; i++) {
         if ((options & ADD_COUNTER) != 0 && i == counterColumn - 1) {
            // this creates a left-size row column counter as an option
            tdNode = document.createElement("th");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode(counter.toString()));
            counter++;
         }
         tdNode = document.createElement("td");
         trNode.appendChild(tdNode);
         // process the display functions
         value = params.display[i](item);
         if (typeof value == "string") {
            if (value.search(/\$\$/) >= 0)
               setCellValue(item, value, null);
            else
               tdNode.appendChild(document.createTextNode(value));
         } else {
            // value is object
            if (value.iValue.search(/\$\$/) >= 0)
               setCellValue(item, value.iValue, value.wrapLink!);
            if (value.attrib.length > 0) {
               let attribs: string[],
                  attribName: string,
                  attribVal: string;

               attribs = value.attrib.split(";;");
               for (let attrib of attribs) {
                  [ attribName, attribVal ] = attrib.split("=");
                  switch (attribName) {
                  case "class":
                     tdNode.className = attribVal;
                     break;
                  case "id":
                     tdNode.id = attribVal;
                     break;
                  case "style":
                     tdNode.setAttribute("style", attribVal);
                     break;
                  }
               }
            }
         }
      }
   }

   function setCellValue(item: any, value: string, wrapLink: string | null) {
      //  for "$$<object properties>"
      let index: string[],
            part: string | undefined,
            vars: RegExpMatchArray | null,
            varsVals: string[] = [];

      // extract the property string from any larger string
      if ((vars = value.match(/\$\$[A-Za-z0-9]+/g)) != null)
         for (let var$ of vars)
            varsVals.push(item[var$.substring(2)]);
      if (vars != null)
         for (let i = 0; i < vars?.length; i++)
            value = value.replace(vars[i], varsVals[i]);
/*
      if ((index = (value).split(".")).length > 1) {
         cItem = item[index.shift() as string];
         while (typeof (part = index.shift()) !== "undefined")
            value = cItem[part];
      } else
         value = item[value]; */
      if (wrapLink && wrapLink.length > 0) {
         let anchor: HTMLAnchorElement;

         anchor = document.createElement("a");
         anchor.href = wrapLink;
         anchor.target = "_blank";
         anchor.appendChild(document.createTextNode(value));
         tdNode.appendChild(anchor);
      } else
         tdNode.appendChild(document.createTextNode(value));
   }
}


function specialListing(
   siteName: string,
   libName: string,
   insertionPoint: HTMLDivElement
) {
   let docLibREST = new SPListREST({
         server: SERVER_NAME,
         site: siteName.match(/https:\/\/[^\/]+(.*)/)![1],
         listName: libName
      });

   // 1. init  2. get the fields of interest, learn their type 3. construct query
   docLibREST.init().then(() => {
      docLibREST.getListItemsWithQuery({
         select: "Id,FileSystemObjectType,File/Name,File/ServerRelativeUrl," +
               "File/Length,Folder/Name,Folder/ServerRelativeUrl,Created,Modified",
         selectDisplay: ["Year", "Rel Standard"],
         expand: "File,Folder",
         filter: null
      }) .then((response: any) => {
         makeTable({
            title: "Folders in " + libName + " with Required Values settings",
            subtitle: "(Site: " + siteName + ")",
            headers: [ "ID", "Folder Name", "Year", "Rel. Std", "Contained Items", "Modified", "Created" ],
            display: [
               () => { return "$$id" },
               () => { return "$$name" },
               () => { return "$$year" },
               () => { return "$$relstd" },
               () => {
                  return {
                     attrib: "class=whitespace",
                     iValue: "file count: $$filesCount\nsubfolders count: $$foldersCount"
                  }
               },
               (item) => { return new Date(item.created).toLocaleDateString() },
               (item) => { return new Date(item.modified).toLocaleDateString() },
               ],
            data: response,
            attach: insertionPoint,
            options: ["addCounter{1}"]
         });

      }).catch((response: any) => {

      });
   }).catch((response: any) => {
   });
}

function customListing() {
   document.getElementById("request-controls")!.style.display = "none";
   document.getElementById("custom-listing")!.style.display = "block";
   document.getElementById("custom-listing-genurl")!.style.display = "inline";
}

function updateListing(options?: TListingOptions) {
   const form: HTMLFormElement = document.getElementById("theForm") as HTMLFormElement;
   let url: string,
      filter: string = "",
		libName: string = form.clistingListName.value,
		dateSetStatus: number = 0x0,
      itemsSelect: string = "$select=Id," +
            "FileSystemObjectType," +
            "File/Name," +
            "File/ServerRelativeUrl," +
            "Folder/Name," +
            "Folder/ItemCount," +
            "Folder/ServerRelativeUrl," +
            "File/Length," +
            "File/Author/Title," +
            "File/ModifiedBy/Title," +
            "File/TimeCreated," +
            "ParentList/ParentWebUrl," +
            "ParentList/Title," +
            "ParentList/ItemCount," +
            "File/TimeLastModified",
      itemsExpand = "$expand=Properties,Folder,File,Folder/Folders,Folder/Files,Folder/ListItemAllFields," +
					"File/Author,File/ModifiedBy,ParentList";

	SiteUrl = form.clistingSiteUrl.value;
	if (!options)
		options = {} as TListingOptions;
   if (options.versioning == true) {
      itemsExpand += ",File/Versions";
   }
   if (SiteUrl.length > 0)
      localStorage.setItem("LibListingSitePathUrl", SiteUrl);
	if (libName.length > 0)
      localStorage.setItem("LibListingName", libName);
   if (options.date)
      dateSetStatus |= 0x1;
   if (options.dateType)
      dateSetStatus |= 0x2;
   if (options.dateBorder)
      dateSetStatus |= 0x4;
   if (!(dateSetStatus == 0x0 || dateSetStatus == 0x7))
      (document.getElementById("date-error") as HTMLDivElement).style.display = "block";
   options.dateSetStatus = false;
   if (dateSetStatus == 0x7)
      options.dateSetStatus = true;

   if (dateSetStatus == 0x7) {
      if (options.dateType == "created")
         filter = "$filter=Created ";
      else // last modified
         filter = "$filter=Modified ";
      if (options.dateBorder == "before")
         filter += " le ";
      else // after
      	filter += " ge ";
      filter += "'" + options.date!.toISOString() + "'";
   }

	url = SiteUrl + "/_api/web/lists/getByTitle('" + libName + "')/items?" +
			itemsSelect + "&" + itemsExpand + (filter.length > 0 ? "&" + filter : "");
	//progressAlert("show");
   RESTrequest({
   	url: url,
      method: "GET",
      	successCallback: (data) => {
     //    	progressAlert("hide");
 //           FirstRun = true;
            if (data.d && data.d.results)
                processData(data.d.results, options);
            else if (Array.isArray(data) == true)
                processData(data as any[], options);
            else
                alert("An exception occurred!");
        },
        errorCallback: (reqObj) => {
 //           progressAlert("hide");
 //           progressAlert("error");
            console.log("URL => " + url);
            console.log(JSON.stringify(reqObj, null, "  "));
        }
    });
}

function processData(
    itemsData: any[],
    options: any
): void {
	let tblNode: HTMLTableElement,
        divNode: HTMLDivElement,
        sNode: HTMLSpanElement,
        pNode: HTMLParagraphElement,
		  fileFolderPath: string,
		file: TProcessedFile,
		files: TProcessedFile[] = [],
      folders: TProcessedFolder[] = [];

	for (let item of itemsData) {
		if (item.Folder.__metadata && item.Folder.__metadata.type && item.Folder.__metadata.type == "SP.Folder") {
			folders.push({
				id: item.Id,
         	name: item.Folder.Name,
				path: item.Folder.ServerRelativeUrl,
            itemCount: item.Folder.ItemCount,
				foldersCount: item.Folder.Folders.results.length,
				files: []
      	});
			continue;
		}
//    ELSE the item is a file
		if (options.dateSetStatus == true && item.File.__metadata) {
			if (options.dateType == "created") {
				if (options.dateBorder == "before") {
					if (new Date(item.File.TimeCreated) > options.date)
						continue;
				} else if (new Date(item.File.TimeCreated) < options.date)
					continue;
			} else if (options.dateBorder == "before") {
				if (new Date(item.File.TimeLastModified) > options.date)
					continue;
				else if (new Date(item.File.TimeLastModified) < options.date)
					continue;
			}
		}
		file = {} as TProcessedFile;
		file.id = item.Id;
		file.itemName = item.File.Name;
		file.serverRelativeUrl = item.File.ServerRelativeUrl;
		file.folderPath = file.serverRelativeUrl.substr(0, file.serverRelativeUrl.lastIndexOf("/") + 1);
		file.folderPath = file.folderPath.replace(item.ParentList.ParentWebUrl, "");
		file.folderPath = file.folderPath.match(/^(\/[^\/]+)(.*)$/)![2];
		file.size = item.File.Length;
		file.authorName = item.File.Author.Title;
      file.created = item.File.TimeCreated;
      file.editorName = item.File.ModifiedBy.Title;
      file.modified = item.File.TimeLastModified;
      if (options.versioning == true)
      	file.versions = item.File.Versions;
		files.push(file);
	}
/*
	files.sort((item1, item2) => {
		return item1.folder > item2.folder ? 1 : item1.folder < item2.folder ? -1 : 0;
	});
    urlPart = {};
    urlPart.name = "/";
    urlPart.itemCount = itemsData[0].ParentList.ItemCount;
    for (let folder of folders)
        urlPart.itemCount -= folder.itemCount;
    urlPart.itemCount -= folders.length;
    folders.push(urlPart);
    SiteUrl = SERVER_NAME + itemsData[0].File.ServerRelativeUrl;
    SiteUrl = SiteUrl.substr(0, SiteUrl.lastIndexOf("/"));
	*/
	// For folders, put in their constituent files
	for (let file of files) {
		fileFolderPath = file.serverRelativeUrl.match(/(.*)\/[^\/]+$/)![1];
		for (let folder of folders)
			if (folder.path == fileFolderPath)
				folder.files.push(file);
	}
    // build the HTML table: F1: item/file name, F2: item/file type , F3: creator + date, F4: who modified + date, include folder and file count
    // cross-checking: compare
    // get the list of folders from both pulls

    divNode = document.getElementById("html-table") as HTMLDivElement;
    while (divNode.firstChild)
        divNode.removeChild(divNode.firstChild);

    pNode = document.createElement("p");
    divNode.appendChild(pNode);
    pNode.id = "counts";

	 pNode.appendChild(document.createTextNode("Item count: "));
    sNode = document.createElement("span");
    pNode.appendChild(sNode);
    sNode.id = "item-count";
	 sNode.appendChild(document.createTextNode(itemsData[0].ParentList.ItemCount));
	 pNode.appendChild(document.createElement("br"));

	 pNode.appendChild(document.createTextNode("Folder count: "));
    sNode = document.createElement("span");
    pNode.appendChild(sNode);
    sNode.id = "folder-count";
	 pNode.appendChild(document.createElement("br"));

    pNode.appendChild(document.createTextNode("File count: "));
    sNode = document.createElement("span");
    pNode.appendChild(sNode);
    sNode.id = "file-count";

    tblNode = document.createElement("table");
    divNode.appendChild(tblNode);
    if (folders.length > 0 && options.listFilesOnly == false)
	 	listByFolderGrouping(folders, options, tblNode);
    else
	 	listFolderlessLibrary(files, options, tblNode);
	document.getElementById("folder-count")!.appendChild(document.createTextNode(folders.length.toString()));
	document.getElementById("file-count")!.appendChild(document.createTextNode(files.length.toString()));
}

/**
 * @function listAsRetrieved -- used for lisitng of files in folderless libraries
 * @param files
 * @param options
 * @param tblNode
 */
function listFolderlessLibrary(
    files: TProcessedFile[],
    options: TListingOptions,
    tblNode: HTMLTableElement
): void {
	let trNode: HTMLTableRowElement,
        tdNode: HTMLTableCellElement,
        tableHeaders: {
            name: string;
            width: number;
        }[] = [
         	{name:"File Name", width: -1},
            {name: "Size", width: -1 },
            {name:"Creator/Date", width: 18 },
            {name: "Last Modified By/Date", width: 18}
         ],
			rowNum: number = 1,
			colspan: number = 2;

	if (options.includeId == true) {
		tableHeaders.unshift({name: "Id", width: - 1});
		colspan++;
	}
	if (options.rowNumbering == true) {
		tableHeaders.unshift({name: "#", width: - 1});
		colspan++;
	}

	if (options.sortListingByID == true)
		files.sort((el1, el2) => {
			return el1.id > el2.id ? 1 : el1.id < el2.id ? -1 : 0;
		});
// the headers for the table
	trNode = document.createElement("tr");
	tblNode.appendChild(trNode);
	for (let i = 0; i < tableHeaders.length; i++) {
		tdNode = document.createElement("th");
		trNode.appendChild(tdNode);
		if (i < 2 && options.dateSetStatus == false && options.listFilesOnly != true)
			tdNode.setAttribute("rowspan", "2");
		if (i == 2 && options.dateSetStatus == false && options.listFilesOnly != true) {
			tdNode.appendChild(document.createTextNode("Folder info:\u00a0\u00a0item count"));
			tdNode.setAttribute("colspan", colspan.toString());
			trNode.appendChild(tdNode);
			trNode = document.createElement("tr");
			tblNode.appendChild(trNode);
			tdNode = document.createElement("th");
			trNode.appendChild(tdNode);
		}
		tdNode.appendChild(document.createTextNode(tableHeaders[i].name));
		if (tableHeaders[i].width)
			tdNode.style.width = tableHeaders[i].width + "em";
	}

	for (let file of files)	{
		trNode = document.createElement("tr");
		tblNode.appendChild(trNode);

		if (options.rowNumbering == true) {
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(rowNum.toString()));
			rowNum++;
		}

		if (options.includeId == true) {
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(file.id.toString()));
		}

		tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
		tdNode.appendChild(document.createTextNode(file.itemName));

		tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
		tdNode.appendChild(document.createTextNode(simplifyFileSize(file.size) as string));

		tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
		tdNode.appendChild(document.createTextNode(
			new Date(file.created).toLocaleDateString()
		));

		tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
		tdNode.appendChild(document.createTextNode(
			new Date(file.modified).toLocaleDateString()
		));
	}
}

/**
 *
 * @param {arrayOfObjects} files -- should be an array of objects with 4 properties:
 *     { folder: <string>, itemName: <string>, size: <number>, authorName: <string> }
 * @param {arrayOfObjects} folders -- should be an array of objects with 4 properties:
 *     { folder: <string>, itemName: <string>, size: <number>, authorName: <string> }
 * @param {arrayOfObjects} options -- should be an array of objects with 4 properties:
 *     { folder: <string>, itemName: <string>, size: <number>, authorName: <string> }
 * @param {HTMLTableDomNode} tblNode -- needed to continue table
 */
function listByFolderGrouping(
	folders: TProcessedFolder[],
 	options: TListingOptions,
    tblNode: HTMLTableElement
): void {
	let pName: string,
        fileSize: number | string,
		  mix: TProcessedFile[] = [],
		  colspan: number = 3,
        trNode: HTMLTableRowElement,
        tdNode: HTMLTableCellElement,
        tableHeaders: {
            name: string;
            width: number;
        }[] = [
                {name:"File/Folder Name", width: -1 },
                {name: "Size", width: -1 },
                {name:"Creator/Date", width: -1 },
                {name: "Last Modified By/Date", width: -1 }
            ],
		sitePathUrl = SiteUrl.substring(SERVER_NAME.length),
		personRE: RegExp = /([^,]+),\s*(\w+)\s*\(consultant\)@|([^,]+)\s*\(consultant\)@/,
		rowNum: number = 1;

	if (options.includeId == true) {
		tableHeaders.unshift({name: "Id", width: - 1});
		colspan++;
	}
	if (options.rowNumbering == true) {
		tableHeaders.unshift({name: "#", width: - 1});
		colspan++;
	}
	if (options.sortListingByID == true) {
		for (let folder of folders) {
			mix.push({
				id: folder.id,
				itemName: folder.name,
				serverRelativeUrl: "",
				folderPath: "",
				size: 0,
				authorName: "",
				created: new Date(0),
				editorName: "",
				modified: new Date(0)
			});
			for (let file of folder.files)
				mix.push(file);
		}
		return listFolderlessLibrary(mix, options, tblNode);
	}
	trNode = document.createElement("tr");
   tblNode.appendChild(trNode);
   for (let i = 0; i < tableHeaders.length; i++) {
   	tdNode = document.createElement("th");
		trNode.appendChild(tdNode);
		tdNode.appendChild(document.createTextNode(tableHeaders[i].name));
		if (tableHeaders[i].width)
			tdNode.style.width = tableHeaders[i].width + "em";
   }
   for (let folder of folders) {
		trNode = document.createElement("tr");
		tblNode.appendChild(trNode);

		if (options.rowNumbering == true) {
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(rowNum.toString()));
			rowNum++;
		}

		if (options.includeId == true) {
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(folder.id.toString()));
		}

		tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
		tdNode.setAttribute("colspan", colspan.toString());
		tdNode.className = "folderpath";
		tdNode.appendChild(document.createTextNode(
			folder.path.substring(sitePathUrl.length).match(/\/[^\/]+(\/.+)$/)![1].replace(/\//g, " / ")
		));
        // folder item count
      tdNode = document.createElement("td");
		trNode.appendChild(tdNode);
      tdNode.className = "folderpath";
		tdNode.appendChild(document.createTextNode(
			"item count: " + folder!.files.length
		));
		for (let file of folder.files) {
			trNode = document.createElement("tr");
			tblNode.appendChild(trNode);

	// write the item ID
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(file.id.toString()));
	// write the item name
			tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(file.itemName));
	// write the file size
        	fileSize = simplifyFileSize(file.size) as string;
        	tdNode = document.createElement("td");
			trNode.appendChild(tdNode);
			tdNode.appendChild(document.createTextNode(fileSize.toString()));

    // name of file creator
			if (file.authorName) {
				pName = file.authorName.match(personRE)![0];
				if (pName == null)
					pName = file.authorName;
				else if (pName.length > 2)
					pName = pName[2] + " " + pName[1];
				else
					pName = pName[1];
    // created time
				tdNode = document.createElement("td");
				trNode.appendChild(tdNode);
				tdNode.appendChild(document.createTextNode(
					pName + " (" + new Date(file.created).toLocaleDateString() + ")"
				));
			}

			if (file.editorName) {
				pName = file.editorName.match(personRE)![0];
				if (pName == null)
					pName = file.editorName;
				else if (pName.length > 2)
					pName = pName[2] + " " + pName[1];
				else
					pName = pName[1];
				tdNode = document.createElement("td");
				trNode.appendChild(tdNode);
				tdNode.appendChild(document.createTextNode(
					pName + " (" + new Date(file.modified).toLocaleDateString() + ")"
				));
			}
			if (options.versioning && options.versioning == true) {
				let innerTblNode: HTMLTableElement,
						aNode: HTMLAnchorElement,
						versioningTitles: string[] = [
							"URL",
							"Is Current Version", // Versions.IsCurrentVersion
							"Major",  // (ID / 512)
							"Minor",  //  (ID % 512) / 10
							"Size",
							"Created",
							"Modified"
						];

				trNode = document.createElement("tr");
				tblNode.appendChild(trNode);
				tdNode = document.createElement("td");
				trNode.appendChild(tdNode);
				tdNode.setAttribute("colspan", (colspan + 1).toString());
				innerTblNode = document.createElement("table");
				tdNode.appendChild(innerTblNode);
				trNode = document.createElement("tr");
				innerTblNode.appendChild(trNode);
				innerTblNode.className = "subtable";
				for (let header of versioningTitles) {
					tdNode = document.createElement("th");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(header));
				}
				for (let version of file.versions!) {
					trNode = document.createElement("tr");
					innerTblNode.appendChild(trNode);
				// URL
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					aNode = document.createElement("a");
					tdNode.appendChild(aNode);
					aNode.href = SiteUrl + version.Url;
					aNode.appendChild(document.createTextNode("File"));
				// Current Version
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(version.IsCurrentVersion));
				// Major Version
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(
						(version.ID / 512).toString()
					));
				// Minor Version
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(
						((version.ID % 512) / 10).toString()
					));
				// Size
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(version.Size));
				// Created
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(
						new Date(version.Created).toLocaleDateString()
					));
				// Modified
					tdNode = document.createElement("td");
					trNode.appendChild(tdNode);
					tdNode.appendChild(document.createTextNode(
						new Date(version.Modified).toLocaleDateString()
					));
				}
			}
		}
	}
}

function dataTransformer() {
    RESTrequest({
        url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/_api/web/lists/" +
                            "getByTitle('PSMP_dev')?$expand=ContentTypes&$select=ContentTypes/Id/StringValue,ContentTypes/Name",
        method: "GET",
        successCallback: (data) => {
            let ListContentTypes: {
                name: string;
                id: string;
            }[] = [ ],
                results: any = data.d!.ContentTypes.results,
                DocumentContentTypeId: string | null = null;

            for (let result of results) {
                if (result.Name == "Document")
                    DocumentContentTypeId = result.Id.StringValue;
                ListContentTypes.push({
                    name: result.Name,
                    id: result.Id.StringValue
                });
            }
            RESTrequest({
                url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/_api/web/lists/" +
                            "getByTitle('PSMP_dev')/items?$select=Id,Level_x0020_1,File/Name" +
                            ((DocumentContentTypeId != null) ? "&$filter=ContentTypeId eq '" + DocumentContentTypeId + "'" : "") +
                            "&$expand=File",
                method: "GET",
                successCallback: (data) => {
                    let ctype: {
                            name: string;
                            id: string;
                        },
                        idx: number,
                        results: any = data;

                    for (idx = 0; idx < results.length; idx++) {
                        console.log("count of files to be operated on: " + results.length);
                        for (ctype of ListContentTypes)
                            if (ctype.name == results[idx].Level_x0020_1)
                                break;
                        console.log("modifying file '" + results[idx].File.Name + "'");
                        setTimeout(() => {
                            RESTrequest({
                                setDigest: true,
                                url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/_api/web/lists/" +
                                        "getByTitle('PSMP_dev')/items(" + results[idx].Id + ")",
                                method: "POST",
                                headers: {
                                    "X-HTTP-METHOD": "MERGE",
					                "IF-MATCH": "*"
                                },
                                data: formatRESTBody({
                                    "ListItemEntityTypeFullName": "SP.Data.PSMP_x005f_DevItem",
                                    "ContentTypeId": ctype.id
                                }),
                                successCallback: (data, text, reqObj) => {
                                    console.log("response data => " +
                                        JSON.stringify(data) +
                                        "\nrequestObj => " +
                                        JSON.stringify(reqObj));
                                },
                                errorCallback: (reqObj) => {
                                    console.log(JSON.stringify(reqObj, null, "  "));
                                }
                            });
                        }, 5000);
                    }
                },
                errorCallback: (reqObj) => {
                  console.log(JSON.stringify(reqObj, null, "  "));
               }
            });
        },
        errorCallback: (reqObj) => {
         console.log(JSON.stringify(reqObj, null, "  "));
      }
    });
}
