// This file contains the primary code to extract
// and prepare a recipe for download

// global variables - unfortunately :/
var statusCodeField = null;
var statusCodeText = "statuscode:";
var debugField = null;
var currentTab = null;

// initial setup
document.addEventListener("DOMContentLoaded", initializeScript);

// function setting up environment for downloading
function initializeScript() {
  console.log("initialized script");
  var downloadButton = document.getElementById("downloadRecipe");
  statusCodeField = document.getElementById("statuscode");
  debugField = document.getElementById("debug");

  downloadButton.addEventListener("click", setupDownload);
}

function updateStatusCodeField(message) {
  statusCodeField.innerHTML = statusCodeText + message;
}
function writeDebug(message) {
  debugField.innerHTML = message;
  debugField.style = "display:none";
}

// function gathers the first tab from a list
// of tabs
// sets this tabs as "currentTab"
async function gatherActiveTab() {
  activeTab = await browser.tabs
    .query({ currentWindow: true, active: true })
    .then(
      (result) => {
        // success
        let tab = result[0];
        currentTab = tab;
        updateStatusCodeField(currentTab.id);
        return currentTab;
      },
      // fails
      console.error
    );
}

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

async function setupDownload() {
  updateStatusCodeField("button clicked");
  // detecting active Tab
  var userInput = gatherUserSelection();
  var activeTab = await gatherActiveTab();
  // writeDebug(currentTab.id);
  executeScript(currentTab, userInput);
}

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
    updateStatusCodeField(`failed to execute script ${err}`);
  }
}

function selectCrawler(usedWebsite) {
  // function selecting which crawler to use
  // returns the crawler afterwards
  switch (usedWebsite) {
    case "nutritionfacts":
      return ["/javascript/contentScript_nutritionfacts.js"];
  }
}

/*
case "https://www.loveandlemons.com/":
case "https://www.skinnytaste.com/":
*/

// ----------------- conversion of retrieved recipe -----------------

function dataToType(unconvertedData, selectedFileType) {
  // function selecting which format to convert to
  // returns the data afterwards
  switch (selectedFileType) {
    case "markdown":
      updateStatusCodeField("choosen markdown");

      return convertToMarkdown(unconvertedData);
    case "json":
      updateStatusCodeField("choosen json");
      return convertToJson(unconvertedData);
    default:
      return convertToMarkdown(unconvertedData);
  }
}

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

function convertToJson(condensedRecipe) {
  console.log("converting to json");
  // given a struct with:
  // @param condensedRecipe
  // - name
  // - description
  // - ingredients
  // - instructions
  // returns Json
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

function stringToFilename(string) {
  // converts string to be filename friendly.
  //  this means removeing escape characters and whitespaces
  // var regexDisallowedCharacters = /\\'/
  convertedString = string.replaceAll(" ", "-");
  return convertedString;
}

// downloading recipe to file
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
