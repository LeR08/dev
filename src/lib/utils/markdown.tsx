import * as React from 'react';

/**
 * Rendu Markdown minimal, sans dépendance.
 *
 * Volontairement limité aux blocs utilisés par les leçons (titres, listes,
 * gras, italique, code, liens, images, citations). Le HTML brut n'est jamais
 * interprété : le contenu vient de l'administration, mais rien ne justifie
 * d'ouvrir une porte XSS.
 */
export function Markdown({ content }: { content: string }) {
  const blocks = React.useMemo(() => parseBlocks(content), [content]);

  return (
    <div className="space-y-4 text-[0.9375rem] leading-relaxed">
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}

type ParsedBlock =
  | { kind: 'heading'; level: 2 | 3 | 4; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'image'; alt: string; src: string }
  | { kind: 'divider' };

function parseBlocks(source: string): ParsedBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const buffer: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith('```')) {
        buffer.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: 'code', text: buffer.join('\n') });
      continue;
    }

    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push({ kind: 'divider' });
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (image) {
      blocks.push({ kind: 'image', alt: image[1], src: image[2] });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1].length as 2 | 3 | 4,
        text: heading[2],
      });
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const buffer: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        buffer.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ kind: 'quote', text: buffer.join(' ') });
      continue;
    }

    const bullet = /^[-*]\s+/;
    const numbered = /^\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      const items: string[] = [];
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(lines[index].replace(pattern, ''));
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    const buffer: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== '' &&
      !lines[index].startsWith('#') &&
      !lines[index].startsWith('> ') &&
      !lines[index].startsWith('```') &&
      !bullet.test(lines[index]) &&
      !numbered.test(lines[index])
    ) {
      buffer.push(lines[index]);
      index += 1;
    }
    blocks.push({ kind: 'paragraph', text: buffer.join(' ') });
  }

  return blocks;
}

function Block({ block }: { block: ParsedBlock }) {
  switch (block.kind) {
    case 'heading': {
      const className =
        block.level === 2
          ? 'text-xl font-semibold tracking-tight mt-7'
          : block.level === 3
            ? 'text-lg font-semibold mt-6'
            : 'text-base font-semibold mt-5';
      const Tag = `h${block.level}` as 'h2' | 'h3' | 'h4';
      return <Tag className={className}>{inline(block.text)}</Tag>;
    }
    case 'paragraph':
      return <p>{inline(block.text)}</p>;
    case 'list':
      return block.ordered ? (
        <ol className="ml-5 list-decimal space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul className="ml-5 list-disc space-y-1.5">
          {block.items.map((item, i) => (
            <li key={i}>{inline(item)}</li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote className="border-primary text-muted-foreground border-l-2 pl-4 italic">
          {inline(block.text)}
        </blockquote>
      );
    case 'code':
      return (
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code className="font-mono">{block.text}</code>
        </pre>
      );
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={block.src} alt={block.alt} className="w-full rounded-xl border" loading="lazy" />;
    case 'divider':
      return <hr className="border-border" />;
  }
}

/** Gras, italique, code et liens. Tout le reste est rendu littéralement. */
function inline(text: string): React.ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.875em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link && /^(https?:|\/)/.test(link[2])) {
      return (
        <a
          key={index}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
