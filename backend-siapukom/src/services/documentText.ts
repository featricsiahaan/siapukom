import { HttpError } from '../middleware/errorHandler';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function extractTextFromDocument(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  if (mimetype === PDF_MIME || filename.toLowerCase().endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (mimetype === DOCX_MIME || filename.toLowerCase().endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new HttpError(400, 'Format file tidak didukung. Unggah file .pdf atau .docx');
}
