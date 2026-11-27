import { Link } from 'react-router-dom';

const SAFE_EXTERNAL = /^(https?:\/\/|mailto:|tel:)/i;
const LINK_CLASS = 'text-indigo-600 underline underline-offset-2 hover:text-indigo-800';

export const fill = (text, vars = {}) =>
  String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );

export const renderInline = (text) => {
  const source = String(text ?? '');
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  const nodes = [];
  let last = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > last) nodes.push(source.slice(last, match.index));
    const key = `n${nodes.length}`;
    if (match[3] !== undefined) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else {
      const label = match[1];
      const href = match[2];
      if (href.startsWith('/') && !href.startsWith('//')) {
        nodes.push(<Link key={key} to={href} className={LINK_CLASS}>{label}</Link>);
      } else if (SAFE_EXTERNAL.test(href)) {
        const web = /^https?:/i.test(href);
        nodes.push(
          <a key={key} href={href} className={LINK_CLASS} {...(web ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {label}
          </a>
        );
      } else {
        nodes.push(label);
      }
    }
    last = pattern.lastIndex;
  }

  if (last < source.length) nodes.push(source.slice(last));
  return nodes;
};
