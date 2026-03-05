import { readFile } from "fs/promises";
import { join } from "path";
import ReactMarkdown from "react-markdown";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Divider } from "../../components/ui/Divider";

export const metadata = {
    title: 'Waterman - Changelog',
};

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
      <div className="py-8">
        <div className="prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => (
                <Heading level={1} className="mb-6 border-b-2 border-ink pb-2" {...props} />
              ),
              h2: ({ node, ...props }) => (
                <Heading level={2} className="mt-8 mb-4 text-2xl" {...props} />
              ),
              h3: ({ node, ...props }) => (
                <Heading level={3} className="mt-6 mb-3" {...props} />
              ),
              p: ({ node, ...props }) => (
                <Text className="mb-4 leading-relaxed" {...props} />
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
                <Divider className="my-8" {...props} />
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

