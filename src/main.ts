import './styles.css';
import { mountHome } from './home/page';
const app = document.querySelector<HTMLDivElement>('#app');
if (app) mountHome(app);
