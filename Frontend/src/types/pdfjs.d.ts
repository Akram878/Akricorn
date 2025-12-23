declare module '/pdfjs/pdf.mjs' {
  const value: any;
  export default value;
}

declare module 'pdfjs-dist/legacy/build/pdf' {
  import pdfjs from 'pdfjs-dist';
  export * from 'pdfjs-dist';
  export default pdfjs;
}
