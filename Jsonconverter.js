/*\
|*|
|*|    JXON framework - Copyleft 2011 by Mozilla Developer Network
|*|
|*|    Revision #2 - August 27th, 2015
|*|
|*|    https://developer.mozilla.org/en-US/docs/JXON
|*|    https://developer.mozilla.org/User:fusionchess
|*|
|*|    This framework is released under the GNU Public License, version 3 or later.
|*|    http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
\*/

const JXON = new (function () {

  const
    sValProp = "keyValue", sAttrProp = "keyAttributes", sAttrsPref = "@", /* you can customize these values */
    aCache = [], rIsNull = /^\s*$/, rIsBool = /^(?:true|false)$/i;

  function parseText (sValue) {
    if (rIsNull.test(sValue)) { return null; }
    if (rIsBool.test(sValue)) { return sValue.toLowerCase() === "true"; }
    if (isFinite(sValue)) { return parseFloat(sValue); }
    if (isFinite(Date.parse(sValue))) { return new Date(sValue); }
    return sValue;
  }

  function EmptyTree () {}

  EmptyTree.prototype.toString = function () { return "null"; };

  EmptyTree.prototype.valueOf = function () { return null; };

  function objectify (vVal) {
    return vVal === null ? new EmptyTree() : vVal instanceof Object ? vVal : new vVal.constructor(vVal);
  }

  function createObjTree (oParentNode, nVerb, bFreeze, bNesteAttr) {

    const
      nLevelStart = aCache.length, bChildren = oParentNode.hasChildNodes(),
      bAttributes = oParentNode.hasAttributes && oParentNode.hasAttributes(), bHighVerb = Boolean(nVerb & 2);

    var
      sProp, vContent, nLength = 0, sCollectedTxt = "",
      vResult = bHighVerb ? {} : /* put here the default value for empty nodes: */ true;

    if (bChildren) {
      for (var oNode, nItem = 0; nItem < oParentNode.childNodes.length; nItem++) {
        oNode = oParentNode.childNodes.item(nItem);
        if (oNode.nodeType === 4) { sCollectedTxt += oNode.nodeValue; } /* nodeType is "CDATASection" (4) */
        else if (oNode.nodeType === 3) { sCollectedTxt += oNode.nodeValue.trim(); } /* nodeType is "Text" (3) */
        else if (oNode.nodeType === 1 && !oNode.prefix) { aCache.push(oNode); } /* nodeType is "Element" (1) */
      }
    }

    const nLevelEnd = aCache.length, vBuiltVal = parseText(sCollectedTxt);

    if (!bHighVerb && (bChildren || bAttributes)) { vResult = nVerb === 0 ? objectify(vBuiltVal) : {}; }

    for (var nElId = nLevelStart; nElId < nLevelEnd; nElId++) {
      sProp = aCache[nElId].nodeName.toLowerCase();
      vContent = createObjTree(aCache[nElId], nVerb, bFreeze, bNesteAttr);
      if (vResult.hasOwnProperty(sProp)) {
        if (vResult[sProp].constructor !== Array) { vResult[sProp] = [vResult[sProp]]; }
        vResult[sProp].push(vContent);
      } else {
        vResult[sProp] = vContent;
        nLength++;
      }
    }

    if (bAttributes) {

      const
        nAttrLen = oParentNode.attributes.length,
        sAPrefix = bNesteAttr ? "" : sAttrsPref, oAttrParent = bNesteAttr ? {} : vResult;

      for (var oAttrib, nAttrib = 0; nAttrib < nAttrLen; nLength++, nAttrib++) {
        oAttrib = oParentNode.attributes.item(nAttrib);
        oAttrParent[sAPrefix + oAttrib.name.toLowerCase()] = parseText(oAttrib.value.trim());
      }

      if (bNesteAttr) {
        if (bFreeze) { Object.freeze(oAttrParent); }
        vResult[sAttrProp] = oAttrParent;
        nLength -= nAttrLen - 1;
      }

    }

    if (nVerb === 3 || (nVerb === 2 || nVerb === 1 && nLength > 0) && sCollectedTxt) {
      vResult[sValProp] = vBuiltVal;
    } else if (!bHighVerb && nLength === 0 && sCollectedTxt) {
      vResult = vBuiltVal;
    }

    if (bFreeze && (bHighVerb || nLength > 0)) { Object.freeze(vResult); }

    aCache.length = nLevelStart;

    return vResult;

  }

  function loadObjTree (oXMLDoc, oParentEl, oParentObj) {

    var vValue, oChild;

    if (oParentObj.constructor === String || oParentObj.constructor === Number || oParentObj.constructor === Boolean) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toString())); /* verbosity level is 0 or 1 */
      if (oParentObj === oParentObj.valueOf()) { return; }
    } else if (oParentObj.constructor === Date) {
      oParentEl.appendChild(oXMLDoc.createTextNode(oParentObj.toGMTString()));
    }

    for (var sName in oParentObj) {
      vValue = oParentObj[sName];
      if (isFinite(sName) || vValue instanceof Function) { continue; } /* verbosity level is 0 */
      if (sName === sValProp) {
        if (vValue !== null && vValue !== true) { oParentEl.appendChild(oXMLDoc.createTextNode(vValue.constructor === Date ? vValue.toGMTString() : String(vValue))); }
      } else if (sName === sAttrProp) { /* verbosity level is 3 */
        for (var sAttrib in vValue) { oParentEl.setAttribute(sAttrib, vValue[sAttrib]); }
      } else if (sName.charAt(0) === sAttrsPref) {
        oParentEl.setAttribute(sName.slice(1), vValue);
      } else if (vValue.constructor === Array) {
        for (var nItem = 0; nItem < vValue.length; nItem++) {
          oChild = oXMLDoc.createElement(sName);
          loadObjTree(oXMLDoc, oChild, vValue[nItem]);
          oParentEl.appendChild(oChild);
        }
      } else {
        oChild = oXMLDoc.createElement(sName);
        if (vValue instanceof Object) {
          loadObjTree(oXMLDoc, oChild, vValue);
        } else if (vValue !== null && vValue !== true) {
          oChild.appendChild(oXMLDoc.createTextNode(vValue.toString()));
        }
        oParentEl.appendChild(oChild);
      }
    }

  }
  
  


  /* Uncomment the following code if you want to enable the .appendJXON() method for *all* the "element" objects! */

  /*

  Element.prototype.appendJXON = function (oObjTree) {
    loadObjTree(document, this, oObjTree);
    return this;
  };

  */

  this.build = function (oXMLParent, nVerbosity /* optional */, bFreeze /* optional */, bNesteAttributes /* optional */) {
    const nVerbMask = arguments.length > 1 && typeof nVerbosity === "number" ? nVerbosity & 3 : /* put here the default verbosity level: */ 1;
    return createObjTree(oXMLParent, nVerbMask, bFreeze || false, arguments.length > 3 ? bNesteAttributes : nVerbMask === 3);
  };

  this.unbuild = function (oObjTree, sNamespaceURI /* optional */, sQualifiedName /* optional */, oDocumentType /* optional */) {
    const oNewDoc = document.implementation.createDocument(sNamespaceURI || null, sQualifiedName || "", oDocumentType || null);
    loadObjTree(oNewDoc, oNewDoc, oObjTree);
    return oNewDoc;
  };

})();

function ajax_post(array){
    // Create our XMLHttpRequest object
    var hr = new XMLHttpRequest();
    // Create some variables we need to send to our PHP file
    var url = "ajax.php";
    var vars = "array="+array;
    hr.open("POST", url, true);
    // Set content type header information for sending url encoded variables in the request
    hr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // Access the onreadystatechange event for the XMLHttpRequest object
    hr.onreadystatechange = function() {
	    if(hr.readyState == 4 && hr.status == 200) {
		    var return_data = hr.responseText;
			document.getElementById("status").innerHTML = return_data;
	    }
    }
    // Send the data to PHP now... and wait for response to update the status div
    hr.send(vars); // Actually execute the request
    document.getElementById("status").innerHTML = "processing...";
}
	function Block(PartCode, Type, Color, BlockType){
		
		this.PartCode = PartCode;
		this.Type = Type;
		this.Color = Color;
		this.BlockType = BlockType;
	}

var arrayp = [2];

arrayp[0] = new Block("4541728", "6", "2", "Normal");

function ajax(){
//Crea el objeto de Chasis en el arreglo de bloque

 var myCar = {
  "LegoBlock": {
    "PartCode": arrayp[0].PartCode,
    "PositionX": arrayp[0].Type,
    "PositionZ": arrayp[0].Color,
    "BlockType": arrayp[0].BlockType
  }
}	 

			//alert(arrayBlock[arrayBlockCounter].PartCode);
			var array_demo = JXON.unbuild(myCar);
			var oSerializer = new XMLSerializer();
			var sXML = oSerializer.serializeToString(array_demo);
			//var array_demo = JSON.stringify(myCar);
			alert(sXML);
			ajax_post(sXML);
}