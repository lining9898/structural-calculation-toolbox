import './styles.css';
import { mountBeamFlexure } from './modules/beam-flexure/page';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  mountBeamFlexure(app);
}
