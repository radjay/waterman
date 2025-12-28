import { readFile } from "fs/promises";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export default async function ChangelogPage() {
  // Read the changelog file at request time
  const changelogPath = join(process.cwd(), "CHANGELOG.md");
  let markdown = "# Changelog\n\nUnable to load changelog.";
  
  try {
    markdown = await readFile(changelogPath, "utf8");
  } catch (error) {
    console.error("Error reading changelog:", error);
  }

  return (
    <MainLayout>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <h1 className="font-headline text-3xl font-bold text-ink mb-6 border-b-2 border-ink pb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <h2 className="font-headline text-2xl font-bold text-ink mt-8 mb-4" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <h3 className="font-headline text-xl font-bold text-ink mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <p className="font-body text-ink mb-4 leading-relaxed" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="font-body text-ink mb-4 ml-6 list-disc" {...props} />
              ),
              li: ({ node, ...props }) => (
                <li className="font-body text-ink mb-2" {...props} />
              ),
              strong: ({ node, ...props }) => (
                <strong className="font-bold text-ink" {...props} />
              ),
              hr: ({ node, ...props }) => (
                <hr className="border-ink/30 my-8" {...props} />
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
      <Footer mostRecentScrapeTimestamp={null} />
    </MainLayout>
  );
}

