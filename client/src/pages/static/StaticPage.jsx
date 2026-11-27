import ContentPage from '../../components/content/ContentPage';
import NotFound from '../../components/common/NotFound';
import { PAGES } from '../../config/pages';

export default function StaticPage({ pageKey }) {
  if (!Object.prototype.hasOwnProperty.call(PAGES, pageKey)) return <NotFound />;
  return <ContentPage page={PAGES[pageKey]} />;
}
