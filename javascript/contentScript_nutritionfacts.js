

window.onload(console.log("script executed"),gatherContent());

function gatherContent(){
    console.log("gathering information")
    var recipeName = document.getElementsByClassName("wprm-recipe-name")[0].innerHTML

    console.log(recipeName)
    var descriptionList = gatherDescription();
    console.log(descriptionList)

    var ingredientList = gatherIngredients()
    console.log(ingredientList)
    var instructionList = gatherInstructions();
    console.log(instructionList)

    
    // console.log(recipeDescription)
    // console.log(gatherIngredients())
}


function iterateChildNode(childNode){
    console.log(`traversing node with ${childNode.children.length} nodeChilds `)
    // iterating through each Node until end was reached
    // being more or less recursive in its idea

    if (childNode.nodeType == 3){
        // found lowest element already
        var childNodeString = childNode.nodeValue
        console.log(childNodeString)
        return childNodeString;
    } 
    
    // matching link
    if (childNode.nodeType == 1 && childNode.localName == "a"){
        // found link with href etc!
        var convertedLink = `[${childNode.innerHTML}](${childNode.href})`;
        console.log(convertedLink)
        return convertedLink;
    }

    // matching underlined text
    if (childNode.nodeType == 1 && childNode.localName == "em"){
        var convertedString = `_${childNode.innerHTML}_`;
        return convertedString
    }


    var childNodeChildAmount = childNode.children.length


    if (childNode.nodeType == 1 && childNode.localName == "div" && childNodeChildAmount == 0){
        console.log("empty div found")
        return " "
    }
    if (childNodeChildAmount == 0){
        console.log("empty child found")
        return " "
    } else{ 
        var concatenatedDescription = ""
        // found further elements in node
        for ( i = 0 ; i < childNodeChildAmount; i++){
            // console.log(i)
            // traversing through all childNodes
            returnedValue = iterateChildNode(childNode.children[i]);
            concatenatedDescription = concatenatedDescription + returnedValue;
            console.log(returnedValue);
        }
        return concatenatedDescription
    } 

}

function gatherIngredients(){
    // anchor to ul-element
    var ingredientDomAnchor = document.getElementsByClassName("wprm-recipe-ingredients")[0]
    var ingredientList = traverseList(ingredientDomAnchor,prepareContent)
    return ingredientList
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