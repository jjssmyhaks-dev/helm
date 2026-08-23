'use client';

import React from 'react';

interface Props {
  content: string;
  className?: string;
}

/**
 * Lightweight markdown renderer for chat messages.
 * Handles: bold, italic, code blocks, inline code, links, lists, headers.
 * No external dependencies — pure regex-based rendering.
 */
export function MarkdownRenderer({ content, className = '' }: Props) {
  const rendered = renderMarkdown(content);
  return (
    <div
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

function renderMarkdown(text: string): string {
  let html = text;

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHtml(code.trim());
    return `<div class="relative my-3 rounded-lg bg-dark-950 border border-dark-700 overflow-hidden">
      <div class="flex items-center justify-between px-3 py-1.5 bg-dark-800 border-b border-dark-700">
        <span class="text-[10px] text-dark-500 font-mono">${lang || 'code'}</span>
      </div>
      <pre class="p-3 overflow-x-auto text-sm"><code class="text-dark-200 font-mono">${escaped}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-dark-800 text-helm-300 text-sm font-mono">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-white mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-white mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-white mt-4 mb-2">$1</h1>');

  // Unordered lists
  html = html.replace(/^[*-] (.+)$/gm, '<li class="ml-4 mb-1">$1</li>');
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="list-disc list-inside mb-3 space-y-1">${match}</ul>`);

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 mb-1">$1</li>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-helm-400 hover:text-helm-300 underline">$1</a>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-4 border-dark-700" />');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="mb-3 leading-relaxed">');

  // Single newlines to <br>
  html = html.replace(/\n/g, '<br />');

  // Wrap in paragraph
  html = `<p class="mb-3 leading-relaxed">${html}</p>`;

  // Clean up empty paragraphs
  html = html.replace(/<p class="[^"]*"><\/p>/g, '');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
