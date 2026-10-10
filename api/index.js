import DOMMatrix from 'dommatrix';

// Polyfill browser globals required by pdfjs-dist in Node.js serverless environment
if (typeof globalThis.DOMMatrix === 'undefined') {
    globalThis.DOMMatrix = DOMMatrix;
}
if (typeof globalThis.Path2D === 'undefined') {
    globalThis.Path2D = class Path2D {};
}
if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = class ImageData {};
}

import app from '../app.js';

export default function handler(req, res) {
    return app(req, res);
}
