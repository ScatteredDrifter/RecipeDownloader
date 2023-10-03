// This file contains the primary code to extract
// and prepare a recipe for download

// global variables - unfortunately :/ 
var statusCodeField = null
var statusCodeText = "statuscode:"
var debugField = null
var currentTab = null


// initial setup
document.addEventListener("DOMContentLoaded",initializeScript)


// function setting up environment for downloading
function initializeScript(){

    console.log("initialized script")
    var downloadButton = document.getElementById("downloadRecipe");
    statusCodeField = document.getElementById("statuscode");
    debugField = document.getElementById("debug");

    
    downloadButton.addEventListener("click",setupDownload);
    
    


}

function updateStatusCodeField(message){
    statusCodeField.innerHTML = statusCodeText + message
}
function writeDebug(message){
    debugField.innerHTML = message
    debugField.style="display:none"
}

// function gathers the first tab from a list 
// of tabs 
// sets this tabs as "currentTab"
async function gatherActiveTab() {
    activeTab = await browser.tabs.query({currentWindow:true, active:true,}).then( (result) => { 
        // success
            let tab = result[0]
            currentTab = tab
            updateStatusCodeField(currentTab.id)
        },
        // fails
        console.error)
}

function gatherUserSelection(){
    // function to select inputs from user 
    var filePrefix = document.getElementById("filePrefix").value;
    var selectedFileType = document.querySelector('input[name="filetype"]:checked').value;

    var gatheredInput = {
        filePrefix: filePrefix,
        fileType:selectedFileType,
    }
    return gatheredInput
}

async function setupDownload() {
    updateStatusCodeField("button clicked");
    // detecting active Tab
    var userInput =gatherUserSelection();
    await gatherActiveTab().then( () => {


    })
    // writeDebug(currentTab.id);

    // sending 
    try {
        await browser.scripting.executeScript({
            target:{
                tabId: currentTab.id,
            },
            files: ["/javascript/contentScript_nutritionfacts.js"],
        }).then( () => { 

            // sending acquired parameters to **content script**
            const parameter = browser.tabs.sendMessage(
                currentTab.id,
                userInput
            )

        })
    } catch (err) { 
        updateStatusCodeField(`failed to execute script ${err}`)
    }

    
    
}