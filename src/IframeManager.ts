export default class IframeManager {
  constructor() {
    this.initialize();
  }

  initialize() {
    try {
      // Calculate the depth of this frame
      const frameDepth = this.calculateFrameDepth();

      // Register this iframe with the background script
      chrome.runtime.sendMessage(
        {
          type: "REGISTER_FRAME_URL",
          frameDepth,
        },
        (response) => {
          if (response && response.success) {
            console.log(`Frame registered successfully. Depth: ${frameDepth}`);
          }
        },
      );
    } catch (error) {
      console.error("Error during initialization:", error);
    }
  }

  calculateFrameDepth() {
    // Count the number of parents to determine the depth
    let currentWindow: Window = window;
    let depth = 0;

    try {
      while (currentWindow !== window.top) {
        depth++;
        currentWindow = currentWindow.parent;
      }
    } catch (e) {
      // An error can occur if the parent window is from a different origin
      // In this case, we stop the depth calculation
      console.warn(
        "Cross-origin security error encountered. Stopping depth calculation.",
      );
    }

    return depth;
  }

  static getFullTree() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          type: "GET_IFRAME_TREE",
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response.tree);
          }
        },
      );
    });
  }

  static async displayVisualTree() {
    try {
      const tree = await this.getFullTree();
      if (!tree) {
        console.log("No iframes detected");
        return;
      }

      type Result = {
        domain: string;
        path: string;
        children?: Array<Result | null>;
      };

      // recursive function to simplify the tree
      const simplifyTree = (node: any) => {
        if (!node) return null;

        // Extract just the domain name from the URL
        const url = new URL(node.url);
        const domain = url.hostname;
        const path = url.pathname;

        const result: Result = {
          domain,
          path,
        };

        if (node.children && node.children.length > 0) {
          result.children = node.children.map(simplifyTree);
        }

        return result;
      };

      let visualTree;
      if (Array.isArray(tree)) {
        visualTree = tree.map(simplifyTree);
      } else {
        visualTree = simplifyTree(tree);
      }

      console.log("🌳 Arborescence des iframes:");
      console.log(JSON.stringify(visualTree, null, 2));

      const logTreeNode = (node: any, level = 0) => {
        if (!node) return;

        const indent = "  ".repeat(level);
        const domain = node.domain || new URL(node.url).hostname;
        const path = node.path || new URL(node.url).pathname;

        console.groupCollapsed(`${indent}📄 ${domain}${path}`);

        if (node.children && node.children.length > 0) {
          node.children.forEach((child: any) => logTreeNode(child, level + 1));
        }

        console.groupEnd();
      };

      console.log("\n🌲 Vue hiérarchique:");
      if (Array.isArray(tree)) {
        tree.forEach((node) => logTreeNode(node));
      } else {
        logTreeNode(tree);
      }
    } catch (error) {
      console.error("Erreur lors de l'affichage de l'arbre:", error);
    }
  }
}
