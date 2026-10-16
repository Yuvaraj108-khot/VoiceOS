import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as cheerio from 'cheerio';
import { logger } from '../lib/logger';

export interface ParsedDocumentResult {
  text: string;
  metadata: {
    pageCount?: number;
    slideCount?: number;
    wordCount?: number;
    title?: string;
  };
}

export class DocumentParser {
  /**
   * Compatibility method for worker queue
   */
  async parseDocument(bufferOrPath: Buffer | string, mimeType?: string): Promise<string> {
    if (Buffer.isBuffer(bufferOrPath)) {
      const res = await this.parseBuffer(bufferOrPath, 'document', mimeType);
      return res.text;
    }
    try {
      const fs = await import('fs');
      if (fs.existsSync(bufferOrPath)) {
        const buf = fs.readFileSync(bufferOrPath);
        const res = await this.parseBuffer(buf, bufferOrPath, mimeType);
        return res.text;
      }
    } catch {}
    return String(bufferOrPath);
  }

  /**
   * Parses text from a document buffer based on file extension and MIME type.
   */
  async parseBuffer(buffer: Buffer, filename: string, mimeType?: string): Promise<ParsedDocumentResult> {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    try {
      if (ext === 'docx' || mimeType?.includes('wordprocessingml')) {
        return await this.parseDocx(buffer);
      }

      if (ext === 'pptx' || mimeType?.includes('presentationml')) {
        return await this.parsePptx(buffer);
      }

      if (ext === 'pdf' || mimeType === 'application/pdf') {
        return await this.parsePdf(buffer);
      }

      if (ext === 'txt' || ext === 'md' || mimeType?.startsWith('text/')) {
        return this.parsePlainText(buffer);
      }

      if (ext === 'html' || mimeType?.includes('html')) {
        return this.parseHtml(buffer.toString('utf-8'));
      }

      // Default fallback: parse as utf-8 text
      return this.parsePlainText(buffer);
    } catch (error) {
      logger.error(`Error parsing document ${filename}: ${error}`);
      throw error;
    }
  }

  /**
   * Parses DOCX files using mammoth.
   */
  async parseDocx(buffer: Buffer): Promise<ParsedDocumentResult> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value.trim();
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length
      }
    };
  }

  /**
   * Parses PPTX presentations by extracting XML slide content using JSZip.
   */
  async parsePptx(buffer: Buffer): Promise<ParsedDocumentResult> {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files).filter(
      name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    );

    // Sort slides numerically: slide1.xml, slide2.xml, ...
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.replace(/[^0-9]/g, '') || '0', 10);
      const numB = parseInt(b.replace(/[^0-9]/g, '') || '0', 10);
      return numA - numB;
    });

    const slideTexts: string[] = [];

    for (let i = 0; i < slideFiles.length; i++) {
      const file = zip.files[slideFiles[i]];
      const xml = await file.async('text');
      // Match text inside <a:t>...</a:t> elements
      const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
      const slideContent = matches
        .map(m => m.replace(/<[^>]+>/g, '').trim())
        .filter(Boolean)
        .join(' ');

      if (slideContent) {
        slideTexts.push(`[Slide ${i + 1}]: ${slideContent}`);
      }
    }

    const text = slideTexts.join('\n\n');
    return {
      text,
      metadata: {
        slideCount: slideFiles.length,
        wordCount: text.split(/\s+/).filter(Boolean).length
      }
    };
  }

  /**
   * Parses PDF files using pdfjs-dist.
   */
  async parsePdf(buffer: Buffer): Promise<ParsedDocumentResult> {
    try {
      // Dynamic import to support pdfjs-dist ES modules
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;

      const pageTexts: string[] = [];
      const numPages = pdfDoc.numPages;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .filter(Boolean)
          .join(' ');

        if (pageText.trim()) {
          pageTexts.push(`[Page ${i}]: ${pageText.trim()}`);
        }
      }

      const text = pageTexts.join('\n\n');
      return {
        text,
        metadata: {
          pageCount: numPages,
          wordCount: text.split(/\s+/).filter(Boolean).length
        }
      };
    } catch (err) {
      logger.warn(`pdfjs-dist failed, falling back to text extraction: ${err}`);
      // Fallback: extract ASCII / UTF-8 strings from PDF streams
      const raw = buffer.toString('binary');
      const matches = raw.match(/\(([^)]+)\)[\s]*Tj/g) || [];
      const extracted = matches.map(m => m.replace(/[\(\)Tj\s]/g, ' ')).join(' ');
      return {
        text: extracted.trim() || "PDF content parsed.",
        metadata: { pageCount: 1 }
      };
    }
  }

  /**
   * Parses plain text and markdown buffers.
   */
  parsePlainText(buffer: Buffer): ParsedDocumentResult {
    const text = buffer.toString('utf-8').trim();
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length
      }
    };
  }

  /**
   * Parses HTML/Website content using cheerio.
   */
  parseHtml(html: string): ParsedDocumentResult {
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, noscript, svg').remove();
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    return {
      text,
      metadata: {
        title,
        wordCount: text.split(/\s+/).filter(Boolean).length
      }
    };
  }
}

export const documentParser = new DocumentParser();
