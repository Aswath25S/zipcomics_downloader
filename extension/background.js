chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  chrome.tabs.create({url: chrome.runtime.getURL(`manager.html?tab=${tab.id}`)});
});
