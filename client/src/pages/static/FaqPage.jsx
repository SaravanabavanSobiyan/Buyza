import { contentText, plainText } from '../../components/content/contentText';
import useScrollToHash from '../../hooks/useScrollToHash';
import { FAQ } from '../../config/faq';
import { formatDayLong } from '../../utils/dates';
import Seo from '../../components/seo/Seo';

export default function FaqPage() {
  useScrollToHash();
  return (
    <>
      <Seo title={FAQ.title} description={plainText(FAQ.description)} path="/faq" />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold">{FAQ.title}</h1>
          <p className="mt-3 text-lg text-gray-600">{contentText(FAQ.intro)}</p>
          <p className="mt-2 text-sm text-gray-500">Last updated {formatDayLong(FAQ.updated)}</p>
        </header>
        <nav aria-label="FAQ topics" className="mb-10 flex flex-wrap gap-2">
          {FAQ.groups.map((group) => (
            <a key={group.id} href={`#${group.id}`} className="inline-flex min-h-[44px] items-center rounded-full border px-4 text-sm hover:bg-gray-50">{group.title}</a>
          ))}
        </nav>
        {FAQ.groups.map((group) => (
          <section key={group.id} id={group.id} aria-labelledby={`${group.id}-title`} className="mb-10 scroll-mt-24">
            <h2 id={`${group.id}-title`} className="mb-3 text-xl font-semibold">{group.title}</h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <details key={item.id} id={item.id} className="rounded-lg border bg-white scroll-mt-24">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                    <span>{plainText(item.q)}</span><span aria-hidden="true" className="text-gray-400">▾</span>
                  </summary>
                  <div className="space-y-3 px-4 pb-4 leading-7 text-gray-700">
                    {(Array.isArray(item.a) ? item.a : [item.a]).map((paragraph, index) => (
                      <p key={index}>{contentText(paragraph)}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
