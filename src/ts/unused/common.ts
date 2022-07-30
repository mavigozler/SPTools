"use strict";

function simplifyFileSize(size: number): string | undefined {
	if (size > 1024 * 1024)
		return (size / (1024 * 1024)).toFixed(0).toString() + " MB";
	else if (size > 1024)
   	return (size / 1024).toFixed(0).toString() + " KB";
}

/**
 * @function getCheckedInput -- returns the value of a named HTML input object representing radio choices
 * @param {HtmlInputDomObject} inputObj -- the object representing selectabe
 *     input: radio, checkbox
 * @returns {primitive data type | array | null} -- usually numeric or string representing choice from radio input object
 */
 if (typeof getCheckedInput !== "function") {
 function getCheckedInput(inputObj: HTMLInputElement | RadioNodeList): null | string | string[] {
	if ((inputObj as RadioNodeList).length) { // multiple checkbox
		let checked: string[] = [];

		for (let cbox of inputObj as RadioNodeList)  // this is a checkbox type
			if ((cbox as HTMLInputElement).checked == true)
				checked.push((cbox as HTMLInputElement).value);
		if (checked.length > 0) {
			if (checked.length == 1)
				return checked[0];
			return checked;
		}
		return null;
	} else if ((inputObj as HTMLInputElement).type == "radio")  // just one value
		return inputObj.value;
	return null;
}
}
/**
* @function setCheckedInput -- will set a radio object programmatically
* @param {HtmlRadioInputDomNode} inputObj   the INPUT DOM node that represents the set of radio values
* @param {primitive value} value -- can be numeric, string or null. Using 'null' effectively unsets/clears any
*        radio selection
& @returns boolean  true if value set/utilized, false otherwise
*/
if (typeof setCheckedInput !== "function") {
function setCheckedInput(
	inputObj: HTMLInputElement & RadioNodeList, 
	value: string | string[] | null
): boolean {
	if (inputObj.length && value != null && Array.isArray(value) == true) {  // a checked list
		if (value.length && value.length > 0) {
			for (let val of value)
				for (let cbox of inputObj)
					if ((cbox as HTMLInputElement).value == val)
						(cbox as HTMLInputElement).checked = true;
		} else 
			for (let cbox of inputObj)
			if ((cbox as HTMLInputElement).value == value) {
				(cbox as HTMLInputElement).checked = true;
				return true;
			}
	} else if (value != null) {
		inputObj.value = value as string;
		return true;
	}
	return false;
}
}

/**
 * @function isIterable -- tests whether variable is iterable
 * @param {object} obj -- basically any variable that may or may not be iterable 
 * @returns boolean - true if iterable, false if not
 */
if (typeof isIterable != "function") {
    let isIterable = (obj: any[]) => {
        // checks for null and undefined
        if (obj == null)
            return false;
        return typeof obj[Symbol.iterator] === 'function';
    };
}

/**
 * 
 * @param {*} state 
 * @param {*} message 
 * @param {*} image 
 */
function progressAlert(
    state: string,
    message?: string, 
    image?: string
) {
    let dNode: HTMLDivElement | null, 
        pNode: HTMLParagraphElement, 
        img: HTMLImageElement;

    function createMessageDom(message: string) {
        let splitMessage: string[] = message.split("\n");
        for (let i = 0; i < splitMessage.length; i++) {
            pNode.appendChild(document.createTextNode(splitMessage[i]));
            if (i < splitMessage.length - 1)
                pNode.appendChild(document.createElement("br"));
        }
    }


    if (state == "show") {
        if ((dNode = document.getElementById("process-alert") as HTMLDivElement) == null) {
            dNode = document.createElement("div");
            dNode.id = "process-alert";
            dNode.style.backgroundColor = "white";
            dNode.style.zIndex = "1";
            dNode.style.position = "fixed";
            dNode.style.border = "2px solid blue";
            dNode.style.padding = "0.5em";
            dNode.style.margin = "1em";
            dNode.style.top =  ((window.innerHeight - 150) / 2).toFixed(0).toString() + "px";
            dNode.style.left = ((window.innerWidth - 500) / 2).toFixed(0).toString() + "px";
            dNode.style.font = "normal 15pt Arial,sans-serif";
            dNode.style.display = "grid";
            dNode.style.gridTemplateColumns = "350px 150px";
            pNode = document.createElement("p");
            dNode.appendChild(pNode);
            if (!message)
                message = "Please wait patiently\n\nCogs and gears have been put into motion";
            createMessageDom(message);
            img = document.createElement("img");
            if (image)
                img.src = image;
            else {
                img.src = SilverBallsSpinningImageData;
                img.style.height = "100px";
            }
            img.alt = "";
            pNode = document.createElement("p");
            dNode.appendChild(pNode);
            pNode.appendChild(img);
            document.body.appendChild(dNode);
        } else
            dNode.style.display = "block";
    } else if (state == "hide") { // state == "hide"
        (document.getElementById("process-alert") as HTMLElement).style.display = "none";
    } else if (state == "error") {
        if ((dNode = document.getElementById("process-alert-error") as HTMLDivElement) == null) {
            dNode = document.createElement("div");
            dNode.id = "process-alert-error";
            dNode.style.backgroundColor = "white";
            dNode.style.zIndex = "1";
            dNode.style.position = "fixed";
            dNode.style.border = "2px solid blue";
            dNode.style.padding = "0.5em";
            dNode.style.margin = "1em";
            dNode.style.width = "300px";
            dNode.style.top = ((window.innerHeight - 150) / 2).toFixed(0).toString() + "px";
            dNode.style.left = ((window.innerWidth - 300) / 2).toFixed(0).toString() + "px";
            dNode.style.font = "bold 15pt Arial,sans-serif";
            dNode.style.color = "red";
            dNode.appendChild(document.createTextNode("There was an error"));
            document.body.appendChild(dNode);
            dNode.addEventListener("click", () => {
                (dNode as HTMLDivElement).style.display = "none";
            });
        } else
            dNode.style.display = "block";
    }
}

if (typeof fixValueAsDate !== "function") {
function fixValueAsDate(date: Date) {
    let datestring = date.toISOString().match(/(\d{4})\-(\d{2})\-(\d{2})/);

    return new Date(parseInt(datestring![1]), parseInt(datestring![2]) - 1, parseInt(datestring![3]));
}
}


/**
 * @function formatDateToMMDDYYYY -- returns ISO 8061 formatted date string to MM[d]DD[d]YYYY date
 *      string, where [d] is character delimiter
 * @param {string|datetimeObj} dateInput [required] -- ISO 8061-formatted date string 
 * @param {string} delimiter [optional] -- character that will delimit the result string; default is '/'
 * @returns {string} -- MM[d]DD[d]YYYY-formatted string. Exception thrown if dateString is not ISO-8061-formatted
 */
 if (typeof formatDateToMMDDYYYY !== "function") {
function formatDateToMMDDYYYY(
    dateInput: string | Date, 
    delimiter: string = "/"
) {
    let matches: RegExpMatchArray | null, 
        dateObj: Date;
    
    if (dateInput instanceof Date == true) {
        dateObj = dateInput as Date;
        return (dateObj.getMonth() < 9 ? "0" : "") + (dateObj.getMonth() + 1) + delimiter +
            (dateObj.getDate() < 10 ? "0" : "") + dateObj.getDate() + delimiter + dateObj.getFullYear();
    }
    else if (typeof dateInput == "string") {
        if ((matches = (dateInput as string).match(/(^\d{4})-(\d{2})-(\d{2})T/)) != null)
            return matches[2] + delimiter + matches[3] + delimiter + matches[1];
        if ((dateObj = new Date(dateInput)) instanceof Date == true) 
            return (dateObj.getMonth() < 9 ? "0" : "") + (dateObj.getMonth() + 1) + delimiter +
                (dateObj.getDate() < 10 ? "0" : "") + dateObj.getDate() + delimiter + dateObj.getFullYear();
    }
}
}

function pathname(uri: string) {
   return String(uri).substring(0, uri.lastIndexOf('/'));
}

/**
 * @function createSelectUnselectAllCheckboxes -- this will create two buttons
 * @param {object} parameters -- object represents multiple arguments to function
 *     form {object|string} must the 'id' attribute value of a valid form or its DOM node
 *     formName {string} -- this must be the name attribute for all checkboxes set for input
 *     containerElemType {string} -- usually a "span","p",or"div"
 *     containerNode {object|string} either the DOM node to contain or the 'id' of the container
 *     style string or array of string -- valid CSS rule "selector { property:propertyValue;...}
 *          styles can be specified for container of buttons or buttons
 *     images {object} must be JSON form {"select-url": "url to select all image", 
 *                  "unselect-url": url to unselect image, 
 *                  "select-image": base64-encoded image data, "unselect-image": b64 image data}
 *      clickCallback -- continues click event back to calling program
 * @returns {HtmlDomNode} -- returns true if containerNode was passed and valid or 
 *           returns the DoM Node for the buttons container
 */
if (typeof createSelectUnselectAllCheckboxes !== "function") {
function createSelectUnselectAllCheckboxes(parameters: {
    form: HTMLFormElement | string; // string => form id attribute value
    formName: string;
    containerElemType: "span" | "p" | "div";
    containerNode: HTMLElement | string;  // string: id attribute value
    style?: string | string[];
    images: any;
    "select-url"?: string;
    "select-image"?: string;
    "unselect-url"?: string;
    "unselect-image"?: string;
    clickCallback: (param: any) => {};
}) {
    let capture: boolean = false, 
        iNode: HTMLImageElement, 
        sNode: HTMLSpanElement, 
        node: HTMLElement, 
        control: RadioNodeList, 
        imgSrc: string,
        containerElemType: string = parameters.containerElemType || "p",
        form: HTMLFormElement, 
        parent: HTMLElement;

    if (typeof parameters.form == "string")
        form = document.getElementById(parameters.form) as HTMLFormElement;
    else
        form = parameters.form;
    if (!(form && form.nodeName && form.nodeName.toLowerCase() == "form"))
        throw "A form DOM node or its 'id' attribute must be a parameter and contain the checkbox elements";

        // look for a form that contains this
    if (!parameters.formName || typeof parameters.formName != "string" || parameters.formName.length == 0)
        throw "The parameter 'formName' is either undefined or not a string of non-zero length";
    if ((control = form[parameters.formName]) == null)
        throw "No 'form' with that name attribute is found on the document. It must be present in HTML document.";

    if (typeof parameters.containerNode == "string") // is an id attribute
        parent = document.createElement(parameters.containerNode);
    else
        parent = parameters.containerNode;

    node = document.createElement(containerElemType);


    sNode = document.createElement("span");
    node.appendChild(sNode);
    sNode.addEventListener("click", () => {
        for (let checkbox of control)
            (checkbox as HTMLInputElement).checked = true;
        if (parameters.clickCallback)
            parameters.clickCallback("select");
    }, capture);
    iNode = document.createElement("img");
    sNode.appendChild(iNode);
    imgSrc = parameters["select-url"] as string || parameters["select-image"] as string;
    if (!imgSrc || imgSrc == null) {
        iNode.style.width = "20px";
        imgSrc = SelectAllCheckboxes;
    }
    iNode.src = imgSrc;
    iNode.alt = "Select All";

    sNode = document.createElement("span");
    node.appendChild(sNode);
    sNode.addEventListener("click", () => {
        for (let checkbox of control)
            (checkbox as HTMLInputElement).checked = false;        
        if (parameters.clickCallback)
            parameters.clickCallback("unselect");
    }, capture);
    iNode = document.createElement("img");
    sNode.appendChild(iNode);
    imgSrc = parameters["unselect-url"] as string || parameters["unselect-image"] as string;
    if (!imgSrc || imgSrc == null) {
        iNode.style.width = "20px";
        imgSrc = UnselectAllCheckboxes;
    }
    iNode.src = imgSrc;
    iNode.alt = "Unselect All";
    
    if (parameters.style)
        if (typeof parameters.style == "string") {
            node = document.createElement("style");
            node.appendChild(document.createTextNode(parameters.style));
            document.getElementsByTagName("head")[0].appendChild(node);
        } else if (Array.isArray(parameters.style) == true) {
            let sheet = document.styleSheets[document.styleSheets.length - 1];

            for (let style of parameters.style)
                sheet.insertRule(style);
        }
    if (parent)
        parent.appendChild(node);
    else
        return node;
}
}

/**
 * 
 * @param {object} parameters -- arguments are properties
 *      child [htmlDomNode: required] -- the starting DOM node from which to start search
 *      name  [string: required] -- the nodeName property of a DOM node as a string / case not important
 *      class [string: optional] -- the class attribute of the ancestor, which can be used for search
 *      searchClass [string: optional] -- a partial string of class search.
 *      searchAttribute [array: optional] -- will search an ancestor for a particular attribute and its
 *                   value. Value is optional. Must be two-element array, with 1st element full attribute
 *                   name and 2nd element, if used, the full value of the attribute7
 */
function findAncestorDomNode(parameters: {
    child: HTMLElement;
    name: string;
    class?: string;
    searchClass?: string;
    searchAttribute?: [ attrib: string, attribValue: string ];
}) {
    let regex: RegExp = RegExp("");

    if (parameters.searchClass)
        regex = new RegExp(parameters.searchClass);
    for (let targetNode = parameters.child; targetNode != null; 
                    targetNode = targetNode.parentNode as HTMLElement)
        if ((parameters.class || regex) && parameters.searchAttribute) {
            if (parameters.class) {
                if (targetNode.nodeName.toLowerCase() == parameters.name && 
                            targetNode.className == parameters.class && 
                            targetNode.getAttribute(parameters.searchAttribute[0]) == 
                            parameters.searchAttribute[1])
                    return targetNode;
            } else if (targetNode.nodeName.toLowerCase() == parameters.name && 
                    targetNode.className.search(regex) >= 0 && 
                    targetNode.getAttribute(parameters.searchAttribute[0]) == parameters.searchAttribute[1])
                return targetNode;
        } else if (parameters.class || regex) {
            if (parameters.class) {
                if (targetNode.nodeName.toLowerCase() == parameters.name && 
                            targetNode.className == parameters.class)
                    return targetNode;
            } else if (targetNode.nodeName.toLowerCase() == parameters.name && 
                    targetNode.className.search(regex) >= 0)
                return targetNode;
        } else if (parameters.searchAttribute) {
            if (targetNode.nodeName.toLowerCase() == parameters.name && 
                    targetNode.getAttribute(parameters.searchAttribute[0]) == parameters.searchAttribute[1])
                return targetNode;
        } else if (targetNode.nodeName.toLowerCase() == parameters.name)
            return targetNode;
    return null;
}

/**
 * @function findObjectPartByProperty -- 
 * @param {object} obj -- the object to be searched for properties or property values
 * @param {string} property -- will return the values of all properties found in an object,
 *     where the properties are given as strings in an array
 * @param {boolean} allInstances -- either ALL_INSTANCES to return all instances of property or just the 
 *      first instance (FIRST_ONLY) which is default
 * @returns 
 */
function findObjectPartByProperty(
    obj: {} | [], 
    property: string, 
    value: boolean = false
): {}[] | null {
    let result;

    if (Array.isArray(obj) == true)
        result = searchArray(obj as [], property, value);
    else
        result = searchObject(obj, property, value);
    return result;
}

function findObjectPropertyValue(obj: {}, value: string): {} | null{
	return findObjectPartByProperty(obj, value, true);
}

function searchObject(
    obj: {[key:string]: any}, 
    property: string, 
    value: boolean
): {}[] | null {
    let result: {} | {}[] | null, 
        prop: any,
        collectedResults: {}[] = [ ];

    if (typeof obj != "object")
        return null;
    for (prop in obj) {
        if (prop == property || (value == true && obj[prop] == property)) // found
            result = obj;
        else if (Array.isArray(obj[prop]) == true)  // property references an inner array
            result = searchArray(obj[prop], property, value);  // result may be null or an array of >= 1 length
        else if (typeof obj[prop] == "object")  // property references an inner object
            result = searchObject(obj[prop], property, value); // can be null or obj part, not value
        else
            result = null;
        if (result && Array.isArray(result) == true)
            collectedResults = collectedResults.concat(result);
        else
            collectedResults.push(result as {});
    }
    if (collectedResults.length > 0)
        return collectedResults;
    return null;
}

function searchArray(
    arr: [], 
    property: string, 
    value: boolean
): {}[] | null {
    let result: {} | {}[] | null, 
        collectedResults: {}[] = [ ];

    for (let elem of arr) {
        if (Array.isArray(elem) == true) // property references an inner array
            result = searchArray(elem, property, value);
        else if (typeof elem == "object")  // property references an inner object
            result = searchObject(elem, property, value);
        else
            result = null;
        if (result && Array.isArray(result) == true)
            collectedResults = collectedResults.concat(result);
        else
            collectedResults.push(result as {});
    }
    if (collectedResults.length > 0)
        return collectedResults;
    return null;
}

function decodeText(encodedText: string): string {
    return encodedText.replace(/%0D/g, "r").replace(/%0A/g, "\n");
}

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
if (typeof CSVToArray !== "function") {
function CSVToArray( strData: string, strDelimiter: string ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    let objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );

    // Create an array to hold our data. Give the array
    // a default empty first row.
    let arrData: string[][] = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    let arrMatches = null;

    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        let strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );
        }

        let strMatchedValue;
        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );
        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }
        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return arrData;
}
}
/* COMPARE parsing code above to my code
    let line, lines, fields, newFields, matches, parsedLines = [ ];
    // single long string
    lines = data.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n\n/g, "\n").replace(/"/g, '\\"').split("\n");
    for (line of lines) {
        if (line == "")
            continue;
        fields = fixEmbeddedCommas(line.split(","));
        newFields = [ ];
        for (let i = 0; i < fields.length; i++) {
            if ((matches = fields[i].match(/^(\d{2})[\-\/](\d{2})[\-\/](\d{4})(\s+)?((\d{1,2}):(\d{2}))?/)) != null) {
                if (matches[6])
                    fields[i] = new Date(matches[3], parseInt(matches[2]) - 1, matches[1], matches[6], matches[7]);
                else
                    fields[i] = new Date(matches[3], parseInt(matches[2]) - 1, matches[1]);
                fields[i] = convertIsoDateToMMDDYYYY(fields[i].toISOString(), "-");
            } else if (fields[i].search(/^\\"$/) == 0) {
				fields[i - 1] += ",";
				continue;
			}
            newFields.push(fields[i]);
        }
        parsedLines.push(newFields);
    }
	console.log(parsedLines);
    return parsedLines;
*/


/**
 * @function fixEmbeddedCommas -- library function to handle CSV-formatted strings containing embedded commas
 *     with the fields
 * @param {array of strings} lineSegmentArray 
 * @returns
 */
function fixEmbeddedCommas(lineSegmentArray: string[]) {
   let match, idx, field, bracketRE, delimiter, finishedLineArray = [ ];

   for (idx = 0; idx < lineSegmentArray.length; idx++)
       if ((match = lineSegmentArray[idx].match(/^\\"(.)/)) != null) {  // is there a double quote at start?
           switch (match[1]) {   // after it, is next char {, [, or (
           case "{": delimiter = "\\}\""; break;  // look for end delimeter
           case "[": delimiter = "\\]\""; break;
           case "(": delimiter = "\\)\""; break;
           default:
               if (match[1].search(/[A-Za-z0-9]/) == 0)
                   delimiter = "\"";
               else
                   delimiter = match[1];
               break;
           } 
           bracketRE = new RegExp(delimiter + "$");
           field = "";
           do {
               field += (field.length > 0 ? "," : "") + lineSegmentArray[idx];
           } while (bracketRE.exec(lineSegmentArray[idx++]) == null && idx < lineSegmentArray.length);
           idx--;
           finishedLineArray.push(field);
       } else
           finishedLineArray.push(lineSegmentArray[idx]);
   return finishedLineArray;
}

function LZWcompress(uncompressed: string) {
    let i,
        dictionary: any = {},
        c,
        wc,
        w = "",
        result = [],
        dictSize = 256;
    for (i = 0; i < 256; i += 1) {
        dictionary[String.fromCharCode(i)] = i;
    }
    for (i = 0; i < uncompressed.length; i += 1) {
        c = uncompressed.charAt(i);
        wc = w + c;

        if (dictionary.hasOwnProperty(wc)) {
            w = wc;
        } else {
            result.push(dictionary[w]);

            dictionary[wc] = dictSize++;
            w = String(c);
        }
    }
    if (w !== "") {
        result.push(dictionary[w]);
    }
    return result;
 }

 function LZWdecompress(compressed: number[]) {
    let i,
        dictionary = [],
        w,
        result,
        k,
        entry = "",
        dictSize = 256;
    for (i = 0; i < 256; i += 1) {
        dictionary[i] = String.fromCharCode(i);
    }
    w = String.fromCharCode(compressed[0]);
    result = w;
    for (i = 1; i < compressed.length; i += 1) {
        k = compressed[i];
        if (dictionary[k]) {
            entry = dictionary[k];
        } else {
            if (k === dictSize) {
                entry = w + w.charAt(0);
            } else {
                return null;
            }
        }
        result += entry;
        dictionary[dictSize++] = w + entry.charAt(0);
        w = entry;
    }
    return result;
}

/**
 * @function formatRESTBody -- creates a valid JSON object as string for specifying SP list item updates/creations
 * @param {array} bodyArray -- array of objects of strings representing name=value style for setting columns
 *    in SharePoint lists
 */
if (typeof formatRESTBody == "undefined") {
function formatRESTBody(bodyArray: string[]) {
	let i: number, 
        bodyString: string = "{ ",
        value: string | null = null;
	for (i = 0; i < bodyArray.length; i++) {
		if (typeof bodyArray[i][1] == "string")
			value = bodyArray[i][1].replace(/'/g, '\\\'');
		if (i > 0)
			bodyString += ",";
		if (value == null)
			bodyString += "'" + bodyArray[i][0] + "':null";
        else if (bodyArray[i][0].search(/EntityType|EntityTypeName|ListItemEntityTypeFullName/) >= 0)
            bodyString += " '__metadata' : { 'type':'" + bodyArray[i][1] + "'}";
        else 
			bodyString += "'" + bodyArray[i][0] + "':'" + bodyArray[i][1] + "'";
	}
	return bodyString + " }";
}
}


    /**
 * @function RESTrequest -- REST requests interface optimized for SharePoint server
 * @param {object} elements -- all the object properties necessary for the jQuery library AJAX XML-HTTP Request call
 *          specific to a SP server + options:
 *              url, method, data or body, headers, successCallback, errorCallback
 * @returns {object} all the data or error information via callbacks
 */

/*  REST REquest form
    
    RESTrequest({
        setDigest: true,   // for posts
        url: "url here",
        method: "GET",
        data:  ""  // JSON for posts
        successCallback: (data, text, reqObj) => {
            // code here
        },
        errorCallback: (reqObj, status, errThrown) => {
            // error handling here
        }
    });
*/

if (typeof RESTrequest !== "function") {
function RESTrequest(elements: {
    url: string;
    method?: string;
    setDigest?: boolean;
    data?: any;
    body?: any;
    headers: {
        [key:string]: string
    };
    successCallback: (data: any, status?: string, reqObj?: JQueryXHR) => void;
    errorCallback: (reqObj: JQueryXHR, status?: string, errThrown?: string) => void;
}): void {
	if (elements.setDigest && elements.setDigest == true) {
		let match: RegExpMatchArray | null = elements.url.match(/(.*\/_api)/);
		$.ajax({  // get digest token
			url: match![1] + "/contextinfo",
			method: "POST",
			headers: {...SPstdHeaders},
			success: function (data) {
                let headers = elements.headers;

                if (elements.headers) {
                    headers["Content-Type"] = "application/json;odata=verbose";
                    headers["Accept"] = "application/json;odata=verbose";
                } else 
                    headers = {...SPstdHeaders};
				headers["X-RequestDigest"] = data.FormDigestValue ? data.FormDigestValue :
					data.d.GetContextWebInformation.FormDigestValue;
				$.ajax({
					url: elements.url,
					method: elements.method,
					headers: headers,
					data: elements.body || elements.data,
					success: function (data, status, requestObj) {
						elements.successCallback(data, status, requestObj);
					},
					error: function (requestObj, status, thrownErr) {
						elements.errorCallback(requestObj, status, thrownErr);
					}
				});
			},
			error: function (requestObj, status, thrownErr) {
    			elements.errorCallback(requestObj, status, thrownErr);
			}
		});
	} else {
        if (!elements.headers)
	    	elements.headers = {...SPstdHeaders};
	    else {
		    elements.headers["Content-Type"] = "application/json;odata=verbose";
		    elements.headers["Accept"] = "application/json;odata=verbose";
	    }
		$.ajax({
			url: elements.url,
			method: elements.method,
			headers: elements.headers,
			data: elements.body || elements.data,
			success: function (data, status, requestObj) {
                let count: number | null | string = 0;

                if ((count = elements.url.match(/\$top=(\d+)/) as string | null) != null)
                    count = parseInt(count[1]);
                if (data.d && data.d.__next) {
                    RequestAgain(
                        data.d.__next, 
                        data.d.results,
                        count as number
                    ).then((response) => {
                        elements.successCallback(response);
                    }).catch((response) => {
                        elements.errorCallback(response);
                    });
                } else
				    elements.successCallback(data, status, requestObj);
			},
			error: function (requestObj, status, thrownErr) {
				elements.errorCallback(requestObj, status, thrownErr);
			}
		});
	}
}

function RequestAgain(url: string, priorResults: any[], count: number)  {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            method: "GET",
            headers: {...SPstdHeaders},
            success: (data) => {
                if (count != null)
                    count -= data.d.results.length;
                if (data.d.__next && (count == null || count > 0))
                    resolve(RequestAgain(
                        data.d.__next, 
                        priorResults.concat(data.d.results),
                        count
                    ));
                else
                    resolve(priorResults.concat(data.d.results));
            },
            error: (reqObj) => {
                reject(reqObj);
            }
        });
    });
}
}


//  Synonyms for RESTrequest()
function RestRequest(elements: any) {
    return RESTrequest(elements);
}
function RESTRequest(elements: any) {
    return RESTrequest(elements);
}

function findAjaxError(responseData: any) {
    if (typeof responseData == "object")
        if (responseData == null)
            return "Error report is 'null' value";
        if (responseData.message)
            if (responseData.stack)
                if (typeof responseData.stack == "string")
                    return responseData.message + "\n" + responseData.stack;
                else
                    return responseData.message + "\n" + JSON.stringify(responseData.stack);
            else
                return responseData.message;
        else if (responseData.responseJSON)
            return JSON.stringify(responseData.responseJSON);
        else if (responseData.responseText)
            return responseData.responseText;
    else
        return responseData;
}

function findHttpStatus(responseData: any) {
    if (typeof responseData == "object")
        if (responseData.status)
            return responseData.status;
    return "no status available";
}

/**
 * @param {UINT-8} arrayBufferFileData
 * @param {string} targetFileName
 * @param {string} docLibName
 * @param {string} serverName
 * @param {string} siteNamePartialPath
 * @param {string} folderServerRelativeUrl
 * @param {boolean} getListItemAllFields
 * @param {boolean} doOverwrite
 * @param {function} successCallback
 * @param {function} errorCallback
 * @returns {object|int} -- if getListItemAllFields is true, returns the object
 */
function FileUploadSPDocLib(
    arrayBufferFileData: any,
    targetFileName: string,
    docLibName: string,
    serverName: string,
    siteNamePartialPath: string,
    folderServerRelativeUrl: string,
    getListItemAllFields: boolean = true,
    doOverwrite: boolean = true,
    successCallback: (e: any, f: string, g: any) => void,
    errorCallback: (h: any, i: string, j: string) => void
): void {
    let docLibNameRE: RegExp = new RegExp(docLibName + "$"),
        checkedServerName: string = serverName.search(/^https/) < 0 ? "https://" + serverName : serverName,
        checkedSiteName: string = siteNamePartialPath.search(/^\//) < 0 ? "/" + siteNamePartialPath : siteNamePartialPath,
        checkedFolderServerRelativeUrl: string = folderServerRelativeUrl.search(/^\//) < 0 ? "/" + folderServerRelativeUrl : folderServerRelativeUrl,
        checkedDocLibName: string = docLibName.search(/^\//) < 0 ? "/" + docLibName : docLibName;

    if (docLibNameRE.test(folderServerRelativeUrl) == true)
        checkedFolderServerRelativeUrl = checkedFolderServerRelativeUrl.substr(0, 
                checkedFolderServerRelativeUrl.length - checkedDocLibName.length - 1);
    $.ajax({  // get digest token
        url: checkedServerName + checkedSiteName + "/_api/contextinfo",
        method: "POST",
        headers: {
            "Content-Type": "application/json;odata=verbose",
            "Accept": "application/json;odata=verbose"
        },
        success: function (data) {
            $.ajax({
                url: checkedServerName + checkedSiteName + "/_api/web/getFolderByServerRelativeUrl('" +
                        checkedSiteName + checkedDocLibName + "')/Files/add(url='" + targetFileName + 
                        "',overwrite=" + doOverwrite + ")" +
                        (getListItemAllFields == true ? "?$expand=ListItemAllFields" : ""),
                method: "POST",
                headers: {
                    "Content-Type": "application/json;odata=verbose",
                    "Accept": "application/json;odata=verbose",
                    "X-RequestDigest": data.FormDigestValue ? data.FormDigestValue :
                         data.d.GetContextWebInformation.FormDigestValue
                },
                data: arrayBufferFileData,
                success: function (data, status, requestObj) {
                    successCallback(data, status, requestObj);
                },
                error: function (requestObj, status, thrownErr) {
                    errorCallback(requestObj, status, thrownErr);
                }
            });
        },
        error: function (requestObj, status, thrownErr) {
            errorCallback(requestObj, status, thrownErr);
        }
    });
}

function cleanUpJson(JSONstring: string): string {
   if (JSONstring.search(/^\s*"{/) >= 0)
       JSONstring = JSONstring.replace(/^\s*"\{/, "{").replace(/\}"/, "}");
   if (JSONstring.search(/"":/) >= 0)
       JSONstring = JSONstring.replace(/""/g, "\"");
   return JSONstring;
}

if (typeof CreateUUID !== "function") {
function CreateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
     
        return v.toString(16);
    });
}
}

if (typeof SelectAllCheckboxes == "undefined") {
const 
    SelectAllCheckboxes = 
    "data:image/png;base64,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";
}

if (typeof UnselectAllCheckboxes == "undefined") {
const
    UnselectAllCheckboxes = 
    "data:image/png;base64,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";
}
const
    SilverBallsSpinningImageData = 
"data:image/png;base64,R0lGODlhIANYAqIHAIKCgnV1dcrKyubm5qioqGFhYeLi4v///yH/C05FVFNDQVBFMi4wAwEAAAAh/wtYTVAgRGF0YVhNUDw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQwIDc5LjE2MDQ1MSwgMjAxNy8wNS8wNi0wMTowODoyMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6M0UzNTY1N0E0ODE1MTFFOEIwQjJFRDczNzFDMkFEODMiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6M0UzNTY1Nzk0ODE1MTFFOEIwQjJFRDczNzFDMkFEODMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggTWFjaW50b3NoIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9IjIwRDUwRjlDMUJCQzdDQ0QyRTA3MTY1NTFGRDg5NDhEIiBzdFJlZjpkb2N1bWVudElEPSIyMEQ1MEY5QzFCQkM3Q0NEMkUwNzE2NTUxRkQ4OTQ4RCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTD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";