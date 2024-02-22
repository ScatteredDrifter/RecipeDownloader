// contentScript gathering data from selected website
// returns formatted data to main.js

// TODO sentinel values
var filePrefix = "";
var selectedFileType = "";

browser.runtime.onMessage.addListener((request) => {
  console.log("gathering message");
  filePrefix = request.filePrefix;
  selectedFileType = request.fileType;
  var usedWebsite = request.usedWebsite;

  //  executing download
  var recipeData = queryNutritionfacts();
  // returning obtained value to sender
  return Promise.resolve({
    recipe: recipeData,
  });
});

function queryNutritionfacts() {
  console.log("querying nutritionfacts");
  var recipeName =
    document.getElementsByClassName("wprm-recipe-name")[0].innerHTML;

  var descriptionList = gatherDescription();
  var ingredientList = gatherIngredients();
  var instructionList = gatherInstructions();
  var recipeLink = window.location.href;
  var portionAmount = gatherPortionAmount();
  var imageSource = gatherImage();

  condensedInformation = {
    name: recipeName,
    url: recipeLink,
    portion: portionAmount,
    imageSource: imageSource,
    description: summarizeArray(descriptionList),
    ingredients: ingredientList,
    instructions: instructionList,
  };

  return condensedInformation;
}

function gatherIngredients() {
  // anchor to ul-element
  var ingredientDomAnchor = document.getElementsByClassName(
    "wprm-recipe-ingredients"
  )[0];
  var ingredientList = traverseList(ingredientDomAnchor, (item) => {
    return item.innerText.replace("▢\n", "");
  });
  return ingredientList;
}

function gatherPortionAmount() {
  var portionAmountAnchor =
    document.getElementsByClassName("wprm-toggle-active")[0];
  var portionAmount = portionAmountAnchor.innerText;

  //  convert from 1x to 1
  convertedPortionAmount = portionAmount.replace("x", "");
  return convertedPortionAmount;
}

function gatherInstructions() {
  // anchor to ul-element of instructions
  var instructionDomAnchor = document.getElementsByClassName(
    "wprm-recipe-instructions"
  )[0];
  var instructionList = traverseList(instructionDomAnchor, prepareContent);
  return instructionList;
}

function gatherDescription() {
  var descriptionDomAnchor = document.getElementsByClassName(
    "wprm-recipe-summary"
  )[0];
  // var descriptionList = traverseList(descriptionDomAnchor,prepareContent)
  var descriptionList = traverseList(descriptionDomAnchor, processText);
  return descriptionList;
}

function gatherImage() {
  // queries for given class and returns href of image
  var imageDomAnchor = document.getElementsByClassName("wprm-recipe-image")[0];
  var imageChildNode = imageDomAnchor.childNodes[0];
  var imageSource = imageChildNode.src;

  return imageSource;
}

// general function traversing through a list of given elements
// extracts each ChildNode's content according to supplied "prepareContent" function
function traverseList(topListElement, functionToCall) {
  var obtainedElements = [];
  var ListChildNodes = topListElement.childNodes;
  ListChildNodes.forEach((childNode) => {
    // var processedContent = prepareContent(childNode)
    var processedContent = functionToCall(childNode);
    obtainedElements.push(processedContent);
  });
  return obtainedElements;
}

// used to process Data obtained within a Node
function prepareContent(contentNode) {
  return contentNode.innerText;
}

function processSpecialElement(childNode) {
  if (childNode.localName == "a") {
    var convertedLink = `[${childNode.innerHTML}](${childNode.href})`;
    return convertedLink;
  } else if (childNode.localName == "em") {
    var convertedUnderline = `_${childNode.innerText}_`;
    return convertedUnderline;
  } else {
    return childNode.innerText;
  }
}

function processText(contentNode) {
  // supposed this Node includes further nodes with more content
  // possible types are:
  // - Links
  // - list
  // - empty
  var NodeChildLength = contentNode.childNodes.length;
  if (NodeChildLength == 1) {
    // found special case -> link, underlined or similar
    return processSpecialElement(contentNode);
  } else if (NodeChildLength > 0) {
    // found item with multiple items within, traversing again
    nestedContentList = [];
    contentNode.childNodes.forEach((childNodeFound) => {
      var processedContent = processText(childNodeFound, processText);
      nestedContentList.push(processedContent);
    });
    return nestedContentList;
  } else {
    // empty child
    var gatheredContent = contentNode.innerText;
    if (gatheredContent == undefined) {
      gatheredContent = contentNode.nodeValue;
    }
    return gatheredContent;
  }
}

function summarizeArray(ArrayToCompress) {
  // converts array to string
  var condensedString = "";
  ArrayToCompress.forEach((item) => {
    condensedString = condensedString + item;
  });
  return condensedString;
}

// taken from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function hashCode(str) {
  return str
    .split("")
    .reduce(
      (prevHash, currVal) =>
        ((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0,
      0
    );
}
