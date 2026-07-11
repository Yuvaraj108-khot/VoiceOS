export class ChunkingEngine {
  /**
   * Splits a large document text into smaller chunks for vectorization.
   * Uses semantic boundaries (paragraphs, sentences) where possible.
   */
  chunkText(text: string, maxTokens: number = 512, overlapTokens: number = 50): string[] {
    // In production, use LangChain's RecursiveCharacterTextSplitter or similar logic.
    // For scaffolding, we split by paragraphs and group them.

    const paragraphs = text.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const p of paragraphs) {
      if (currentChunk.length + p.length > maxTokens * 4) { // Rough character estimate
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk += '\n\n' + p;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }
}

export const chunkingEngine = new ChunkingEngine();
