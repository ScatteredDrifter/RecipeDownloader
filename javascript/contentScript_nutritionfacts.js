

window.onload(console.log("script executed"),executeDownload());
// TODO later to be merged with received options instead
var markdown = "markdown"
var json = "json"


function executeDownload(){
    
    obtainedData = gatherContent()

    var convertedData = convertToMarkdown(obtainedData)
    // console.log(convertedData)
    
    var convertedJson = convertToJson(obtainedData)
    // console.log(convertedJson)

    var filename = stringToFilename(obtainedData["name"])
    downloadRecipe(convertedData,filename,"markdown")
    downloadRecipe(convertedJson,filename,"json")
    
}

function stringToFilename(string){
    // converts string to be filename friendly. 
    //  this means removeing escape characters and whitespaces
    // var regexDisallowedCharacters = /\\'/
    convertedString = string.replaceAll(" ","-")
    console.log(convertedString)
    return convertedString
}

function downloadRecipe(convertedFileContent,name,type){
    // downloading Recipe after conversion
    console.log("downloading converted recipe")

    var fileEnding = determineFileEnding(type)
    var filename = `${type}_${name}${fileEnding}`

    var downloadLink = document.createElement('a');
    downloadLink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(convertedFileContent));
    downloadLink.setAttribute("download",filename);
    
    downloadLink.style.display = 'none';
    
    // document.body.appendChild(downloadLink);

    downloadLink.click();

    // document.body.downloadLink(downloadLink);
}

function determineFileEnding(typeAsString){
    // TODO convert to matching Case
    if (typeAsString == "markdown"){
        return ".md"
    }
    else if (typeAsString == "json"){
        return ".json"
    }
    else {
        return ".txt"
    }
}

function convertToMarkdown(condensedRecipe){
    // generating markdown string to download as file

    var ingredientList = condensedRecipe["ingredients"]
    ingredientListMarkdown = ArrayToMarkdownString(ingredientList)
    var descriptionList = condensedRecipe["instructions"]
    descriptionListMarkdown = ArrayToMarkdownString(descriptionList)

    var portionAmount = condensedRecipe["portion"]

    var markdownString = 
    `# ${condensedRecipe["name"]}: \n 
anchored to **EnterNode** 
s
original Recipe found [here](${condensedRecipe["url"]})

--- 
## Description:
${condensedRecipe["description"]}

This recipe will yield ${portionAmount} portions

## Ingredients:
This recipe requires the following **ingredients** for ${portionAmount} portions
${ingredientListMarkdown}
    
## Instructions:
Follow belows set of instruction to prepare this **meal**. 
${descriptionListMarkdown}

### Image:
This image was provided by the original website hosting it.

![image](${condensedRecipe["imageSource"]})

--- 
Enjoy your meal. 

    ` 
    return markdownString

}

function convertToJson(condensedRecipe){
    console.log("converting to json")
    // given a struct with:
    // @param condensedRecipe
    // - name 
    // - description
    // - ingredients
    // - instructions
    // returns Json
    var recipeName = condensedRecipe["name"]
    var recipeId = hashCode(recipeName)
    var jsonContent = {
    "id": Math.abs(recipeId),
    "name": recipeName,
    "description": condensedRecipe["description"],
    "url":condensedRecipe["url"],
    "image":condensedRecipe["imageSource"],
    "prepTime":null,
    "cookTime":null,
    "totalTime":null,
    "recipeCategory":"",
    "keywords":"",
    "recipeYield":condensedRecipe["portion"],
    "tool":[],
    "recipeIngredient":condensedRecipe["ingredients"],
    "recipeInstructions":condensedRecipe["instructions"],
    "nutrition":{},
    "@context":"http:\/\/schema.org",
    "@type":"Recipe",
    "dateModified":"2023-09-29T23:34:10+0000",
    "dateCreated":"2023-09-29T23:34:10+0000",
    }
    var convertedJson = JSON.stringify(jsonContent)

    // convertedJson = jsonToReadableJson(convertedJson)
    return convertedJson
    // console.log("converting to json")
    // var jsonRepresentation = JSON.stringify(condensedRecipe)
    // console.log(jsonRepresentation)
}

function gatherContent(){
    console.log("gathering information")
    var recipeName = document.getElementsByClassName("wprm-recipe-name")[0].innerHTML

    var descriptionList = gatherDescription();
    var ingredientList = gatherIngredients()
    var instructionList = gatherInstructions();
    var recipeLink = window.location.href
    var portionAmount = gatherPortionAmount();
    var imageSource = gatherImage();

    condensedInformation = { 
        'name' : recipeName,
        'url': recipeLink,
        'portion' : portionAmount,
        'imageSource': imageSource,
        'description' : summarizeArray(descriptionList),
        'ingredients' : ingredientList,
        'instructions' : instructionList,
    }

    return condensedInformation
}

function gatherIngredients(){
    // anchor to ul-element
    var ingredientDomAnchor = document.getElementsByClassName("wprm-recipe-ingredients")[0]
    var ingredientList = traverseList(ingredientDomAnchor,(item) => { return item.innerText.replace("▢\n","")})
    return ingredientList
}

function gatherPortionAmount(){
    var portionAmountAnchor = document.getElementsByClassName("wprm-toggle-active")[0];
    var portionAmount = portionAmountAnchor.innerText;

    //  convert from 1x to 1
    convertedPortionAmount = portionAmount.replace("x","")
    return convertedPortionAmount
}

function gatherInstructions(){
    // anchor to ul-element of instructions 
    var instructionDomAnchor = document.getElementsByClassName("wprm-recipe-instructions")[0]
    var instructionList = traverseList(instructionDomAnchor,prepareContent)
    return instructionList
}

function gatherDescription(){
    var descriptionDomAnchor = document.getElementsByClassName("wprm-recipe-summary")[0]
    // var descriptionList = traverseList(descriptionDomAnchor,prepareContent)
    var descriptionList = traverseList(descriptionDomAnchor,processText)
    return descriptionList
}

function gatherImage(){
    // queries for given class and returns href of image 
    var imageDomAnchor = document.getElementsByClassName("wprm-recipe-image")[0]
    var imageChildNode = imageDomAnchor.childNodes[0]
    var imageSource = imageChildNode.src

    return imageSource
}

// general function traversing through a list of given elements 
// extracts each ChildNode's content according to supplied "prepareContent" function
function traverseList(topListElement,functionToCall){
    var obtainedElements = []
    var ListChildNodes = topListElement.childNodes 
    ListChildNodes.forEach( (childNode) => {
        // var processedContent = prepareContent(childNode)
        var processedContent = functionToCall(childNode)
        obtainedElements.push( processedContent)
    })
    return obtainedElements
}

// used to process Data obtained within a Node
function prepareContent(contentNode){
    return contentNode.innerText
}

function processSpecialElement(childNode){
    if(childNode.localName == "a"){
        var convertedLink = `[${childNode.innerHTML}](${childNode.href})`;
        return convertedLink
    } else if (childNode.localName == "em"){
        var convertedUnderline = `_${childNode.innerText}_`;
        return convertedUnderline
    } else {
        return childNode.innerText;

    }
}

function processText(contentNode){
    // supposed this Node includes further nodes with more content 
    // possible types are:
    // - Links 
    // - list 
    // - empty 
    var NodeChildLength = contentNode.childNodes.length
    if (NodeChildLength == 1){
        // found special case -> link, underlined or similar
        return processSpecialElement(contentNode)
    } else if (NodeChildLength > 0){
        // found item with multiple items within, traversing again
        nestedContentList = []
        contentNode.childNodes.forEach( (childNodeFound) =>{
            var processedContent = processText(childNodeFound,processText)
            nestedContentList.push(processedContent)

        })
        return nestedContentList
    } else {
        // empty child
        var gatheredContent = contentNode.innerText
        if (gatheredContent == undefined){
            gatheredContent = contentNode.nodeValue
        }
        return gatheredContent
    }
}

function ArrayToMarkdownString(ArrayToConvert){
    // converts array to markdown string
    var markdownListing = ""
    for (i = 0 ; i < ArrayToConvert.length ; i++){
        var listItem = `${i+1}. ${ArrayToConvert[i]}\n`
        markdownListing += listItem
    }
    return markdownListing

}


function summarizeArray(ArrayToCompress){
    // converts array to string 
    console.log("processing array")
    var condensedString = ""
    ArrayToCompress.forEach( (item) =>{
        condensedString = condensedString + item

    })
    return condensedString
}


// taken from https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
function hashCode(str) {
    
    return str.split('').reduce((prevHash, currVal) =>
      (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
  }