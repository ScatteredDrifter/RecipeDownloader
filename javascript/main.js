// This file contains the primary code to extract
// and prepare a recipe for download

// global variables - unfortunately :/
var statusCodeField = null;
var STATUS_PREFIX = "status:";
var debugField = null;
var currentTab = null;

// initial setup
document.addEventListener("DOMContentLoaded", initializeScript);


/**
 * loads script and adds event listener
 */
function initializeScript() {
  console.log("initialized script");
  var downloadButton = document.getElementById("downloadRecipe");
  statusCodeField = document.getElementById("statuscode");
  debugField = document.getElementById("debug");

  downloadButton.addEventListener("click", prepareDownload);
}

// -- debug functions --

/**
 * prints debug message to the status code field
 * @param {String} message 
 */
function printDebug(message) {
  statusCodeField.innerHTML = STATUS_PREFIX + message;
}

/**
 * write debug message to the debug field
 * @param {String} message 
 */
function writeDebug(message) {
  debugField.innerHTML = message;
//   debugField.style = "display:none";
}

/**
 * returns the actively opened tab
 * @returns {Object} activeTab, denotes selected tab as object
 * see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/Tab
 */
async function gatherActiveTab() {
  return activeTab = await browser.tabs
    .query({ currentWindow: true, active: true })
    .then(
      (result) => {
        // success
        let tab = result[0];
        currentTab = tab;
        printDebug(currentTab.id);
      },
      // fails
      console.error
    );
}

/**
 * takes user settings from popup
 * @returns {Object} gatheredInput
 */
function gatherUserSelection() {
  // function to select inputs from user
  var filePrefix = document.getElementById("filePrefix").value;
  var selectedFileType = document.querySelector(
    'input[name="filetype"]:checked'
  ).value;

  var gatheredInput = {
    filePrefix: filePrefix,
    fileType: selectedFileType,
  };
  return gatheredInput;
}

/**
 * takes userInput and the active tab to execute the corresponding content script
 * 
 */
async function prepareDownload() {
  printDebug("button clicked");
  // detecting active Tab
  var userInput = gatherUserSelection();
  
  var activeTab = await gatherActiveTab();
  // writeDebug(currentTab.id);
  executeScript(currentTab, userInput);
}


/**
 * 
 * @param {tab} activeTab, denotes tab to run script on
 * @param {Object} userSelection, denotes user selection
 */
async function executeScript(activeTab, userSelection) {
  // executing content script to gather recipe

  // FIXME query how to crawl through the website
  // after all getting the information depends on the website observed
  // allows to separate those into files
  var crawlerPath = selectCrawler("nutritionfacts");

  try {
    await browser.scripting
      .executeScript({
        target: {
          tabId: activeTab.id,
        },

        files: crawlerPath,
      })
      .then(() => {
        // sending acquired parameters to **content script**
        const parameter = browser.tabs
          .sendMessage(currentTab.id, userSelection)
          .then((response) => {
            // gathering response from tab
            // converting obtained recipe to requested format
            var convertedData = dataToType(
              response.recipe,
              userSelection.fileType
            );
            // downloading recipe
            var recipeName = stringToFilename(response.recipe.name);
            downloadRecipe(
              convertedData,
              recipeName,
              userSelection.filePrefix,
              userSelection.fileType
            );
          });
      });
  } catch (err) {
    printDebug(`failed to execute script ${err}`);
  }
}

/**
 * based on received website it selects the corresponding content script to run
 * necessary because websites store their recipes differently
 * @param {String} usedWebsite, denotes link to website
 * @returns {Array} crawlerPath, selected content script
 */
function selectCrawler(usedWebsite) {
  switch (usedWebsite) {
    case "nutritionfacts":
      return ["/javascript/contentScript_nutritionfacts.js"];
  }
}

/* further websites to support may include:
case "https://www.loveandlemons.com/":
case "https://www.bonappetit.com/":
case "https://www.bbcgoodfood.com/":
case "https://www.chefkoch.de/":
case "https://www.lecker.de/":
case "https://www.skinnytaste.com/":
*/

// ----------------- conversion of retrieved recipe -----------------

/*
The following datastructure denotes the received information about a recipe 
the structure of this Object "unvconvertedData" is denoted as follows
  Key:Value
  name: String, recipe Name
  url: String, link to original recipe
  portion: Number, amount of portions
  imageSource: String, link for dish preview
  description: String, description of the dish
  ingredients: Array, list of ingredients
  instructions: Array, list of instructions
*/

/**
 * 
 * @param {Object} unconvertedData, denotes obtained data from website
 * @param {*} selectedFileType 
 * @returns 
 */
function dataToType(unconvertedData, selectedFileType) {
  // function selecting which format to convert to
  // returns the data afterwards
  switch (selectedFileType) {
    case "markdown":
      printDebug("choosen markdown");

      return convertToMarkdown(unconvertedData);
    case "json":
      printDebug("choosen json");
      return convertToJson(unconvertedData);
    default:
      return convertToMarkdown(unconvertedData);
  }
}

/**
 * converts uncondensed recipe and returns string in markdown format
 * 
 * @param {Object} condensedRecipe, denotes unconverted data
 * @returns {String} markdownString, denotes converted data
 */
function convertToMarkdown(condensedRecipe) {
  // generating markdown string to download as file

  var ingredientList = condensedRecipe["ingredients"];
  ingredientListMarkdown = ArrayToMarkdownString(ingredientList);
  var descriptionList = condensedRecipe["instructions"];
  descriptionListMarkdown = ArrayToMarkdownString(descriptionList);

  var portionAmount = condensedRecipe["portion"];

  var markdownString = `# ${condensedRecipe["name"]}: \n 
anchored to **EnterNode** 

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

    `;
  return markdownString;
}

function ArrayToMarkdownString(ArrayToConvert) {
  // converts array to markdown string
  var markdownListing = "";
  for (i = 0; i < ArrayToConvert.length; i++) {
    var listItem = `${i + 1}. ${ArrayToConvert[i]}\n`;
    markdownListing += listItem;
  }
  return markdownListing;
}

/**
 * takes uncondensed recipe and returns string in json format
 * 
 * @param {Object} condensedRecipe, denotes unconverted recipe data, see aboves definition
 * @returns {String} convertedJson, denotes converted recipe data
 */
function convertToJson(condensedRecipe) {
  console.log("converting to json");
  var recipeName = condensedRecipe["name"];
  var recipeId = hashCode(recipeName);
  var jsonContent = {
    id: Math.abs(recipeId),
    name: recipeName,
    description: condensedRecipe["description"],
    url: condensedRecipe["url"],
    image: condensedRecipe["imageSource"],
    prepTime: null,
    cookTime: null,
    totalTime: null,
    recipeCategory: "",
    keywords: "",
    recipeYield: condensedRecipe["portion"],
    tool: [],
    recipeIngredient: condensedRecipe["ingredients"],
    recipeInstructions: condensedRecipe["instructions"],
    nutrition: {},
    "@context": "http://schema.org",
    "@type": "Recipe",
    dateModified: "2023-09-29T23:34:10+0000",
    dateCreated: "2023-09-29T23:34:10+0000",
  };
  var convertedJson = JSON.stringify(jsonContent);

  // convertedJson = jsonToReadableJson(convertedJson)
  return convertedJson;
  // console.log("converting to json")
  // var jsonRepresentation = JSON.stringify(condensedRecipe)
  // console.log(jsonRepresentation)
}

/**
 * returns string denoting file ending
 * @param {String} filetype, denotes type of file
 * @returns {String}, denotes file ending
 */
function determineFileEnding(filetype) {
  // TODO convert to matching Case
  switch (filetype) {
    case "markdown":
      return ".md";
    case "json":
      return ".json";
    default:
      return ".txt";
  }
}

/**
 * removes whitespace from string and replaces it with "-"
 * 
 * @param {String} string 
 * @returns {String} convertedString, denotes converted string
 */
function stringToFilename(string) {
  // converts string to be filename friendly.
  //  this means removeing escape characters and whitespaces
  // var regexDisallowedCharacters = /\\'/
  convertedString = string.replaceAll(" ", "-");
  return convertedString;
}

/**
 * takes converted recipe and downloads it as file
 * FIXME create custom datatype!
 * @param {String} convertedFileContent, denotes converted recipe 
 * @param {String} filename, denotes name of file 
 * @param {String} filePrefix 
 * @param {String} type 
 */
function downloadRecipe(convertedFileContent, filename, filePrefix, type) {
  // downloading Recipe after conversion
  console.log("downloading converted recipe");

  var fileEnding = determineFileEnding(type);
  var recipeFile = `${filePrefix}${type}_${filename}${fileEnding}`;

  var downloadLink = document.createElement("a");
  downloadLink.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(convertedFileContent)
  );
  downloadLink.setAttribute("download", recipeFile);

  downloadLink.style.display = "none";

  // document.body.appendChild(downloadLink);

  downloadLink.click();

  // document.body.downloadLink(downloadLink);
}
