import IframeManager from "@/src/IframeManager";

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  main() {
    if (window.parent !== window) {
      console.log(`Initialisation du manager pour: ${window.location.href}`);
      new IframeManager();
    } else {
      console.log("Frame principale: récupération de l'arbre");
      new IframeManager();

      setInterval(() => {
        IframeManager.displayVisualTree();
      }, 2000);
    }
  },
});
