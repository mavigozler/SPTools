"use strict";

type makeTableHeaderObject = {
   title: string;
   style: string;
}

/*
import { SPSiteREST } from '../../SPREST/src/SPSiteREST';
import { SPListREST } from '../../SPREST/src/SPListREST';
import * as SPRESTSupportLib from '../../SPREST/src/SPRESTSupportLib';
import * as SPRESTTypes from '../../SPREST/src/SPRESTtypes';
import * as SPTools from './SPTools';
*/

const SERVER_NAME = location.origin,
    SITE_NAME = "/teams/swp-dom/RSO/CPR",
    apiPrefix = SERVER_NAME + SITE_NAME + "/_api",

	VERSIONING = 0x0001,
	LIST_FILES_ONLY = 0x0002,
	INCLUDE_ID_IN_LISTING = 0x0004,
	SORT_LISTING_BY_ID = 0x0008,
	ROW_NUMBERING = 0x0010,

   FILE_SYSTEM_OBJECT_TYPE_FILE = 0,
   FILE_SYSTEM_OBJECT_TYPE_FOLDER = 1;

const BOX_DRAWINGS_LIGHT_VERTICAL_AND_RIGHT = '\u251c',  //  ├
      BOX_DRAWINGS_LIGHT_VERTICAL = '\u2502',  //  │
      BOX_DRAWINGS_LIGHT_HORIZONTAL = '\u2500',  //  ─
      BOX_DRAWINGS_LIGHT_UP_AND_RIGHT = '\u2514';  // └

let LibListingForm: HTMLFormElement,
    SiteUrl: string,
	 ListingOptions: number = 0x0000;

type libItem = {
   id: number;
   name: string;
   type: 0 | 1; // 0 = file, 1 = folder
//   folderPath: string;
   originalUrl: string;
   relativeUrl: string;
   parentPath?: string;
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

// returns a RELATIVE URL
function findItemUrl(SPitem: any, siteName: string, parent?: boolean): string {
   let relUrl: string,
      isFile: boolean;
//      start: number,
//      url: string;

   if ((relUrl = SPitem.File.ServerRelativeUrl) == null) {
      relUrl = SPitem.Folder.ServerRelativeUrl;
      isFile = false;
   } else
      isFile = true;
   if (isFile == true && parent == true)
      relUrl = relUrl.substring(0, relUrl.lastIndexOf("/"));
//   start = siteName.length - siteName.match(/(https:\/\/[^\/]+)\//)![1].length;
//   start += relUrl.substring(start).match(/(\/[^\/]+)/)![1].length;
//   if (isFile == true)
//      url = SPitem.File.ServerRelativeUrl.substr(start,
//            SPitem.File.ServerRelativeUrl.length - start - SPitem.File.Name.length);
//   else
//      url = SPitem.Folder.ServerRelativeUrl.substr(start,
//            SPitem.Folder.ServerRelativeUrl.length - start - SPitem.Folder.Name.length);
   return relUrl;
}

function listingControl(
	which: string | URLSearchParams,
	LibListingForm: HTMLFormElement
): void {
	let siteREST: SPSiteREST,
			value: string | null,
         listingFunc: string | null = null,
         queryParts: URLSearchParams | null = null,
         insertionPoint: HTMLDivElement,
         parentNode: HTMLElement = LibListingForm.parentNode! as HTMLElement;
/*
			options: TListingOptions = {},
			dpage: string | null;  */

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
   LibListingForm.style.display = "none";
   document.createElement("show-libform").style.display = "block";
	switch (listingFunc.toLowerCase()) {
   case "findfilediff":
      if (queryParts) {
         LibListingForm.Lib1SitePath.value = queryParts.get("lib1sitepath");
         LibListingForm.Lib1Name.value = queryParts.get("lib1name");
         LibListingForm.Lib2SitePath.value = queryParts.get("lib2sitepath");
         LibListingForm.Lib2Name = queryParts.get("lib2name");
      }
      findFileDifferences(
         LibListingForm.Lib1SitePath.value,
         LibListingForm.Lib1Name.value,
         LibListingForm.Lib2SitePath.value,
         LibListingForm.Lib2Name,
         insertionPoint
      );
      break;
   case "duplicatelisting":
      if (queryParts && ((LibListingForm.SiteNameDuplicates.value =  queryParts.get("sitenamedups")) == null ||
                  (LibListingForm.LibraryNameDuplicates.value = queryParts.get("libnamedups"))) == null)
         return alert("To use duplicate listing function, the query string must be of the form " +
               "'?callfunc=DuplicateListing&siteURL=<site-url>&libName=<lib-name>&displaypage=liblist-container'");
      listingOp(
         "fileduplicates",
         LibListingForm.SiteNameDuplicates.value,
         LibListingForm.LibraryNameDuplicates.value,
         null,
         insertionPoint
      );
      break;
	case "makelibcopy":
      if (queryParts && ((queryParts.get("server") == null || queryParts.get("site") == null ||
                  queryParts.get("sourceLib") == null || queryParts.get("destLib") == null)))
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
         ).then((response: any) => {
            alert("Success: " + response);
         }).catch((response: any) => {
            alert("Failure: " + response);
         });
      }).catch((response: any) => {
         alert("Failure to initialize" + response);
      });
		break;
   case "listfoldersandfiles":
      if (queryParts) {
         LibListingForm.SiteNameDuplicates.value =  queryParts.get("siteurl");
         LibListingForm.LibraryNameDuplicates.value = queryParts.get("libname");
      }
      listingOp(
         "foldersWithTheirFiles",
         LibListingForm.SiteNameDuplicates.value,
         LibListingForm.LibraryNameDuplicates.value,
         null,
         insertionPoint
      );
      break;
   case "speciallisting":
      LibListingForm.style.display = "none";  // tun off the form for this one
      if (queryParts)
         listingOp(
            "searchParametersListing",
            queryParts.get("siteurl")!,
            queryParts.get("libname")!,
            queryParts.get("options"),
            insertionPoint
         );
      break;
   }
}

function generateURL(which: string): void {
	// location.href + query part
   let queryPos = location.href.lastIndexOf("?"),
      noQueryLocation: string = queryPos > 0 ? location.href.substring(0, queryPos) : location.href;
   switch (which) {
   case "dupOrFolderFiles":
      if (LibListingForm.dupOrFolderFiles.value == "dups")
         LibListingForm.duplicatesGenUrl.value = noQueryLocation + "?listingfunc=duplicateListing&sitenamedups=" +
               encodeURIComponent(LibListingForm.SiteNameDuplicates.value) +
               "&libnamedups=" + encodeURIComponent(LibListingForm.LibraryNameDuplicates.value) +
               "&displaypage=liblist-container";
      else if (LibListingForm.dupOrFolderFiles.value == "folderfiles")
         LibListingForm.duplicatesGenUrl.value = noQueryLocation + "?listingfunc=listFoldersAndFiles&siteurl=" +
               encodeURIComponent(LibListingForm.SiteNameDuplicates.value) +
               "&libname=" + encodeURIComponent(LibListingForm.LibraryNameDuplicates.value) +
               "&displaypage=liblist-container";
      break;
   case "copylib":
      LibListingForm.copyingGenUrl.value = noQueryLocation + "?listingfunc=makelibcopy&sourcesitecopy=" +
            encodeURIComponent(LibListingForm.SourceSiteCopy.value) +
            "&sourcenamecopy=" + encodeURIComponent(LibListingForm.SourceSiteCopy.value) +
            "&destsitecopy=" + encodeURIComponent(LibListingForm.DestSiteCopy.value) +
            "&destnamecopy=" + encodeURIComponent(LibListingForm.DestNameCopy.value) +
            "&displaypage=liblist-container";
      break;
   case "filediff":
      LibListingForm.filediffGenUrl.value = noQueryLocation + "?listingfunc=findfilediff&lib1sitepath=" +
            encodeURIComponent(LibListingForm.Lib1SitePath.value) +
            "&lib1name=" + encodeURIComponent(LibListingForm.Lib1Name.value) +
            "&lib2sitepath=" + encodeURIComponent(LibListingForm.Lib2SitePath.value) +
            "&lib2name=" + encodeURIComponent(LibListingForm.Lib2Name.value) +
            "&displaypage=liblist-container";
      break;
   case "liblisting":
      LibListingForm.generatedUrl.value = noQueryLocation +
            "?listingfunc=customlisting&csiteurl=" + encodeURIComponent(LibListingForm.clistingSiteUrl.value) +
            "&clibname=" + encodeURIComponent(LibListingForm.clistingListName.value) +
            ((LibListingForm.date.valueAsDate != null) ? ("&date=".concat(LibListingForm.date.valueAsDate.toISOString())) : "") +
            ((LibListingForm.displaytype.value != "") ? ("&dateType=".concat(LibListingForm.displaytype.value)) : "") +
            ((LibListingForm.datecutoff.value != "") ? ("&dateBorder=".concat(LibListingForm.datecutoff.value)) : "") +
            (LibListingForm.versioning.checked == true ? "&versioning=true" : "") +
            (LibListingForm.listFilesOnly.checked == true ? "&listFilesOnly=true" : "") +
            (LibListingForm.includeId.checked == true ? "&includeId=true" : "");
      LibListingForm.generatedUrl.style.display = "inline";
      break;
   }
}

function errorInput(message: string): void {
   alert(message);
}

function copyLibrary() {
    let srcSiteREST: SPSiteREST, destSiteREST: SPSiteREST;

    if (LibListingForm.SourceSiteCopy.value.length == 0)
        return errorInput("Missing valid path URL to site for source library to be copied");
    if (LibListingForm.SourceNameCopy.value.length == 0)
        return errorInput("Missing valid name for source library to be copied");
    if (LibListingForm.DestSiteCopy.value.length == 0)
        return errorInput("Missing valid path URL to site for destination library for copy");
    if (LibListingForm.DestNameCopy.value.length == 0)
        return errorInput("Missing valid name for destination library for copy");
    srcSiteREST = new SPSiteREST({
        server: ParseSPUrl(location.origin)!.server,
        site: LibListingForm.SourceSiteCopy.value
     });
    if (srcSiteREST == null)
        return errorInput("Problem with information on the source site. Check your entries");
    srcSiteREST.init().then(() => {
        srcSiteREST.makeLibCopyWithItems(
           LibListingForm.SourceNameCopy.value,
           LibListingForm.DestSiteCopy.value,
           LibListingForm.DestNameCopy.value
        ).then((response: any) => {
           alert("Success: " + response);
        }).catch((response: any) => {
           alert("Failure: " + response);
        });
    }).catch((response: any) => {
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
            url: LibListingForm.Lib2SitePath.value + "/_api/web/lists/getByTitle('" + LibListingForm.Lib2Name.value +  "')/items" +
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
                        attach: LibListingForm,
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
                errorCallback: (reqObj: JQueryXHR) => {
                  alert("Error on Library 2 request:\n\n" +
                        JSON.stringify(reqObj, null, "  "));
                }
            });
        },
        errorCallback: (reqObj: JQueryXHR/*, status, errThrown */) => {
         alert("Error on Library 1 request:\n\n" +
            JSON.stringify(reqObj, null, "  "));
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
                parentNode = LibListingForm as HTMLFormElement;

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
    headers: (string | makeTableHeaderObject)[] ;
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
}): void {
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
        headerTitle: string,
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
      if (typeof params.headers[i] == "string")
         headerTitle = params.headers[i] as string;
      else {
         headerTitle = (params.headers[i] as makeTableHeaderObject).title;
         tdNode.setAttribute("style", (params.headers[i] as makeTableHeaderObject).style);
      }
      tdNode.appendChild(document.createTextNode(headerTitle));
   }
   if (params.data.length == 0) {
      trNode = document.createElement("tr");
      tblNode.appendChild(trNode);
      tdNode = document.createElement("td");
      trNode.appendChild(tdNode);
      tdNode.setAttribute("colspan", params.headers.length.toString() + 1);
      tdNode.appendChild(document.createTextNode("No items were marked for display in the table"));
      tdNode.style.fontWeight = "bold";
      tdNode.style.fontSize = "150%";
      tdNode.style.color = "red";
      return;
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
            if (typeof value.iValue == "string") {
               if (value.iValue.search(/\$\$/) >= 0)
                  setCellValue(item, value.iValue, value.wrapLink!);
               else
                  tdNode.appendChild(document.createTextNode(value.iValue));
            } if (value.attrib.length > 0) {
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


function updateRequestCount(count: number) {
   let spanElem = document.getElementById("processed-count") as HTMLSpanElement;

   spanElem.replaceChild(document.createTextNode(count.toString()), spanElem.firstChild as ChildNode);
}

function listingOp(
   searchType: string,
   siteName: string,
   libName: string,
   options: string | null,
   insertionPoint: HTMLDivElement
): void {
   let docLibREST = new SPListREST({
         server: SERVER_NAME,
         site: siteName.match(/https:\/\/[^\/]+(.*)/)![1],
         listName: libName
      }),
      zero = 0,
      listItemCount: number,
      spanElem: HTMLSpanElement,
      select: string,
      expand: string,
      selectDisplay: string[],
      leadingPath: RegExpMatchArray | null | string;

   document.getElementById("working")!.style.display = "inline-block";
   leadingPath = siteName.match(/https:\/\/[^\/]+(\/.*)$/)![1];
   // 1. init  2. get the fields of interest, learn their type 3. construct query
   docLibREST.init().then(() => {
      listItemCount = docLibREST.itemCount;
      spanElem = document.getElementById("processed-count")!;
      spanElem.replaceChild(document.createTextNode(zero.toString()),
            spanElem.firstChild as ChildNode);
      spanElem = document.getElementById("total-listing-count")!;
      spanElem.appendChild(document.createTextNode(listItemCount.toString()));

      select = "Id,FileSystemObjectType,File/Name,File/ServerRelativeUrl,File/Length,Folder/Name,Folder/ServerRelativeUrl,Folder/ItemCount,Created,Modified";
      expand = "File,Folder,Folder/Files,Folder/Folders"
      selectDisplay = ["Year", "Rel Standard"];
      docLibREST.getListItemsWithQuery({
         select: select,
         selectDisplay: selectDisplay,
         expand: expand,
         progressReport: {
            interval: 500,
            callback: updateRequestCount
         },
         filter: null
      }).then((response: any) => {
         updateRequestCount(docLibREST.itemCount);

// =========================   Search 'Year' and 'Reliability Standard' ===============
         if (searchType == "searchParametersListing") {
            let yearInfo: TLookupFieldInfo,
            relstdInfo: TLookupFieldInfo,
            itemData: any[] = [],
            infoTable: HTMLTableElement,
            tr: HTMLTableRowElement,
            td: HTMLTableCellElement,
            chkboxElem: HTMLInputElement,
            fileCount: number = 0,
            folderCount: number = 0,
            noYearCount: number = 0,
            noRelStdCount: number = 0,
            noBothCount: number = 0,
            onlyUnset: boolean = false;

            if (options && options?.search(/only-unset/) >= 0)
               onlyUnset = true;
            yearInfo = docLibREST.pullLookupFieldInfo({displayName: "Year"})!;
            relstdInfo = docLibREST.pullLookupFieldInfo({displayName: "Rel Standard"})!;
            for (let item of response.data) {
               let year = item[yearInfo.fieldInternalName][yearInfo.fieldLookupFieldName],
                     relstd = item[relstdInfo.fieldInternalName][relstdInfo.fieldLookupFieldName];

               if (item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FILE)
                  fileCount++;
               else
                  folderCount++;
               if (!year) {
                  year = "not set";
                  if (item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FILE)
                     noYearCount++;
               }
               if (!relstd) {
                  relstd = "not set";
                  if (item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FILE)
                     noRelStdCount++;
               }
               if (item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FILE &&
                        year == "not set" && relstd == "not set")
                  noBothCount++;
               if (onlyUnset == true && ((year != "not set" && relstd != "not set") ||
                           item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FOLDER))
                  continue;

               itemData.push({
                  id: item.Id,
                  name: item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                        item.Folder.Name : item.File.Name,
                  year: year,
                  relstd: relstd,
                  href: item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                        findItemUrl(item, siteName) : findItemUrl(item, siteName, true),
                  filesCount: item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                        item.Folder.Files.results.length : -1,
                  foldersCount: item.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                        (item.Folder.ItemCount - item.Folder.Files.results.length) : -1,
                  created: item.Created,
                  modified: item.Modified,
                  type: item.FileSystemObjectType
               });
            }

            insertionPoint.appendChild(infoTable = document.createElement("table"));
            infoTable.id = "info-table";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("Document Library: "));
            td.className = "table-label";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(docLibREST.listName));
            td.id = "title-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("Total Items: "));
            td.className = "table-label";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(listItemCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("Folder Items: "));
            td.className = "table-label";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(folderCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("File Items: "));
            td.className = "table-label";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(fileCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("File Items Missing 'Year': "));
            td.className = "table-label-smaller";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(noYearCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("File Items Missing 'Reliability Standard': "));
            td.className = "table-label-smaller";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(noRelStdCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("File Items Missing Both 'Year' & 'Reliability Standard': "));
            td.className = "table-label-smaller";
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode(noBothCount.toString()));
            td.className = "item-value";

            tr = document.createElement("tr");
            infoTable.appendChild(tr);
            td = document.createElement("td");
            tr.appendChild(td);
            td.appendChild(document.createTextNode("Show only file items in table with unset values: "));
            td.className = "table-label-smaller";
            td = document.createElement("td");
            tr.appendChild(td);
            chkboxElem = document.createElement("input");
            chkboxElem.type = "checkbox";
            chkboxElem.id = "unset-items-only";
            chkboxElem.addEventListener("change", (evt: Event) => {
               if ((evt.currentTarget as HTMLInputElement).checked == true)
                  location.assign(location.href += "&options=only-unset");
               else
                  location.assign(location.href.replace("&options=only-unset", ""));
            });
            td.appendChild(chkboxElem);
            td.className = "item-value";

            makeTable({
               title: "Folders and Files in " + libName + " with Required Values settings",
               subtitle: "(Site: " + siteName + ")",
               headers: [ "ID", "Folder or File Name",
                  { title: "Year", style: "width:6em;" } ,
                  { title: "Rel. Std", style: "width:9em;" }, "Contained Items", "Modified", "Created" ],
               display: [
                  () => { return "$$id" },
                  (item) => { return {
                        attrib: item.type == FILE_SYSTEM_OBJECT_TYPE_FILE ? "class=right italic" :
                              item.type == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                                 "class=bold" : "class=green bold",
                        iValue: "$$name",
                        wrapLink: item.href
                     }
                  },
                  () => { return {
                        attrib: "class=bold center",
                        iValue: "$$year"
                     }
                  },
                  () => { return {
                        attrib: "class=bold center",
                        iValue: "$$relstd"
                     }
                  },
                  (item) => {
                     return {
                        attrib: "class=whitespace center",
                        iValue: item.type == FILE_SYSTEM_OBJECT_TYPE_FOLDER ?
                              "file count: $$filesCount\nsubfolders count: $$foldersCount" : "<file>"
                     }
                  },
                  (item) => { return new Date(item.modified).toLocaleDateString() },
                  (item) => { return new Date(item.created).toLocaleDateString() },
               ],
               data: itemData,
               attach: insertionPoint,
               options: ["addCounter{1}"]
            });
            document.getElementById("working")!.style.display = "none";
            if (options && options?.search(/only-unset/) >= 0)
               (document.getElementById("unset-items-only") as HTMLInputElement).checked = true;

// =========================   Folders With Their Files  ===============

         } else if (searchType == "foldersWithTheirFiles") {
            let data: any[] = response.data,
               files: libItem[] = [],
               folders: libItemEx[] = [],
               relUrl: string = data[0].ServerRelativeUrl,
               found: boolean,
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
               },
               tree: HTMLDivElement;

            for (let datum of data)
               if (datum.FileSystemObjectType == FILE_SYSTEM_OBJECT_TYPE_FILE)
                  files.push({
                     id: datum.Id,
                     name: datum.File.Name,
                     type: 0,
                     originalUrl: datum.File.ServerRelativeUrl,
                     relativeUrl: findItemUrl(datum, siteName),
                     size: datum.File.Length,
                     created: datum.Created,
                     modified: datum.Modified,
                     tag: ""
                  });
               else   //   FILE_SYSTEM_OBJECT_TYPE_FOLDER
                  folders.push({
                     id: datum.Id,
                     name: datum.Folder.Name,
                     type: 1,
                     originalUrl: datum.Folder.ServerRelativeUrl,
                     relativeUrl: findItemUrl(datum, siteName),
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

*/
            for (let file of files) {
               found = false;
               for (let folder of folders)
                  if (file.relativeUrl == folder.relativeUrl + "/" + file.name) {
                     folder.itsFiles.push(file);
                     found = true;
                     break;
                  }
               if (found == false)
                  rootFolder.itsFiles.push(file);
            }
            for (let folder1 of folders)
               for (let folder2 of folders)
                  if (folder1.relativeUrl == folder2.relativeUrl + "/" + folder1.name)
                     folder2.itsFolders.push(folder1);
            for (let folder of folders)
               if (folder.relativeUrl == docLibREST.serverRelativeUrl + "/" + folder.name) {
                  rootFolder.itsFolders.push(folder);
               }
            insertionPoint.appendChild(tree = document.createElement("div"));
            tree.style.marginLeft = "5em";
            spanElem = document.createElement("span");
            tree.appendChild(spanElem);
            spanElem.style.font = "bold 120% 'Segoe UI',sans-serif";
            spanElem.style.color = "navy";
            spanElem.appendChild(document.createTextNode(libName));
            tree.appendChild(document.createElement("br"));
            spanElem = document.createElement("span");
            tree.appendChild(spanElem);
            spanElem.style.font = "bold 100% Tahoma,sans-serif";
            spanElem.appendChild(document.createTextNode("*** root level ***"));
            layoutFolder(
               rootFolder,
               {
                  level: 0,
                  levelItemCounts: []
               },
               tree
            );

 //              folders.push(rootFolder);
            // put 'Archive' folders first
            /*
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

            makeTable({
               title: "Folders and Their Files in " + libName,
               subtitle: "(Site: " + siteName + ")",
               headers: [ "ID", "Folder or File Name", "Size", "Modified", "Created" ],
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
                  (item) => { return new Date(item.modified).toLocaleDateString() },
                  (item) => { return new Date(item.created).toLocaleDateString() },
                  ],
               data: sortedItems,
               attach: insertionPoint,
               options: ["addCounter{1}"]
            });  */
            document.getElementById("working")!.style.display = "none";

// =========================   Duplicate File Listing  ===============

        } else if (searchType == "fileduplicates") {
            let data = response.data,
               files: libItem[] = [],
               folders: libItem[] = [],
               dupFiles: libItem[] = [],
               dupFolders: libItem[] = [],
               dupTags: string[] = [ "first", "second", "third", "fourth", "fifth", "sixth", "seventh" ];

            for (let datum of data)
               if (datum.FileSystemObjectType == 0)
                  files.push({
                     id: datum.Id,
                     name: datum.File.Name,
                     type: 0,
                     originalUrl: datum.File.ServerRelativeUrl,
                     relativeUrl: datum.File.ServerRelativeUrl.substring(docLibREST.serverRelativeUrl.length),
                     parentPath: datum.File.ServerRelativeUrl.substring(docLibREST.serverRelativeUrl.length,
                              datum.File.ServerRelativeUrl.lastIndexOf("/")),
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
                     relativeUrl: datum.Folder.ServerRelativeUrl.substring(docLibREST.serverRelativeUrl.length),
                     parentPath: datum.Folder.ServerRelativeUrl.substring(docLibREST.serverRelativeUrl.length,
                              datum.Folder.ServerRelativeUrl.lastIndexOf("/")),
                     size: -1,
                     created: datum.Created,
                     modified: datum.Modified,
                     tag: ""
                  });

            files.sort((a: any, b: any) => {
               return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
            });

            for (let i = 0, duping = false, index = 0; i < files.length; i++)
               if (i < files.length - 1 && files[i].name == files[i + 1].name) {
                  duping = true;
                  files[i].tag = dupTags[index++];
                  dupFiles.push(files[i]);
               } else if (duping == true) {
                  files[i].tag = dupTags[index];
                  dupFiles.push(files[i]);
                  duping = false;
                  index = 0;
               }

/*
            for (let i = 0; i < files.length - 1; i++)
               if (files[i].name == files[i + 1].name) {
                  dupFiles.push(files[i]);
                  duping = true;
               } else if (duping == true) {
                  dupFiles.push(files[i]);
                  duping = false;
               } */

            makeTable({
               title: "Replicate File Names in " + libName,
               subtitle: "(Site: " + siteName + ")",
               headers: [ "ID", "File Name", "Parent Path", "Size", "Created", "Modified" ],
               display: [
                  () => { return "$$id" },
                  (item) => { return {
                        attrib: "class=" + item.tag,
                        iValue: "$$name",
                        wrapLink: item.originalUrl
                     }
                  },
                  (item) => { return {
                        attrib: "",
                        iValue: "$$parentPath",
                        wrapLink: item.originalUrl.substring(0, item.originalUrl.lastIndexOf("/"))
                     }
                  },
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

            for (let i = 0, duping = false, index = 0; i < folders.length; i++)
               if (i < folders.length - 1 && folders[i].name == folders[i + 1].name) {
                  duping = true;
                  folders[i].tag = dupTags[index++];
                  dupFolders.push(folders[i]);
               } else if (duping == true) {
                  folders[i].tag = dupTags[index];
                  dupFolders.push(folders[i]);
                  duping = false;
                  index = 0;
               }
/*
            for (let i = 0; i < folders.length - 1; i++)
               if (folders[i].name == folders[i + 1].name) {
                  dupFolders.push(folders[i]);
                  duping = true;
               } else if (duping == true) {
                  dupFolders.push(folders[i]);
                  duping = false;
               } */

            makeTable({
               title: "Replicate Folder Names in " + libName,
               subtitle: "(Site: " + siteName + ")",
               headers: [ "ID", "Folder Name", "Parent Path", "Created", "Modified" ],
               display: [
                  () => { return "$$id" },
                  (item) => { return {
                        attrib: "class=" + item.tag,
                        iValue: "$$name",
                        wrapLink: item.originalUrl
                     }
                  },
                  (item) => { return {
                        attrib: "",
                        iValue: "$$parentPath",
                        wrapLink: item.originalUrl.substring(0, item.originalUrl.lastIndexOf("/"))
                     }
                  },
                  (item) => { return new Date(item.created).toLocaleDateString() },
                  (item) => { return new Date(item.modified).toLocaleDateString() },
                  ],
               data: dupFolders,
               attach: insertionPoint,
               options: ["addCounter{1}"]
            });
            document.getElementById("working")!.style.display = "none";
        }
      }).catch((response: any) => {
         console.log("SPListREST.getItemsWithQuery() failure: " + JSON.stringify(response, null, "  "));
      });
   }).catch((response: any) => {
      console.log("SPListREST.init() failure: " + JSON.stringify(response, null, "  "));
   });

   /**
    * @function layoutFolder -- used by list folder with files section
    *     this is a closure
    */
   function layoutFolder(
      folder: libItemEx,
      levelInfo: {
         level: number;
         levelItemCounts: number[];
      },
      tree: HTMLElement
   ): void {
      let typedText: string,
         line: number,
         folderItems: (libItem | libItemEx)[];

      folderItems = folder.itsFolders.concat(folder.itsFiles);
      folderItems.sort((elem1, elem2) => {
         return elem1.name > elem2.name ? 1 : elem1.name < elem2.name ? -1 : 0;
      });
      levelInfo.levelItemCounts.push(folderItems.length);
      for (let item of folderItems) {
         typedText = "\n";
         for (line = 0; line < levelInfo.level; line++)
            typedText += BOX_DRAWINGS_LIGHT_VERTICAL + '\u00a0\u00a0\u00a0\u00a0\u00a0';
         if (levelInfo.levelItemCounts[levelInfo.level] == 1)
            typedText += BOX_DRAWINGS_LIGHT_UP_AND_RIGHT;
         else
            typedText += BOX_DRAWINGS_LIGHT_VERTICAL_AND_RIGHT;
         typedText += BOX_DRAWINGS_LIGHT_HORIZONTAL + BOX_DRAWINGS_LIGHT_HORIZONTAL + '\u00a0';
         spanElem = document.createElement("span");
         tree.appendChild(spanElem);
         spanElem.appendChild(document.createTextNode(typedText));
         spanElem.className = "monotype";
         spanElem = document.createElement("span");
         tree.appendChild(spanElem);
         spanElem.appendChild(document.createTextNode(item.name));
         levelInfo.levelItemCounts[levelInfo.level]--;
         if (item.type == FILE_SYSTEM_OBJECT_TYPE_FOLDER) {
            spanElem.className = "tree-folder";
            layoutFolder(
               item as libItemEx,
               {
                  level: levelInfo.level + 1,
                  levelItemCounts: levelInfo.levelItemCounts
               },
               tree
            );
         } else if (levelInfo.levelItemCounts[levelInfo.level] == 0) {
            levelInfo.level--;
            if (levelInfo.levelItemCounts.length == 1)
               throw "error in code: about to pop() array with length already 1";
               levelInfo.levelItemCounts.pop();
         }
         if (levelInfo.level < 0)
            throw "error in code: level < 0";
      }
      return;
   }
}

function customListing() {
   document.getElementById("request-controls")!.style.display = "none";
   document.getElementById("custom-listing")!.style.display = "block";
   document.getElementById("custom-listing-genurl")!.style.display = "inline";
}

/**
 * @function updateListing -- creates a special table of files adn folders (early version of these things)
 * @param options
 * @calledby LibraryListing.aspx button 'Update Listing'
 * @calls processData()
 */
function updateListing(options?: TListingOptions) {
   const form: HTMLFormElement = document.getElementById("LibListingForm") as HTMLFormElement;
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
      	successCallback: (data: any) => {
     //    	progressAlert("hide");
 //           FirstRun = true;
            if (data.d && data.d.results)
                processData(data.d.results, options);
            else if (Array.isArray(data) == true)
                processData(data as any[], options);
            else
                alert("An exception occurred!");
        },
        errorCallback: (reqObj: JQueryXHR) => {
 //           progressAlert("hide");
 //           progressAlert("error");
            console.log("URL => " + url);
            console.log(JSON.stringify(reqObj, null, "  "));
        }
    });
}

/**
 * @function processData -- the workhorse for making the table
 * @param itemsData
 * @param options
 * @calledby updateListing()
 */
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
        successCallback: (data: any) => {
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
                successCallback: (data: any) => {
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
                                successCallback: (data: any, text?: string, reqObj?: JQueryXHR) => {
                                    console.log("response data => " +
                                        JSON.stringify(data) +
                                        "\nrequestObj => " +
                                        JSON.stringify(reqObj));
                                },
                                errorCallback: (reqObj: JQueryXHR) => {
                                    console.log(JSON.stringify(reqObj, null, "  "));
                                }
                            });
                        }, 5000);
                    }
                },
                errorCallback: (reqObj: JQueryXHR) => {
                  console.log(JSON.stringify(reqObj, null, "  "));
               }
            });
        },
        errorCallback: (reqObj: JQueryXHR) => {
         console.log(JSON.stringify(reqObj, null, "  "));
      }
    });
}
