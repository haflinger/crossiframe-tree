export type TreeNode = { url: string; depth: number; children: TreeNode[] };

export default class IframeTracker {
  iframeTree: Map<number, Map<string, TreeNode>>;

  frameRelationships: Map<number, Map<string, TreeNode>>;

  constructor() {
    this.iframeTree = new Map(); // tabId -> Map(url -> iframe data)
    this.frameRelationships = new Map(); // tabId -> Map(childUrl -> parentUrl)
    this.setupMessageListeners();
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const tabId = sender.tab?.id;
      const frameUrl = sender.url;

      if (!tabId || !frameUrl) {
        sendResponse({ success: false });
        return false;
      }

      switch (message.type) {
        case "REGISTER_FRAME_URL":
          // Register frame URL with an ID
          this.registerFrameUrl(tabId, frameUrl, message.frameDepth);
          sendResponse({ success: true });
          break;

        case "GET_IFRAME_TREE":
          // Build and return the iframe tree
          const tree = this.buildIframeTree(tabId);
          sendResponse({ tree });
          break;
      }
      return true; // Keep the connection open for asynchronous responses
    });

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.iframeTree.delete(tabId);
      this.frameRelationships.delete(tabId);
    });
  }

  registerFrameUrl(tabId: number, frameUrl: string, frameDepth: number) {
    // Initialize the data structures for this tabId if necessary
    if (!this.iframeTree.has(tabId)) {
      this.iframeTree.set(tabId, new Map());
    }

    // Register the frame
    const frameData = {
      url: frameUrl,
      depth: frameDepth,
      children: [],
    };

    this.iframeTree.get(tabId)?.set(frameUrl, frameData);

    console.log(
      `Registered frame: ${frameUrl}, depth: ${frameDepth}, tabId: ${tabId}`,
    );
  }

  buildIframeTree(tabId: number) {
    const frames = this.iframeTree.get(tabId);
    if (!frames || frames.size === 0) {
      return null;
    }

    // We order the frames by depth and build the tree
    const sortedFrames = Array.from(frames.entries()).sort(
      ([_, a], [__, b]) => a.depth - b.depth,
    );

    // The first frame is the main frame (depth 0)
    const rootFrames = sortedFrames.filter(([_, frame]) => frame.depth === 0);

    // If no root frames, return a flat list
    if (rootFrames.length === 0) {
      return Array.from(frames.entries()).map(([url, data]) => ({
        url,
        depth: data.depth,
      }));
    }

    // For each frame, we find its children
    for (const [_, frame] of sortedFrames) {
      // Childrens are frames with depth = parentDepth + 1
      const childFrames = sortedFrames.filter(
        ([_, childFrame]) => childFrame.depth === frame.depth + 1,
      );

      frame.children = childFrames.map(([childUrl, childData]) => ({
        url: childUrl,
        depth: childData.depth,
        children: childData.children,
      }));
    }

    // We return the root frames with their children
    return rootFrames.map(([url, data]) => ({
      url,
      depth: data.depth,
      children: data.children,
    }));
  }
}
