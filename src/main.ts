import "./styles.css";
import { mountHome } from "./home/page";
import { mountAAC } from "./modules/aac-wall-panel/page";
const app = document.querySelector<HTMLDivElement>("#app");
function render() {
  if (!app) return;
  app.onclick = null;
  if (location.hash === "#aac-wall-panel") mountAAC(app);
  else mountHome(app);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
render();
