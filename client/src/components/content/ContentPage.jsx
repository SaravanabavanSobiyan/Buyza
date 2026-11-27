import { Link } from 'react-router-dom';
import { contentText, plainText } from './contentText';
import useScrollToHash from '../../hooks/useScrollToHash';
import Seo from '../seo/Seo';
import { formatDayLong } from '../../utils/dates';

function Block({ block }) {
  switch (block.type) {
    case 'h3':
      return <h3 className="mb-2 mt-6 font-semibold">{contentText(block.text)}</h3>;
    case 'list': {
      const List = block.ordered ? 'ol' : 'ul';
      return <List className={`mb-4 space-y-2 pl-6 leading-7 text-gray-700 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>{block.items.map((item, i) => <li key={i}>{contentText(item)}</li>)}</List>;
    }
    case 'note':
      return <div role="note" className="mb-4 rounded-lg border-l-4 border-indigo-500 bg-indigo-50 p-4 text-sm leading-6 text-gray-800">{contentText(block.text)}</div>;
    case 'table':
      return <div className="mb-4 overflow-x-auto rounded-lg border"><table className="w-full min-w-[520px] text-left text-sm"><caption className="sr-only">{block.caption}</caption><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr>{block.headers.map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{block.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c} className={`px-4 py-3 ${c === 0 ? 'font-medium' : 'text-gray-700'}`}>{plainText(cell)}</td>)}</tr>)}</tbody></table></div>;
    default:
      return <p className="mb-4 leading-7 text-gray-700">{contentText(block.text)}</p>;
  }
}

export default function ContentPage({ page }) {
  useScrollToHash();
  const showToc = page.toc && page.sections.length >= 4;
  return (
    <>
      <Seo title={plainText(page.title)} description={plainText(page.description)} path={page.path} />
      <article className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">{plainText(page.title)}</h1>
          {page.intro && <p className="mt-3 text-lg text-gray-600">{contentText(page.intro)}</p>}
          <p className="mt-2 text-sm text-gray-500">Last updated {formatDayLong(page.updated)}</p>
        </header>
        {showToc && (
          <nav aria-label="On this page" className="mb-10 rounded-xl border bg-gray-50 p-5">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">On this page</p>
            <ol className="space-y-1 text-sm">
              {page.sections.map((section) => (
                <li key={section.id}><a href={`#${section.id}`} className="inline-block py-1 text-indigo-600 hover:underline">{section.heading}</a></li>
              ))}
            </ol>
          </nav>
        )}
        {page.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="mb-10 scroll-mt-24">
            <h2 id={`${section.id}-title`} className="mb-3 text-xl font-semibold">{section.heading}</h2>
            {section.blocks.map((block, index) => <Block key={index} block={block} />)}
          </section>
        ))}
        <p className="border-t pt-6 text-sm text-gray-600">
          Still have a question? <Link to="/contact" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">Contact us</Link>.
        </p>
      </article>
    </>
  );
}
