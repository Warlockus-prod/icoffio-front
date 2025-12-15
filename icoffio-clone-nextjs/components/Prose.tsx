export function Prose({ html }: { html: string }) {
  return (
    <div
      className="prose prose-neutral max-w-none prose-img:rounded-xl 
                 prose-a:text-neutral-900 hover:prose-a:underline
                 dark:prose-invert
                 dark:prose-headings:text-white 
                 dark:prose-p:text-neutral-200
                 dark:prose-li:text-neutral-200
                 dark:prose-a:text-neutral-100
                 dark:prose-strong:text-neutral-100"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
