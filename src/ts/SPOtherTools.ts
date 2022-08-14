
"use strict";
/* jshint -W069 */

import { SPListREST } from '../../SPREST/src/SPListREST';
import * as SPRESTSupportLib from '../../SPREST/src/SPRESTSupportLib';
import { SiteUrl } from './liblisting';

const
   server = "https://cawater.sharepoint.com",
   site = "/teams/comm-cpr",
   list = "O&P Evidence_Copy",
   lowId = 5350,
   highId = 7618;


function specialMetadataCopy(): void {
// 1. get the file name and metadata of the target list
   let copyList: SPListREST = new SPListREST({
         server: server,
         site: site,
         listName: list
      });
     copyList.init().then(() => {
     copyList.getListItems({lowId: lowId, highId: highId}).then((items) => {
      let requests: {
         url: string;
         body: any
      }[] = [],
         body: any,
         property: string,
         value: RegExpMatchArray | null,
         standardRE: RegExp = /[A-Z]{3}\-\d{3}/;

      if (Array.isArray(items) == false)
         if (items.d)
            items = items.d.results;
         else if (items.data)
            if (items.data.d)
               items = items.data.d.results;
            else
               items = items.data;
//      items = items.slice(0, 100);
      for (let item of items) {
         body = {};
         body.__metadata = { type: "SP.Data.OP_x0020_Evidence_x005f_CopyItem" };
         if (item.Reliability_x0020_Standard != null &&  (property = item.Reliability_x0020_Standard.results)) {
            if (property[0] == "zz_No Standard")
               body["StandardsId"] = copyList.getLookupFieldValue("Standards", "No Standard");
            else if ((value = property[0].match(standardRE)) != null)
               body["StandardsId"] =  copyList.getLookupFieldValue("Standards", value[0]);
            if (property[1] && (value = property[1].match(standardRE)) != null)
               body["Rel_x002e__x0020_Standard_x0020_2Id"] = copyList.getLookupFieldValue("Standards", value[0]);
            if (property[2] && (value = property[2].match(standardRE)) != null)
               body["Rel_x002e__x0020_Standard_x0020_3Id"] = copyList.getLookupFieldValue("Standards", value[0]);
         }
         if (Object.entries(body).length < 2)
            continue;
         requests.push({
            url: server + site + "/_api/web/lists/getByTitle('" + list + "')/items(" + item.Id + ")",
            body: body
         });
      }
      SPRESTSupportLib.batchRequestingQueue({
         AllMethods: "PATCH",
         AllHeaders: {
            "Content-Type": "application/json;odata=verbose",
            "IF-MATCH": "*" //, // can also use etag
         },
         host: "cawater.sharepoint.com",
         path: "/teams/comm-cpr"
      }, requests).then((response) => {
         console.log(typeof response == "object" ? JSON.stringify(response, null, "  ") : response);
         alert("All done");
      }).catch((response) => {
         console.log(typeof response == "object" ? JSON.stringify(response, null, "  ") : response);
         alert("error!");
      });
   }).catch((response) => {
      console.log(typeof response == "object" ? JSON.stringify(response, null, "  ") : response);
      alert("error!");
   });
   });
}

function getBatchResults() {
   let requests = [];

   for (let i = 0; i < 25; i++)
      requests.push({
         url: server + site + "/_api/web/lists/getByTitle('" + list + "')/items(" +
               (Math.random() * 5000) + ")"
      });
      SPRESTSupportLib.batchRequestingQueue({
      AllMethods: "GET",
      AllHeaders: {
         "Accept": "application/json;odata=verbose",
         "Content-Type": "application/json;odata=verbose"
      },
      host: "cawater.sharepoint.com",
      path: "/teams/comm-cpr"
   }, requests).then((response) => {
      console.log(response);
   }).catch((response) => {
      console.log(response);
   });
}

function copylist(buttonObj: HTMLButtonElement) {
   let form = buttonObj.form as HTMLFormElement,
      selectObj: HTMLSelectElement = form["site-lists2"];
/*
   CurrentSite.restInterface.makeLibCopyWithItems(
      selectObj.options[selectObj.selectedIndex].value.split(";")[1],
      form.newCopyName.value,
      parseInt(form.itemsToCopy.value)
   ).then(() => {

   }).catch(() => {

   }); */
}

function copyFiles() {
   SPRESTSupportLib.RESTrequest({
         url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/_api/web/lists/getByTitle('PSMP')" +
               "/items/?$filter=Created ge datetime'2021-02-18T08:00:00.000Z'&$expand=File",
         method: "GET",
         successCallback: (data: any) => {
            let folNames: RegExpMatchArray,
               fileData: {
                  name: string;
                  folderRelativeUrl: string;
                  fileRelativeUrl: string;
                  metadata: string;
               }[] = [ ],
               metadata: {[key:string]: string},
               formattedMetadata: string,
               item: any,
               newUrlPrefix =  "https://cawater.sharepoint.com/teams/swp-dom/RSO/Test";

            for (item of data.d.items) {
               if (item.FileSystemObjectType == 1) { // folder
                     continue;
               }
               metadata = {};
               folNames = item.File.ServerRelativeUrl.match(/[\d\.]+\s\-\s([^\/]+)/g);
               for (let i = 0; i < folNames.length; i++) {
//                    if (folNames[i].search(/^\s*[\d\-\.]{1,6}/) >= 0) // no grouping done
                     folNames[i] = folNames[i].match(/[\d\.]+\s*\-\s*(.*)/)![1];
                     metadata["Level_x0020_" + (i + 1)] =  folNames[i];
               }
               formattedMetadata = SPRESTSupportLib.formatRESTBody(metadata);
               fileData.push({
                     name: item.File.Name,
                     folderRelativeUrl: "https://cawater.sharepoint.com/teams/swp-dom/RSO/PSMP",
                     fileRelativeUrl: item.File.ServerRelativeUrl,
                     metadata: formattedMetadata
               });
            }

            for (let file of fileData)
               SPRESTSupportLib.RESTrequest({
                     setDigest: true,
                     url: "https://cawater.sharepoint.com/teams/swp-dom/RSO/_api/web/folders/getByUrl('" +
                        file.folderRelativeUrl + "')/files/getByUrl('" + file.fileRelativeUrl +
                        "')/copyTo('" + newUrlPrefix + "', false)",
                     method: "POST",
                     successCallback: (data) => {
                        console.log(JSON.stringify(data, null, "  "));
                     },
                     errorCallback: (reqObj) => {
                        console.log(JSON.stringify(reqObj, null, "  "));
                     }
               });
         },
         errorCallback: (reqObj, url) => {
            console.log("URL => " + url);
            console.log(JSON.stringify(reqObj, null, "  "));
         }
   });
}

/****************************************************************************
 *
 *    SITE THEME SETTING
 *
 * Theme properties in JSON:
 *
 * var pal = {
    "palette" : {
          "themePrimary": "#1BF242",
         "themeLighterAlt": "#0d0b00",
         "themeLighter": "#0b35bc",
         "themeLight": "#322d00",
         "themeTertiary": "#6a5f00",
         "themeSecondary": "#1B22F2",
         "themeDarkAlt": "#ffe817",
         "themeDark": "#ffed4b",
         "themeDarker": "#fff171",
         "neutralLighterAlt": "#252525",
         "neutralLighter": "#282828",
         "neutralLight": "#313131",
         "neutralQuaternaryAlt": "#3f3f3f",
         "neutralQuaternary": "#484848",
         "neutralTertiaryAlt": "#4f4f4f",
         "neutralTertiary": "#c8c8c8",
         "neutralSecondaryAlt": "#d0d0d0",
         "neutralSecondary": "#dadada",
         "neutralPrimary": "#ffffff",
         "neutralDark": "#eaeaea",
         "black": "#f8f8f8",
         "white": "#1f1f1f",
         "primaryBackground": "#1f1f1f",
         "primaryText": "#ffffff",
         "error": "#ff5f5f"
      }
   }
   *
   ****************************************************************************/

function themeRequest(
   themeAction: "AddTenantTheme" | "DeleteTenantTheme" | "GetTenantThemingOptions" | "ApplyTheme" | "UpdateTenantTheme",
   name?: string,
   properties?: string
): void {
   let requestProperties: {
      name: string | null;
      themeJson: string | null;
   } = { name: null, themeJson: null };

   if (name)
      requestProperties.name = name;
   if (properties)
      requestProperties.themeJson = properties;
   SPRESTSupportLib.RESTrequest({
      setDigest: true,
      url: SiteUrl + "/_api/ThemeManager/" + themeAction,
      method: "POST",
      headers: {
         "Accept": "application/json;odata=verbose",
         "Content-Type": "application/json;odata=verbose",
      },
      data: JSON.stringify(requestProperties),
      successCallback: (data/*, text, reqObj */) => {

      },
      errorCallback: (reqObj/*, status, errThrown */) => {

      }
   });
}

function addTenantTheme(name: string, properties: string) {  // create new theme in tenant store
   return themeRequest("AddTenantTheme", name, properties);
}

function deleteTenantTheme(name: string) {  // remove theme from tenant store
   return themeRequest("DeleteTenantTheme", name);
}

function getTenantThemingOptions() {  // read the theme settings
   return themeRequest("GetTenantThemingOptions");
}

function applyTheme(name: string, properties: string) {  // apply tenant theme to site
   return themeRequest("ApplyTheme", name, properties);
}

function updateTenantTheme(name: string, properties: string) {  // updates tenant theme def
   return themeRequest("UpdateTenantTheme", name, properties);
}
