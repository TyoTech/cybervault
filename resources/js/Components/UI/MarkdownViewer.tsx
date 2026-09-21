import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Tema code block: latar konsisten dengan CodeBlock (gelap netral),
 * bukan background terang default.
 */
const codeTheme: { [key: string]: React.CSSProperties } = {
    ...(vscDarkPlus as Record<string, React.CSSProperties>),
    'pre[class*="language-"]': {
        ...(vscDarkPlus as Record<string, React.CSSProperties>)['pre[class*="language-"]'],
        background: 'var(--cv-code-bg)',
        borderRadius: '0.375rem',
        border: '1px solid #26282e',
        margin: '0.75rem 0',
        padding: '0.875rem 1rem',
    },
    'code[class*="language-"]': {
        ...(vscDarkPlus as Record<string, React.CSSProperties>)['code[class*="language-"]'],
        background: 'var(--cv-code-bg)',
        textShadow: 'none',
        fontSize: '0.8125rem',
    },
};

export default function MarkdownViewer({ content }: { content: string }) {
    return (
        <div className="prose max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    img: ({ node, ...props }: any) => (
                        <img
                            {...props}
                            className="my-4 max-w-full rounded-lg border border-edge"
                            loading="lazy"
                        />
                    ),
                    a: ({ node, ...props }: any) => (
                        <a {...props} target="_blank" rel="noopener noreferrer" />
                    ),
                    code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <SyntaxHighlighter
                                style={codeTheme}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}