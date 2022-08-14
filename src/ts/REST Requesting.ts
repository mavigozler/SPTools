"use strict";

import * as SPRESTTypes from '../../SPREST/src/SPRESTtypes';
import * as SPRESTSupportLib from '../../SPREST/src/SPRESTSupportLib';

const prefix = "WPQ5",
	stdHeaders =  {
		"Content-Type":"application/json;odata=verbose",
		"Accept":"application/json;odata=verbose"
  };

let SPChromePrefix = "";

function formatDate(form: HTMLFormElement) {
	let inputObj = form.dateformat;
	inputObj.value = new Date(inputObj.value).toISOString();
	return;
}

function recordHttpStatusResponseDateUrlMethod(reqObj: JQueryXHR) {
	let node: HTMLSpanElement,
		responseDate: Date = new Date(reqObj.getResponseHeader("date") as string);

	node = document.getElementById('http-status') as HTMLSpanElement;
	node.replaceChild(document.createTextNode(reqObj.status.toString()), node.firstChild as ChildNode);
	node = document.getElementById('response-datetime') as HTMLSpanElement;
	node.replaceChild(document.createTextNode(responseDate.toLocaleDateString() + " " +
		responseDate.toLocaleTimeString()), node.firstChild as ChildNode);
	node = document.getElementById('sent-url') as HTMLSpanElement;
//	node.replaceChild(document.createTextNode(reqObj.url + " (" + reqObj.method + ")"), node.firstChild);
}

function sendRequest(form: HTMLFormElement) {
	let node: HTMLElement,
		value: string,
		headers: { [key:string]: string } = { },
		hName: string,
		formDigestValueNode: HTMLElement,
		finalUrl: string = form[SPChromePrefix + "url"].value,
		query: string = "",
		headersCount: number = parseInt(form[SPChromePrefix + "headerCount"].value);

	function editedRequest(params: {
		url: string;
		method: SPRESTTypes.THttpRequestMethods;
		headers: SPRESTTypes.THttpRequestHeaders;
		body: string;
	}): void {
		SPRESTSupportLib.RESTrequest({
			url: params.url,
			method: params.method!,
			headers: params.headers,
			data: params.body,
			successCallback: (data: any) => {
				form[SPChromePrefix + "response"].value = JSON.stringify(data, null, "  ");
				renderObjectInMarkup(data);
				storeRequestData(form);
				loadPreviousData();
			},
			errorCallback: (reqObj, status, errThrown) => {
				form[SPChromePrefix + "response"].value =
					"URL: " + //this.url +
					"\nError thrown: " + errThrown +
					"\nstatus: " + status;
				if (reqObj.responseJSON)
					form[SPChromePrefix + "response"].value +=
						"\nmessage: " + reqObj.responseJSON.error.message.value;
				node = document.getElementById('http-status') as HTMLSpanElement;
				node.replaceChild(document.createTextNode(reqObj.status.toString()),
						node.firstChild as ChildNode);
			}
		});
	}

	if ((value = form[SPChromePrefix + "ODataSelect"].value).length > 0)
		query += "?$select=" + value;
	if ((value = form[SPChromePrefix + "ODataFilter"].value).length > 0)
		query += (query.length > 0 ? "&" : "?") + "$filter=" + value;
	if ((value = form[SPChromePrefix + "ODataExpand"].value).length > 0)
		query += (query.length > 0 ? "&" : "?") + "$expand=" + value;
	for (let i = 1; i <= headersCount; i++) {
		if (form[SPChromePrefix + "header-" + i + "-name"] == null ||
				form[SPChromePrefix + "header-" + i + "-value"] == null)
			continue;
		hName = form[SPChromePrefix + "header-" + i + "-name"].value;
		if (hName.length > 0)
			headers[hName] = form[SPChromePrefix + "header-" + i + "-value"].value;
		if (hName == "X-RequestDigest")
			formDigestValueNode = form[SPChromePrefix + "header-" + i + "-value"];
	}
	finalUrl = finalUrl + query;
	if (form[SPChromePrefix + "xdigest"].checked == true) {
		let match: RegExpMatchArray | null = finalUrl.match(/(.*\/_api)/);

		SPRESTSupportLib.RESTrequest({
			url: match![1] + "/contextinfo",
			method: "POST",
			headers: {...stdHeaders} as SPRESTTypes.THttpRequestHeaders,
			successCallback: function (data) {
				let formDigestValue = data.d!.GetContextWebInformation!.FormDigestValue;
					// SharePoint
				headers["X-RequestDigest"] = formDigestValue;
				(formDigestValueNode as HTMLInputElement).value = formDigestValue;
				editedRequest({
					url: finalUrl,
					method: SPRESTSupportLib.getCheckedInput(form[SPChromePrefix + "method"]) as SPRESTTypes.THttpRequestMethods,
					headers: headers,
					body: form[SPChromePrefix + "body"].value
				});
			},
			errorCallback: function(reqObj, status, errThrown) {
				form[SPChromePrefix + "response"].value =
					"URL: " + this.url +
					"\nError thrown: " + errThrown +
					"\nstatus: " + status;
				if (reqObj.responseJSON)
					form[SPChromePrefix + "response"].value +=
						"\nmessage: " + reqObj.responseJSON.error.message.value;
				node = document.getElementById('http-status') as HTMLSpanElement;
				node.replaceChild(document.createTextNode(reqObj.status.toString()),
						node.firstChild as ChildNode);
			}
		});
	} else
		editedRequest({
			url: finalUrl,
			method: SPRESTSupportLib.getCheckedInput(form[SPChromePrefix + "method"]) as SPRESTTypes.THttpRequestMethods,
			headers: headers,
			body: form[SPChromePrefix + "body"].value
		});
}

function showHeaderSet() {
	(document.getElementById("showheaders") as HTMLElement).style.display = "none";
	(document.getElementById("special-sets") as HTMLElement).style.display = "block";
	(document.getElementById("headermenu") as HTMLElement).style.display = "inline";
	(document.getElementById("expand-input") as HTMLElement).style.width = "85%";
}

function hideHeaderSet() {
	(document.getElementById("showheaders") as HTMLElement).style.display = "block";
	(document.getElementById("special-sets") as HTMLElement).style.display = "none";
	(document.getElementById("headermenu") as HTMLElement).style.display = "none";
	(document.getElementById("expand-input") as HTMLElement).style.width = "100%";
}

function deleteHeader(
	hName: string,
	buttonObj: HTMLButtonElement | {form: HTMLFormElement}
): number {
	let node: HTMLInputElement = buttonObj.form![SPChromePrefix + hName + "-name"],
		headersCount = parseInt(buttonObj.form![SPChromePrefix + "headerCount"].value) - 1;
	if (node.value == "X-RequestDigest")
		buttonObj.form![SPChromePrefix + "xdigest"].checked = false;
	while (node.className != "headerset")
		node = node.parentNode as HTMLInputElement;
	while (node.firstChild)
		node.removeChild(node.firstChild);
	node.parentNode!.removeChild(node);
	buttonObj.form![SPChromePrefix + "headerCount"].value = headersCount;
	node = document.getElementById("header-count-display") as HTMLInputElement;
	node.replaceChild(document.createTextNode(headersCount.toString()), node.firstChild as ChildNode);
	return headersCount;
}

function addHeader(
	buttonObj: HTMLButtonElement | HTMLInputElement,
	definedHeaderData: {[key:string]: string | boolean | null}
) {
	const headersNode = document.getElementById("headers") as HTMLDivElement;
	let sNode: HTMLSpanElement,
		node: HTMLInputElement | HTMLButtonElement,
		headersCount = parseInt(buttonObj.form![SPChromePrefix + "headerCount"].value) + 1;

	sNode = document.createElement("span");
	sNode.className = "headerset";
	headersNode.appendChild(sNode);

	node = document.createElement("input");
	sNode.appendChild(node);
	node.className = "hname";
	node.name = SPChromePrefix + "header-" + headersCount + "-name";
	if (definedHeaderData) {
		node.value = definedHeaderData.hname as string;
		if (definedHeaderData.disabled)
			node.disabled = definedHeaderData.disabled == "true" ? true : false;
	} else
		node.placeholder = "header name here";
	sNode.appendChild(document.createTextNode("\u00a0:\u00a0"));
	node = document.createElement("input");
	sNode.appendChild(node);
	node.className = "hvalue";
	node.name = SPChromePrefix + "header-" + headersCount + "-value";
	if (definedHeaderData) {
		node.value = definedHeaderData.hvalue as string;
		if (definedHeaderData.disabled)
			node.disabled = definedHeaderData.disabled == "true" ? true : false;
	} else
		node.placeholder = "header value here";

	node = document.createElement("button") as HTMLButtonElement;
	sNode.appendChild(node);
	node.appendChild(document.createTextNode('\ud83d\uddd1'));
	node.type = "button";
	node.className = "trash-button";
	node.addEventListener("click", () => {
		deleteHeader("header-" + headersCount, {form: buttonObj.form as HTMLFormElement});
	});
	buttonObj.form![SPChromePrefix + "headerCount"].value = headersCount;
	node = document.getElementById("header-count-display") as HTMLInputElement;
	node.replaceChild(document.createTextNode(headersCount.toString()), node.firstChild as ChildNode);
	return headersCount;
}

function setupMethod(inputObj: any, fromXDigest: boolean = false): number {
	const  // headersNode = document.getElementById("headers"),
		form = inputObj.form as HTMLFormElement,
		postHeaders: {
			name: string; value: string | null
		}[] = [
			{ name: "X-HTTP-METHOD", value:
				"[ {\"method\": \"DELETE\", \"value\": \"DELETE\"}, " +
				"  {\"method\": \"POST\", \"value\": \"MERGE\" }, " +
				"  {\"method\": \"PUT\", \"value\": \"MERGE\" } ]" },
			{ name: "IF-MATCH", value: "*"},
			{ name: "X-RequestDigest", value: null}
		];
	let value: string | null,
			hName: string | null = null,
			hValue: string | null = null,
			json: {value: string; method: string}[],
			headersCount: number = parseInt(inputObj.form[SPChromePrefix + "headerCount"].value);

	if (fromXDigest == true)
		value = inputObj.value;
	else
		value = SPRESTSupportLib.getCheckedInput(form[SPChromePrefix + "method"]) as string;
	if (value == "POST") { // creation of headers
		for (let i = 0; i < postHeaders.length; i++) {
			if (postHeaders[i].name == "X-HTTP-METHOD") {
				json = JSON.parse(postHeaders[i].value as string);
				for (let i of json)
					if (i.method == value) {
						hName = "X-HTTP-METHOD";
						hValue = i.value;
						break;
					}
			} else if (postHeaders[i].name.search(/X-RequestDigest/) >= 0)
				continue;
			else {
				hName = postHeaders[i].name;
				hValue = postHeaders[i].value;
			}
			addHeader(inputObj, {
				hname: hName,
				hvalue: hValue
			});
			headersCount++;
		}
		(document.getElementById("settings") as HTMLDivElement).style.display = "block";
	} else {  // remove headers
		let toDelete = [ ];

		for (let j of postHeaders)
			for (let i = 1; i <= headersCount; i++) {
				hName = form[SPChromePrefix + "header-" + i + "-name"].value;
				if (hName != null && hName.length > 0 && j.name == hName)
					toDelete.push("header-" + i);
			}
		for (let j of toDelete) {
			deleteHeader(j, {form: form});
			headersCount--;
		}
	}
	return headersCount;
}

function setupXDigest(inputObj: HTMLInputElement) {
	const form = inputObj.form as HTMLFormElement,
//		headersNode: HTMLElement = document.getElementById("headers"),
		selectedMethod = SPRESTSupportLib.getCheckedInput(form[SPChromePrefix + "method"]);

	let node: HTMLElement,
		headersCount: number = 0;

	if (inputObj.checked == false) {
		let i: number,
			headerName: string;

		for (i = 0; i < headersCount; i++) {
			headerName = form[SPChromePrefix + "header-" + (i + 1) + "-name"].value;
			if (headerName == "X-RequestDigest") {
				node = form[SPChromePrefix + "header-" + (i + 1) + "-name"];
				while (node.className.search(/headerset/) < 0)
					node = node.parentNode as HTMLElement;
				(node.parentNode as HTMLElement).removeChild(node);
				form[SPChromePrefix + "headerCount"].value = headersCount - 1;
				break;
			}
		}
		return;
	}
	if (selectedMethod == "GET")
		headersCount = setupMethod({value: "POST", form: form}, true); // sets up two POST-related headers
	else
		headersCount = inputObj.form![SPChromePrefix + "headerCount"].value;
	// set up the digest header
	headersCount = addHeader(inputObj, {
		hname: "X-RequestDigest",
		hvalue: "automated fill in during POST|PUT|DELETE|PATCH",
		disabled: true
	});
}

function storeRequestData(form: HTMLFormElement) {
	let reqtable: string[] | string | null,
		data = JSON.stringify({
            url: form[SPChromePrefix + "url"].value,
            method: SPRESTSupportLib.getCheckedInput(form[SPChromePrefix + "method"]),
            select: form[SPChromePrefix + "ODataSelect"].value,
            filter: form[SPChromePrefix + "ODataFilter"].value,
            expand: form[SPChromePrefix + "ODataExpand"].value,
            body: form[SPChromePrefix + "body"].value
        });

	if ((reqtable = localStorage.getItem("PreviousRequests")) == null)
		reqtable = [ ] as string[];
	else
		reqtable = JSON.parse(reqtable) as string[];
	if (reqtable.unshift(data) > 20)
		reqtable.pop();
	localStorage.setItem("PreviousRequests", JSON.stringify(reqtable));
}

function loadPreviousData() {
	let node: HTMLOptionElement,
		reqtable = JSON.parse(localStorage.getItem("PreviousRequests") as string),
		selectObj = document.getElementById("previousRequest") as HTMLSelectElement;

	if (reqtable)
		for (let data of reqtable) {
			node = document.createElement("option");
			node.value = data;
			node.appendChild(document.createTextNode(JSON.parse(data).url));
			selectObj.appendChild(node);
		}
}

function fillPrevious(selectObj: HTMLSelectElement) {
	let form = selectObj.form as HTMLFormElement,
		data = JSON.parse(selectObj.options[selectObj.selectedIndex].value);

	form[SPChromePrefix + "url"].value = data.url;
	SPRESTSupportLib.setCheckedInput(form[SPChromePrefix + "method"], data.method);
	form[SPChromePrefix + "ODataSelect"].value = data.select;
	form[SPChromePrefix + "ODataFilter"].value = data.filter;
	form[SPChromePrefix + "ODataExpand"].value = data.expand;
	form[SPChromePrefix + "body"].value = data.body;
}

function renderObjectInMarkup(response: any) {

}

// initialize
/*
$(document).ready(function () {
	loadPreviousData();
	if (typeof SP != "undefined")
		SPChromePrefix = prefix;
	document.getElementById("request-url").form.reset();
});
*/
/*************************************************************
 *  Surrogate pair calculation
 *     high = (unicode value - 0x10000) / 0x400 + 0xd800
 *     low =  (unicode value - 0x10000) % 0x400 + 0xdc00
 *  Back calcualtion
 *     unicode value = (high - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000
 *
 *************************************************************/