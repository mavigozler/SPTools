"use strict";

type TShortFieldInfo = {
   id: string;
   name: string;
}

let lastMenuSelect: HTMLSelectElement,
      ErrorState: boolean = false,
      CurrentPageId: string,
/*
      ServerInfo = {
       // Site Properties
       // Web Properties
      },
      SitesInfo = [
         //  Site info: {
         //     site properties: ,
         //     web properties: ,
         //     url: , id:, name:,
         //     lists: [ guids,.. ],
         //     subsites: [ guids,.. ]
         //     restInterface: SPSiteREST reference }
      ],
      ListsInfo = [
         //   { .rawFields: [{REST item}],
         //        fieldsInfo [{id:, name: }]
         //    id:, name: , , items:
         //  current Id, current index
      ],
      UsersInfo = [

      ], */
      CurrentServer: {
         [key:string]: string;
      },
      CurrentSite: {
         initialized: boolean;
         restInterface: SPSiteREST;
         siteProperties: any;
         webProperties: any;
         contentTypes: any;
         siteLists: any;
         [key:string]: any;
      },
      CurrentList: {
         id: string | null;
         name: string | null;
         currentIndex: number;
         itemIds: any;
         currentItemId: number | undefined;
         restInterface: SPListREST | null;  //  {   }
         itemTableInitialized: boolean;
         rawFields: any[];
         nonBaseTypeFields: any[];
         fieldsInfo: TShortFieldInfo[];
         nonBaseFieldsInfo: TShortFieldInfo[];
      };

function displayPage(which: string): void {
   document.getElementById(CurrentPageId)!.style.display = "none";
   document.getElementById(CurrentPageId = which)!.style.display = "block";
}

/**
 * @function initializeTab --
 * @param {string} tabName
 * @returns
 */
function initializeTab(tabName: string): void {
   let node: HTMLElement,
      temp: string,
      oNode: HTMLOptionElement,
      form: HTMLFormElement = document.getElementById("main-form") as HTMLFormElement,
      parsedUrl: TParsedURL | null = ParseSPUrl(location.href),
      spServerREST: SPServerREST = new SPServerREST({
         URL: parsedUrl!.server
      }),
      selectObj: HTMLSelectElement,
      spSiteREST: SPSiteREST,
      spListREST: SPListREST,
      setOneOptionError = (selectListName: string, optionText: string) => {
         let oNode = document.createElement("option"),
               selectNode = form[selectListName];
         while (selectNode.firstChild)
            selectNode.removeChild(selectNode.firstChild);
         oNode.appendChild(document.createTextNode(optionText));
         selectNode.appendChild(oNode);
      };

   switch (tabName) {
// server panel build
   case "server":
      form["server-name"].value = parsedUrl!.server;
      node = form["sites-list"];
      while (node.firstChild)
         node.removeChild(node.firstChild);
      // retrieve name or root web
      spServerREST.getRootweb().then((response) => {
         oNode = document.createElement("option");
         oNode.value = response.data.d.Id;
         oNode.appendChild(document.createTextNode(response.data.d.Title));
         node.appendChild(oNode);
      }).catch((response) => {
         if (response.reqObj.status == 403)
            setOneOptionError("sites-list", "no permission");
         else
            setOneOptionError("sites-list", response.reqObj.status + ": unknown error");
      });
      // get the SITE and WEB properties of server
      spServerREST.getSiteProperties().then((response) => {
         let value, properties = response.data.d,
               node = form["server-properties"];

         while (node.firstChild)
               node.removeChild(node.firstChild);
         for (let prop in properties) {
            oNode = document.createElement("option");
            if (typeof properties[prop] == "object")
               value = "site/" + prop + " { }";
            else
               value = "site/" + prop;
            oNode.appendChild(document.createTextNode(value));
            oNode.value = value;
            node.appendChild(oNode);
         }
         spServerREST.getWebProperties().then((response) => {
            let value, properties = response.data.d;

            while (node.firstChild)
               node.removeChild(node.firstChild);
            for (let prop in properties) {
               oNode = document.createElement("option");
               if (typeof properties[prop] == "object")
                  value = "web/" + prop + " { }";
               else
                  value = "web/" + prop;
               oNode.appendChild(document.createTextNode(value));
               oNode.value = value;
               node.appendChild(oNode);
            }
         }).catch((response) => {
            oNode = document.createElement("option");
            oNode.appendChild(document.createTextNode(response.text));
            node.appendChild(oNode);
         });
      }).catch((response) => {
         setOneOptionError("server-properties", response.text);
      });
      break;
   case "site":
// SITE panel build
   //   if (CurrentSite && CurrentSite.initialized && CurrentSite.initialized == true)
   //      return;
      if ((parsedUrl = ParseSPUrl(form["site-name"].value)) == null)
         throw "no url";
      if ((spSiteREST = new SPSiteREST({
         server: parsedUrl.server,
         site: parsedUrl.siteFullPath
      })) instanceof SPSiteREST == false) {
         let errorSet = document.getElementById("site-error-set");

         ErrorState = true;
         errorSet!.replaceChild(document.createTextNode(
            "404 -- URL invalid: no such site"
         ), errorSet!.firstChild as ChildNode);
         return;
      }
      spSiteREST.init().then(() => {
         CurrentSite = {
            restInterface: spSiteREST,
            siteProperties: null,
            webProperties: null,
            contentTypes: null,
            initialized: false,
            siteLists: null
         };
         // get SITE and WEB properties of the one site
         spSiteREST.getSiteProperties().then((response: any) => {
            let value: string,
                  properties: any = response.data.d,
                  node: HTMLElement = form["site-properties"];

            // since the site was found, store it for next time
            localStorage.setItem("SPToolsLastSite", parsedUrl!.server + "/" + parsedUrl!.siteFullPath);
            while (node.firstChild)
               node.removeChild(node.firstChild);
            for (let prop in properties) {
               oNode = document.createElement("option");
               if (typeof properties[prop] == "object")
                  value = "site/" + prop + " { }";
               else
                  value = "site/" + prop;
               oNode.appendChild(document.createTextNode(value));
               oNode.value = value;
               node.appendChild(oNode);
            }
            CurrentSite.siteProperties = properties;
            spSiteREST.getWebProperties().then((response: any) => {
               let value: string,
                  properties: any = response.data.d;

               for (let prop in properties) {
                  oNode = document.createElement("option");
                  if (typeof properties[prop] == "object")
                     value = "web/" + prop + " { }";
                  else
                     value = "web/" + prop;
                  oNode.appendChild(document.createTextNode(value));
                  oNode.value = value;
                  node.appendChild(oNode);
               }
               CurrentSite.webProperties = properties;
            }).catch((response) => {
               setOneOptionError("web-properties", response.text);
            });
         }).catch((response) => {
            setOneOptionError("site-properties", response.text);
         });
         // get list of SUBSITES of site
         spSiteREST.getSubsites().then((response: any) => {
            let node = form["subsites-list"];
            while (node.firstChild)
               node.removeChild(node.firstChild);
            if (response.length == 0) {
               oNode = document.createElement("option");
               oNode.appendChild(document.createTextNode("No subsites found"));
               node.appendChild(oNode);
            } else
               for (let item of response) {
                  oNode = document.createElement("option");
                  if (item.name.length == 0) {
                     item.name = "<a real, actual site with no name>";
                     oNode.className = "special-option";
                  }
                  oNode.appendChild(document.createTextNode(item.name));
                  oNode.value = item.id;
                  node.appendChild(oNode);
               }
         }).catch((response) => {
            setOneOptionError("subsites-list", response.text);
         });
         spSiteREST.getSiteContentTypes({
            expand: "Parent"
         }).then((response) => {
            let node = form["site-content-types"], items = response.data.d.results;
            while (node.firstChild)
               node.removeChild(node.firstChild);
            if (response.length == 0) {
               oNode = document.createElement("option");
               oNode.appendChild(document.createTextNode("No content types found"));
               node.appendChild(oNode);
            } else {
               for (let item of items) {
                  oNode = document.createElement("option");
                  if (item.Name.length == 0) {
                     item.Name = "<a real, actual content type with no name>";
                     oNode.className = "special-option";
                  }
                  oNode.appendChild(document.createTextNode(item.Name));
                  oNode.value = item.Id.StringValue;
                  node.appendChild(oNode);
               }
               CurrentSite.contentTypes = items;
            }
         }).catch((response) => {
            setOneOptionError("site-content-types", response.text);
         });
         // get the lists of LISTS and LIBRARIES of site
         spSiteREST.getLists().then((response) => {
            let lists = response.data.d.results,
                  node = form["site-lists"],
                  node2 = form["site-lists2"];

            if (lists.length == 0) {
               oNode = document.createElement("option");
               oNode.appendChild(document.createTextNode("No lists or libs found"));
               node.appendChild(oNode);
            } else {
               for (let box of [node, node2])
                  while (box.firstChild)
                     box.removeChild(box.firstChild);
               for (let box of [node, node2])
                  for (let list of lists) {
                     oNode = document.createElement("option");
                     oNode.appendChild(document.createTextNode(list.Title));
                     oNode.value = list.Id + ";" + list.Title;
                     box.appendChild(oNode);
                  }
            }
            CurrentSite.siteLists = lists;
         }).catch((response) => {
            setOneOptionError("site-lists", response.text);
         });
         CurrentSite.initialized = true;
      }).catch((response) => {
         setOneOptionError("site-lists", "SP Site REST initialization failure");
      });
      break;
   case "list":
// list panel build
      if ((parsedUrl = ParseSPUrl(form["site-name"].value)) == null)
         throw "this error";
      selectObj = form["site-lists2"];
      if (selectObj.selectedIndex < 0)
         return;
      CurrentList = {
         id: null,
         name: null,
         itemIds: null,
         currentIndex: 0,
         currentItemId: undefined,
         itemTableInitialized: false,
         restInterface: null,
         rawFields: [],
         nonBaseTypeFields: [],
         fieldsInfo: [],
         nonBaseFieldsInfo: []
      };
      temp = selectObj.options[selectObj.selectedIndex].value;
      CurrentList.name = temp.split(";")[1];
      CurrentList.id = temp.split(";")[0];

      spListREST = new SPListREST({
         server: parsedUrl.server,
         site: parsedUrl.siteFullPath,
         listName: CurrentList.name
      });
      spListREST.init().then(() => {
         CurrentList.restInterface = spListREST;
         // populate ITEMS table of list
         spListREST.getListItemIds().then((response: any) => {
            CurrentList.itemIds = response;
            updateListTables("ids", CurrentList.itemIds);
            fetchListItemId(form);
         }).catch((response) => {
            node = document.getElementById("list-error") as HTMLElement;
            node.replaceChild(document.createTextNode(
               "List error: " + (response.error ? response.error.message.value : response.message)
            ), node.firstChild as ChildNode);
         });
         spListREST.getListProperties().then((response) => {
            updateListTables("listprops", response.data.d);
         }).catch((response) => {
            node = document.getElementById("list-error") as HTMLElement;
            node.replaceChild(document.createTextNode(
               "List error: " + (response.error ? response.error.message.value : response.message)
            ), node.firstChild as ChildNode);
         });
         // populate COLUMNS table of list
         spListREST.getFields().then((response) => {
            let options: {
               text: string;
               value: string;
               selected: boolean;
            }[] = [ ],
               fieldSelectorPNode = document.getElementById("field-selector") as HTMLParamElement;

            CurrentList.rawFields = response.data.d.results; // save items
            // get the fields that are user-defined (nonBaseType)
            for (let field of CurrentList.rawFields!)
               if (field.FromBaseType == false) {
                  CurrentList.nonBaseTypeFields.push(field);
                  CurrentList.nonBaseFieldsInfo.push({
                     id: field.Id,
                     name: field.Title
                  });
                  options.push({
                     text: field.Title,
                     value: field.Id,
                     selected: true
                  });
               } else {
                  CurrentList.fieldsInfo.push({
                     id: field.Id,
                     name: field.Title
                  });
                  options.push({
                     text: field.Title,
                     value: field.Id,
                     selected: false
                  });
               }
   // List Copy fieldset operations:  remove the Available/Selected fields control
            while (fieldSelectorPNode.firstChild)
               fieldSelectorPNode.removeChild(fieldSelectorPNode.firstChild);
            // build new one
            buildSelectSet(
               fieldSelectorPNode,
               "listcopyfieldsselect",
               options,
               5,
               5,
               (event) => {  // update field selector
                  let field: any,
                     mainNode = document.querySelector("#selections tbody") as HTMLTableSectionElement,
                     trNode: HTMLTableRowElement,
                     tdNode: HTMLTableCellElement,
                     selectObj = event.target as HTMLSelectElement;

                  while (mainNode.firstChild)
                     mainNode.removeChild(mainNode.firstChild);
                  for (let option of selectObj.options) {
                     for (field of CurrentList.rawFields!)
                        if (field.Id == option.value)
                           break;
                     trNode = document.createElement("tr");
                     mainNode.appendChild(trNode);
                     tdNode = document.createElement("td");
                     trNode.appendChild(tdNode);
                     tdNode.appendChild(document.createTextNode(field.Name));
                     tdNode = document.createElement("td");
                     trNode.appendChild(tdNode);
                     tdNode.appendChild(document.createTextNode(field.FieldTypeKind));
                  }
               }
            );
//            CurrentList.fieldsInfo = [ ];
//            for (let field of CurrentList.rawFields!)
//               CurrentList.fieldsInfo.push({id: field.Id, name: field.Title});
            updateListTables("fields-init", CurrentList.fieldsInfo);
         }).catch((response) => {
            node = document.getElementById("list-error") as HTMLSpanElement;
            node.replaceChild(document.createTextNode(
               "List error: " + (response.error ? response.error.message.value : response.message)
            ), node.firstChild as ChildNode);
         });
      }).catch(() => {
         node = document.getElementById("list-error") as HTMLSpanElement;
         node.replaceChild(document.createTextNode(
            "List error: list REST initialization failure"), node.firstChild as ChildNode);
      });
      break;
   case "user":
      break;
   }
}

/**
 * @function updateXcludeBaseTypes
 * @param which -- whether to show or not show BaseTypes
 */
function updateXcludeBaseTypes(which: boolean): void {
   if (CurrentList)
      updateListTables("fields-init", CurrentList.nonBaseTypeFields!);
}

/**
 * @function showValue -- retriews a single value of a property from stored data
 * @param {string} which
 * @param {HtmlDomSelectNode} selectObj
 */
function showValue(which: string, selectObj: HTMLSelectElement) {
   let value: string = selectObj.options[selectObj.selectedIndex].value,
      form = selectObj.form as HTMLFormElement,
      parts = value.match(/(\w+)\/([\w_]+)\s?(\{\s?\})?/) as RegExpMatchArray;

   // reset any errors
   if (ErrorState == true) {
      let node = document.getElementById(
            which == "server" ? "error-set" : "site-error-set"
         ) as HTMLDivElement;

      node.replaceChild(document.createTextNode("\u00a0"), node.firstChild as ChildNode);
      ErrorState = false;
   }
   form.selectedProperty.value = value;
   if (which == "server")
      value = CurrentServer[parts[1] + "Properties"][parts[2] as any];
   else if (which == "site")
      value = CurrentSite[parts[1] + "Properties"][parts[2]];
   else if (which == "contentType") {
      let contentType: any,
         selected: string = selectObj.options[selectObj.selectedIndex].value;

      for (contentType of CurrentSite.contentTypes)
         if (selected == contentType.Id.StringValue)
            break;
      form["cont-type-group"].value = contentType.Group;
      form["cont-type-parent"].value = contentType.Parent.Name + " (Id: " +
            contentType.Parent.Id.StringValue + ")";
      form["cont-type-id"].value = contentType.Id.StringValue;
      form["cont-type-readonly"].checked = contentType.ReadOnly;
      form["cont-type-sealed"].checked = contentType.Sealed;
   }
   if (typeof value == "object")
      value = JSON.stringify(value, null, "  ");
   else if (value == "")
      value = "<empty string>";
   if (which == "server")
      form["property-value"].value = value;
   else if (which == "site")
      form["site-property-value"].value = value;
}


/**
 * @event {change} List field select list
 * @function updateListTable -- gets id of field (SP column), retrieves its properties and displays them
 * @param {string} which -- determines which table to update: 'ids', 'fields', 'listprops'
 * @param {arrayOfObject} data -- should REST response to retrieved data for items, fields, or list properties
 */
function updateListTables(which: string, data: any[] | HTMLSelectElement) {
   let node: HTMLInputElement | HTMLOptionElement,
      selectObj = document.getElementById("fields-list") as HTMLSelectElement;

   if (which == "ids") {
      node = document.getElementById("list-item-count") as HTMLInputElement;
      node.replaceChild(document.createTextNode(data.length.toString()), node.firstChild as ChildNode);
      node = document.getElementById("list-item-start-id") as HTMLInputElement;
      node.replaceChild(document.createTextNode(data[0]), node.firstChild as ChildNode);
      node = document.getElementById("list-item-end-id") as HTMLInputElement;
      node.replaceChild(document.createTextNode(data[data.length - 1]), node.firstChild as ChildNode);
      (document.getElementById("main-form") as HTMLFormElement).currentId.value = data[0];
   } else if (which == "fields-init") {
      let selected: boolean = false;

      while (selectObj.firstChild)
         selectObj.removeChild(selectObj.firstChild);
      for (let field of data as any[]) {
         node = document.createElement("option") as HTMLOptionElement;
         node.appendChild(document.createTextNode(field.name));
         node.value = field.id;
         selectObj.appendChild(node);
         if (field.name == "Name") {
            selectObj.selectedIndex = selectObj.options.length - 1;
            selected = true;
         } else if (field.name == "Title" && selected == false)
            selectObj.selectedIndex = selectObj.options.length - 1;
      }
      updateListTables("fields-select", selectObj);
   } else if (which == "fields-select") { // when a field is selected, updates field props HTML table
      let field: any,
         fieldId: string = (data as HTMLSelectElement).options[selectObj.selectedIndex].value.split(";")[0];
      for (field of CurrentList.rawFields!)
         if (field.Id == fieldId)
            break;
      if (field)
         buildPropertiesTable(field,
                     document.querySelector("table#fields-table tbody") as HTMLTableSectionElement);
      else
         CurrentList.restInterface!.getField({fields:[{guid:fieldId}]}).then((response: any) => {
            let fldProperties: any[] = response.data.d.results;
            CurrentList.rawFields!.push(fldProperties);
            buildPropertiesTable(fldProperties,
                  document.querySelector("table#fields-table tbody") as HTMLTableSectionElement);
         }).catch((response) => {
            let node = document.getElementById("list-error") as HTMLDivElement;
            node.replaceChild(document.createTextNode(
               "List error: " + (response.error ? response.error.message.value : response.message)
            ), node.firstChild as ChildNode);
         });
   } else if (which == "listprops")
      buildPropertiesTable(data as string[],
               document.querySelector("table#list-props-table tbody") as HTMLTableSectionElement);

   function buildPropertiesTable(properties: string[], tbodyNode: HTMLTableSectionElement) {
      let trNode: HTMLTableRowElement,
         tdNode: HTMLTableCellElement,
         value;

      while (tbodyNode.firstChild)
         tbodyNode.removeChild(tbodyNode.firstChild);
      for (let property in properties) {
         trNode = document.createElement("tr");
         tbodyNode.appendChild(trNode);
         tdNode = document.createElement("td");
         trNode.appendChild(tdNode);
         tdNode.className = "prop";
         tdNode.appendChild(document.createTextNode(property));
         tdNode = document.createElement("td");
         trNode.appendChild(tdNode);
         tdNode.className = "propval";
         if (typeof (value = properties[property]) == "object")
            value = JSON.stringify(value, null, "  ");
         tdNode.appendChild(document.createTextNode(value));
      }
   }
}

/**
 * @event {change} URL text box for Site panel
 * @function setSiteAsCurrent -- handler to trigger changing all controls for current site
 * @param {HtmlTextInputDomNode} control - just a way of getting the form object
 */
function setSiteAsCurrent(control: HTMLInputElement) {
   let form = control.form as HTMLFormElement,
      controlValue: string;

   if (control.nodeName.toLowerCase() == "button")
      controlValue = form["site-name"].value;
   else
      controlValue = control.value;
   if (CurrentSite)
      CurrentSite.initialized = false;
   selectMenu(document.getElementById("site-button") as HTMLSpanElement);
}

/**
 * @event {click} -- button on site tab labeled "Go To List"
 * @function selectListFromSiteTab -- initiates action to display & initialize the list tab
 * @param {HtmlDomNode} control -- either select or form reference
 */
function selectListFromSiteTab(control: HTMLInputElement | HTMLSelectElement | HTMLFormElement) {
   let i: number,
      value: string,
      selectObj: HTMLSelectElement,
      form: HTMLFormElement | null;

   if ((form = control.form) != null)
      selectObj = <HTMLSelectElement>control;
   else {
      form = <HTMLFormElement>control;
      selectObj = form["site-lists"];
   }
   if (selectObj.selectedIndex < 0)
      return;
   value = selectObj.options[selectObj.selectedIndex].value;
   form.newCopyName.value = value.split(";")[1] + "_Copy";
   form.itemsToCopy.value = "25";
   selectObj = form["site-lists2"];
   for (i = 0; i < selectObj.options.length; i++)
      if (selectObj.options[i].value == value)
         break;
   selectObj.selectedIndex = i;
   selectMenu(document.getElementById('list-button') as HTMLSpanElement);
}

/**
 * @event {click}  four clickable SPANs representing menu tabs
 * @function selectMenu -- causes the tab to be displayed and initialized
 * @param {HtmlDomSpanNode} spanElem -- reference to which span node was clicked
 */
function selectMenu(spanElem: HTMLSpanElement) {
   let bkgdcolor: string = spanElem.className.match(/[0-9a-f]{6}/)![0],
      selection: string,
      form = document.getElementById("main-form") as HTMLFormElement;

   if (lastMenuSelect) {
      lastMenuSelect.style.fontWeight = "normal";
      (document.getElementById(lastMenuSelect.id.match(/(\w+)-button/)![1] + "-panel") as HTMLElement).style.display = "none";
   }
   (document.getElementById("content-panel") as HTMLDivElement).style.backgroundColor = "#" + bkgdcolor;
   spanElem.style.fontWeight = "bold";
   selection = spanElem.id.match(/(\w+)-button/)![1];
   (document.getElementById(selection + "-panel") as HTMLDivElement).style.display = "block";
   if (selection == "site") {
      let value = form["site-name"].value;

      if ((value == null || value.length == 0) &&
               (value = localStorage.getItem("SPToolsLastSite")) != null)
         form["site-name"].value = value;
   }
   initializeTab(selection);
   lastMenuSelect = spanElem as HTMLSelectElement;  // TODO: is this correct?
}

/**
 * @event {click} "Expand" button on Site tab
 * @function expandProp -- gets the property which is object and retrieves its properties ("expands")
 * @param {*} buttonObj
 * @param {*} which
 * @returns
 */
function expandProp(
   buttonObj: HTMLButtonElement,
   which: string
): void {
   let form = buttonObj.form as HTMLFormElement,
      parts = buttonObj.form!.selectedProperty.value.match(/(\w+)\/([\w_]+)\s?(\{\s?\})?/) as RegExpMatchArray;

   if (!parts[3])
      return;
   if (which == "server") {
      let spServerREST = new SPServerREST({
         URL: ParseSPUrl(location.href)!.server
      });

      spServerREST.getEndpoint(
         "/" + parts[1] + "/" + parts[2]
      ).then((response) => {
         form["property-value"].value = JSON.stringify(response.data.d, null, "  ");
      }).catch((response) => {
         let errorSet = document.getElementById("error-set") as HTMLSpanElement;

         ErrorState = true;
         if (response.reqObj.responseJSON) {
            errorSet.replaceChild(document.createTextNode(
               response.reqObj.status + ":  " + response.reqObj.responseJSON.error.message.value
            ), errorSet.firstChild as ChildNode);
         } else
            errorSet.replaceChild(document.createTextNode(response.text), errorSet.firstChild as ChildNode);
      });
   } else if (which == "site") {
      let parsedUrl = ParseSPUrl(form["site-name"].value) as TParsedURL,
            spSiteREST = new SPSiteREST({
               server: parsedUrl.server,
               site: parsedUrl.siteFullPath
            });

      spSiteREST.getEndpoint(
         "/" + parts[1] + "/" + parts[2]
      ).then((response: any) => {
         form["site-property-value"].value = JSON.stringify(response.data.d, null, "  ");
      }).catch((response) => {
         let errorSet = document.getElementById("site-error-set") as HTMLSpanElement;

         ErrorState = true;
         if (response.reqObj.responseJSON) {
            errorSet.replaceChild(document.createTextNode(
               response.reqObj.status + ":  " + response.reqObj.responseJSON.error.message.value
            ), errorSet.firstChild as ChildNode);
         } else
            errorSet.replaceChild(document.createTextNode(response.text), errorSet.firstChild as ChildNode);
      });
   }
}

function makeCopy(inputObj: HTMLInputElement): void {
   let copiedNode: HTMLElement | null = document.getElementById("copied-text");
   inputObj.select();
   inputObj.setSelectionRange(0, 99999);
   document.execCommand("copy");
   inputObj.blur();
   copiedNode!.style.display = "inline-block";
   setTimeout(() => {
      copiedNode!.style.display = "none";
   }, 5000);
}

/**
 * @event {click|change}
 * @function fetchListItemId -- gets the item by its ID from the list, using either increment or reading integer value
 * @param {string|integer} action -- directs what action to take
 */
function fetchListItemId(
   control: HTMLElement,
   action?: string | number
) {
   let itemId: number = -1,
      form: HTMLFormElement | null = null,
      errorNode = document.getElementById("list-error") as HTMLDivElement;

   if (action == "nextup") {
      if (CurrentList.currentIndex >= CurrentList.itemIds.length - 1)
         return errorNode.replaceChild(document.createTextNode("At end of upper range"), errorNode.firstChild as ChildNode);
      itemId = CurrentList.itemIds[++CurrentList.currentIndex];
      form = (control as HTMLInputElement).form;
   } else if (action == "nextdown") {
      if (CurrentList.currentIndex == 0)
         return errorNode.replaceChild(document.createTextNode("At end of lower range"), errorNode.firstChild as ChildNode);
      itemId = CurrentList.itemIds[--CurrentList.currentIndex];
      form = (control as HTMLInputElement).form;
   } else if (control.nodeName.toLowerCase() == "input") { // this is an onchange event in input box; fetch value
      itemId = action as number;
      if ((action = CurrentList.itemIds.findIndex((val: number) => val == itemId)) < 0)
         return errorNode.replaceChild(document.createTextNode("No such ID in this list"),
               errorNode.firstChild as ChildNode);
      CurrentList.currentIndex = action as number;
      form = (control as HTMLInputElement).form;
   } else if (control.nodeName.toLowerCase() == "form") { // undefined
      CurrentList.currentIndex = 0;
      itemId = CurrentList.itemIds[CurrentList.currentIndex];
      form = control as HTMLFormElement;
   }
   errorNode.replaceChild(document.createTextNode("\u00a0"), errorNode.firstChild as ChildNode);
   form!.currentId.value = CurrentList.itemIds[CurrentList.currentIndex];
   // now populate the table
   CurrentList.restInterface!.getItemData({
      itemId: itemId
   }).then((response) => {
      let tdNode, value, metadata = response.data.d;

      if (CurrentList.itemTableInitialized == false) {
         let trNode: HTMLTableRowElement,
            tbody: HTMLTableSectionElement | null = document.querySelector("table#items-table tbody");

         for (let column in metadata) {
            trNode = document.createElement("tr");
            tbody!.appendChild(trNode);
            tdNode = document.createElement("td");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode(column));
            tdNode.className = "prop";
            tdNode = document.createElement("td");
            trNode.appendChild(tdNode);
            tdNode.appendChild(document.createTextNode("\u00a0"));
            tdNode.className = "propval";
            tdNode.id = column;
         }
         CurrentList.itemTableInitialized = true;
      }
      for (let column in metadata) {
         tdNode = document.getElementById(column) as HTMLTableCellElement;
         value = metadata[column];
         if (typeof value == "string" && value.search(/\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}Z/) == 0)
            value = new Date(value).toLocaleDateString();
         else if (value == null)
            value = "null";
         else if (typeof value == "object")
            value = JSON.stringify(value, null, "  ");
         tdNode.replaceChild(document.createTextNode(value), tdNode.firstChild as ChildNode);
      }
      if (ErrorState == true) {
         errorNode.replaceChild(document.createTextNode("\u00a0"), errorNode.firstChild as ChildNode);
         ErrorState = false;
      }
   }).catch((response) => {
      let errTxt;

      ErrorState = true;
      if (response.reqObj.status == 404)
         errTxt = "This item with id = \"" + itemId + "\" was not found. The previous item id and its data are presented.";
      else {
         errTxt = "Error: " + JSON.stringify(response, null, "  ");
         errorNode.className = "unknownError";
      }
      errorNode.replaceChild(document.createTextNode(errTxt), errorNode.firstChild as ChildNode);

      /*
      let trNode, tdNode, tbody = document.querySelector("table#items-table tbody");

      while (tbody.firstChild)
         tbody.remove(tbody.firstChild);
      trNode = document.createElement("tr");
      tbody.appendChild(trNode);
      tdNode = document.createElement("td");
      tdNode.setAttribute("colspan", "2");
      tdNode.appendChild(document.createTextNode(
            "Error: " + JSON.stringify(response, null, "  ")
      ));
      CurrentList.itemTableInitialized = false;
      */
   });
}

// URL  ?callfunc=CompareFileDifferences&displaypage=liblist-container

$(() => {
   let queryParts: URLSearchParams = new URLSearchParams(location.search);

   theForm = document.getElementById('theForm') as HTMLFormElement;
   CurrentPageId = "container";
   if (queryParts.get("listingfunc") != null)
      listingOp(queryParts, theForm);
   else
      selectMenu(document.getElementById("server-button") as HTMLSpanElement);
});
