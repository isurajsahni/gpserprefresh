// Lightweight Slack-style message formatting — no external markdown dependency.
// Supports: **bold**, _italic_, ~~strike~~, `code`, ```code blocks```, links,
// bare URLs, bullet (- / *) and numbered (1.) lists, > blockquotes, and it keeps
// @mention / @all highlighting working inside all of the above.

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Inline token patterns, in priority order (earliest match in the string wins;
// ties break by this order). `mention` is appended dynamically when there are
// names to match.
function inlinePatterns(ctx) {
  const pats = [
    { type: 'code', re: /`([^`]+)`/ },
    { type: 'bold', re: /\*\*([\s\S]+?)\*\*/ },
    { type: 'strike', re: /~~([\s\S]+?)~~/ },
    { type: 'link', re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
    { type: 'url', re: /(https?:\/\/[^\s]+)/ },
    { type: 'italic', re: /_([^_]+?)_/ },
  ];
  if (ctx.names.length) {
    pats.push({ type: 'mention', re: new RegExp(`@(${ctx.names.map(escapeRegex).join('|')})`) });
  }
  return pats;
}

// Parse a single line/segment into an array of React nodes.
function inlineNodes(text, ctx, key) {
  const pats = inlinePatterns(ctx);
  const nodes = [];
  let rest = text;
  let n = 0;
  while (rest.length) {
    let best = null;
    for (const p of pats) {
      const m = p.re.exec(rest);
      if (m && (best === null || m.index < best.m.index)) best = { p, m };
      if (best && best.m.index === 0) break; // can't beat index 0
    }
    if (!best) { nodes.push(rest); break; }
    const { p, m } = best;
    if (m.index > 0) nodes.push(rest.slice(0, m.index));
    const k = `${key}-${n++}`;
    nodes.push(renderToken(p.type, m, ctx, k));
    rest = rest.slice(m.index + m[0].length);
  }
  return nodes;
}

function renderToken(type, m, ctx, key) {
  switch (type) {
    case 'code':
      return <code key={key} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">{m[1]}</code>;
    case 'bold':
      return <strong key={key} className="font-semibold">{inlineNodes(m[1], ctx, key)}</strong>;
    case 'strike':
      return <s key={key}>{inlineNodes(m[1], ctx, key)}</s>;
    case 'italic':
      return <em key={key}>{inlineNodes(m[1], ctx, key)}</em>;
    case 'link':
      return <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-brand-700 underline">{m[1]}</a>;
    case 'url':
      return <a key={key} href={m[1]} target="_blank" rel="noreferrer" className="text-brand-700 underline">{m[1]}</a>;
    case 'mention': {
      const mentioned = ctx.byName.get(m[1]);
      // @all/@everyone has no user record and targets everyone (including me).
      const isMe = mentioned ? String(mentioned._id) === String(ctx.meId) : true;
      return (
        <span key={key} className={`rounded px-0.5 font-semibold ${isMe ? 'bg-amber-100 text-amber-800' : 'text-brand-700'}`}>
          {m[0]}
        </span>
      );
    }
    default:
      return m[0];
  }
}

// Interleave <br/> between an array of per-line node arrays.
function joinWithBreaks(lineNodes, keyBase) {
  const out = [];
  lineNodes.forEach((ln, i) => {
    if (i > 0) out.push(<br key={`${keyBase}-br-${i}`} />);
    out.push(<span key={`${keyBase}-ln-${i}`}>{ln}</span>);
  });
  return out;
}

// Parse the whole message into block-level elements.
function blocks(text, ctx) {
  const lines = text.split('\n');
  const out = [];
  let para = [];
  const flushPara = () => {
    if (!para.length) return;
    const key = `p-${out.length}`;
    out.push(<p key={key} className="whitespace-pre-wrap break-words">{joinWithBreaks(para, key)}</p>);
    para = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ``` ... ```
    if (/^\s*```/.test(line)) {
      flushPara();
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // skip closing fence
      out.push(<pre key={`c-${out.length}`} className="overflow-x-auto rounded-lg bg-gray-100 p-3 font-mono text-xs text-gray-800">{buf.join('\n')}</pre>);
      continue;
    }

    // Bulleted list (- or * )
    if (/^\s*[-*]\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={`u-${out.length}`} className="list-disc space-y-0.5 pl-5">
          {items.map((it, j) => <li key={j}>{inlineNodes(it, ctx, `u-${out.length}-${j}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list (1. 2. ...)
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={`o-${out.length}`} className="list-decimal space-y-0.5 pl-5">
          {items.map((it, j) => <li key={j}>{inlineNodes(it, ctx, `o-${out.length}-${j}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Blockquote (> )
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(inlineNodes(lines[i].replace(/^\s*>\s?/, ''), ctx, `q-${out.length}-${buf.length}`));
        i++;
      }
      out.push(
        <blockquote key={`q-${out.length}`} className="border-l-2 border-gray-300 pl-3 text-gray-600">
          {joinWithBreaks(buf, `q-${out.length}`)}
        </blockquote>
      );
      continue;
    }

    // Plain line — buffer into the current paragraph.
    para.push(inlineNodes(line, ctx, `l-${i}`));
    i++;
  }
  flushPara();
  return out;
}

// Renders formatted message text, keeping @mention highlighting.
export function RichText({ text, mentions, mentionAll, meId }) {
  if (!text) return null;
  const list = (mentions || []).filter((m) => m?.name);
  const byName = new Map(list.map((m) => [m.name, m]));
  const names = list.map((m) => m.name);
  if (mentionAll) names.push('all', 'everyone');
  names.sort((a, b) => b.length - a.length);
  const ctx = { byName, names, meId };
  return <div className="space-y-1 text-sm text-gray-700">{blocks(text, ctx)}</div>;
}
