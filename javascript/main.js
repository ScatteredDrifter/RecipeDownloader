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

    
    downloadButton.addEventListener("click",startScraping);
    
    


}

function updateStatusCodeField(message){
    statusCodeField.innerHTML = statusCodeText + message
}
function writeDebug(message){
    debugField.innerHTML = message
}

// function gathers the first tab from a list 
// of tabs 
// sets this tabs as "currentTab"
async function gatherActiveTab() {
    activeTab = await browser.tabs.query({currentWindow:true, active:true,}).then( (result) => { 
        // success
            let tab = result[0]
            currentTab = tab
        },
        // fails
        console.error)
}


async function startScraping() {
    updateStatusCodeField("button clicked");
    // detecting active Tab
    await gatherActiveTab()
    writeDebug(currentTab.id);

    //  executing script on given tab
    try {
        await browser.scripting.executeScript({
            target:{
                tabId: currentTab.id,
            },
            files: ["/javascript/contentScript_nutritionfacts.js"],
        });
    } catch (err) { 
        console.error(`failed to execute script ${err}`)
    }
    
}