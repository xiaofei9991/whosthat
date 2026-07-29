chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openOverlay') {
    // Forward to content script (overlay) in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'showOverlay' });
      }
    });
    sendResponse({ status: 'overlay message sent to active tab' });
  }
});
