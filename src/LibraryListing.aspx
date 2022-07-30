<!DOCTYPE html>
<html lang="en-us">

<head>
<title>Library Listing</title>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
<script src="common.js"></script>
<script src="liblisting2.js"></script>

<style>
    body {
        background-color: #f8fff8;
        font: normal 11pt Arial, sans-serif;
    }
    div#container {
        width: 120em;
        margin: 1em auto;
    }
    label {
        display: inline-block;
        margin: 0.5em 1em;
        color: purple;
        font: bold 10pt Helvetica, sans-serif;
    }
    input {
        font: normal 11pt Arial, sans-serif;
    }
    form#theForm {
        border: 1px solid blue;
        padding: 1em 3em;
        min-height: 25em;
    }
    p#title {
        font: bold 14pt Verdana, sans-serif;
        color: blue;
    }
    fieldset#date-control {
        display: grid;
        grid-template-columns: auto auto auto auto;
        width: 40%;
        align-items: center;
        justify-items: center;
        padding: 0 0.5em;
        float: right;
    }
    fieldset#date-control p {
        margin: 0;
    }
    fieldset#date-control label {
        margin: 0.3em auto;
    }
    
    table {
        border: 2px solid green;
        width: 100%;
    }
    
    td {
        border: 1px solid black;
        padding: 0.2em 0.5em;
    }
    
    th {
        color: white;
        background-color: black;
    }
    p#counts {
        font: bold 10pt Verdana, sans-serif;
    }
    span#folder-count,
    span#file-count {
        margin-right: 2em;
        font: bold 13pt Arial, sans-serif;
        color: green;
    }
    td.folderpath {
        font: bold italic 83% 'Segoe UI', Tahoma, sans-serif;
        color: blue;
        background-color: #f0f0ff;
        text-indent: 3em;
    }
    </style>
</head>

<body>

<div id="container">
<p id="title">Library Listing</p>
<form id="theForm">
    <!--
    <label>URL: <input name="url" size="120"
            value="https://cawater.sharepoint.com/teams/swp-dom/RSO/PSMP" /></label>
    <br /><button type="button" onclick="updateListing();">Update Listing</button>
    <fieldset id="date-control">
        <p id="date-error"
            style="grid-column:1 / span 4;display:none;color:red;font:normal 10pt Arial,sans-serif;">
            Date search missing settings: select created or modified, before or after,
            then the date
        </p>
        <p>
            <input type="radio" name="displaytype" id="created" value="created"
                onchange="clearErrors();" /><label for="created">Display files created:</label> </br>
            <input type="radio" name="displaytype" id="modified" value="modified"
                onchange="clearErrors();" /><label for="v">Display files modified:</label>
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
-->
</form>
</div> <!-- id=container -->
</body>

</html>