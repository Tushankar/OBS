// Minimal markdown renderer shared by public CMS pages, news articles and the
// admin article editor's live preview. Because the editor previews with this
// exact component, what an author sees is what the public page renders.
//
// Supports: #/##/###/#### headings, horizontal rules (*** / --- / ___ on their
// own line), > blockquote, - / * bullets, **bold**, *italic*, [links](url),
// plain paragraphs and blank-line spacing. Deliberately dependency-free.

// Inline spans: bold, italic and links, parsed left-to-right (bold before
// italic so **x** isn't mistaken for *…*).
function inline(text, keyBase) {
  const nodes = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1]) {
      nodes.push(<strong key={`${keyBase}-b${i}`} className="font-semibold text-ink">{m[2]}</strong>);
    } else if (m[3]) {
      nodes.push(<em key={`${keyBase}-i${i}`} className="italic">{m[4]}</em>);
    } else if (m[5]) {
      const href = m[7];
      const external = /^https?:\/\//i.test(href);
      nodes.push(
        <a
          key={`${keyBase}-a${i}`}
          href={href}
          className="font-medium text-brand underline underline-offset-2 transition hover:text-brand-dark"
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
        >
          {m[6]}
        </a>
      );
    }
    last = re.lastIndex;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function Markdown({ content }) {
  if (!content) return null;
  const lines = String(content).split('\n');
  const out = [];
  let list = null; // accumulate consecutive bullets into one <ul>

  const flushList = (key) => {
    if (list?.length) out.push(<ul key={`ul-${key}`} className="my-3 list-disc space-y-1 pl-6 text-[14.5px] leading-relaxed text-ink-soft">{list}</ul>);
    list = null;
  };

  lines.forEach((line, idx) => {
    const t = line.trim();
    if (t.startsWith('- ') || t.startsWith('* ')) {
      (list = list || []).push(<li key={idx}>{inline(t.slice(2), idx)}</li>);
      return;
    }
    flushList(idx);
    if (/^(\*\*\*+|---+|___+)$/.test(t)) out.push(<hr key={idx} className="my-6 border-t border-line" />);
    else if (t.startsWith('#### ')) out.push(<h4 key={idx} className="mb-1.5 mt-4 text-base font-bold text-ink">{inline(t.slice(5), idx)}</h4>);
    else if (t.startsWith('### ')) out.push(<h3 key={idx} className="mb-2 mt-5 text-lg font-bold text-ink">{inline(t.slice(4), idx)}</h3>);
    else if (t.startsWith('## ')) out.push(<h2 key={idx} className="mb-2.5 mt-6 text-xl font-bold text-ink">{inline(t.slice(3), idx)}</h2>);
    else if (t.startsWith('# ')) out.push(<h1 key={idx} className="mb-3 mt-6 text-2xl font-black text-ink">{inline(t.slice(2), idx)}</h1>);
    else if (t.startsWith('> ')) out.push(<blockquote key={idx} className="my-4 rounded-r border-l-4 border-brand bg-brand-soft p-4 italic text-ink-soft">{inline(t.slice(2), idx)}</blockquote>);
    else if (t === '') out.push(<div key={idx} className="h-3" />);
    else out.push(<p key={idx} className="my-2.5 text-[14.5px] leading-relaxed text-ink-soft">{inline(line, idx)}</p>);
  });
  flushList('end');
  return <div>{out}</div>;
}
