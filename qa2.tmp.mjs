import { readFileSync, writeFileSync } from "node:fs";
import PdfPrinter from "pdfmake/src/printer.js";
const dd = JSON.parse(readFileSync("/tmp/dd.json","utf8"), (k,v)=>v);
const fonts = { Roboto: {
  normal: "node_modules/pdfmake/fonts/Roboto/Roboto-Regular.ttf",
  bold: "node_modules/pdfmake/fonts/Roboto/Roboto-Medium.ttf",
  italics: "node_modules/pdfmake/fonts/Roboto/Roboto-Italic.ttf",
  bolditalics: "node_modules/pdfmake/fonts/Roboto/Roboto-MediumItalic.ttf",
}};
