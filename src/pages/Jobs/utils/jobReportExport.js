import { loadPdfExportLibs } from "../../../lib/vitePreloadErrorReload.util.js";

/**
 * Copy Mermaid shadow-root SVG into the PDF clone (html2canvas cannot see shadow DOM).
 * @param {HTMLElement} sourceElement
 * @param {HTMLElement} cloneElement
 */
function flattenShadowRootsForPdf(sourceElement, cloneElement) {
  const sourceNodes = [sourceElement, ...sourceElement.querySelectorAll("*")];
  const cloneNodes = [cloneElement, ...cloneElement.querySelectorAll("*")];

  for (let index = 0; index < sourceNodes.length; index += 1) {
    const source = sourceNodes[index];
    const clone = cloneNodes[index];
    if (!(source instanceof HTMLElement) || !(clone instanceof HTMLElement)) continue;
    if (!source.shadowRoot) continue;

    const chartRoot = source.shadowRoot.querySelector(".mermaid-chart-root");
    if (chartRoot) {
      clone.innerHTML = chartRoot.innerHTML;
    }
  }
}

/**
 * Export a rendered report DOM node to a multi-page A4 PDF.
 * @param {HTMLElement} sourceElement
 * @param {string} fileName
 */
export async function exportJobReportPdf(sourceElement, fileName) {
  if (!sourceElement) {
    throw new Error("Nothing to export.");
  }

  const [{ default: html2canvas }, { jsPDF }] = await loadPdfExportLibs();

  const captureRoot = document.createElement("div");
  captureRoot.setAttribute("data-job-report-pdf-capture", "true");
  captureRoot.className = "bg-background text-foreground";
  captureRoot.style.cssText =
    "position:fixed;left:-12000px;top:0;width:794px;padding:40px;box-sizing:border-box;";
  const clone = sourceElement.cloneNode(true);
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.width = "100%";
  flattenShadowRootsForPdf(sourceElement, clone);
  captureRoot.appendChild(clone);
  document.body.appendChild(captureRoot);

  try {
    const canvas = await html2canvas(captureRoot, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: captureRoot.offsetWidth,
      height: captureRoot.scrollHeight,
      windowWidth: captureRoot.offsetWidth,
      windowHeight: captureRoot.scrollHeight,
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const safeName = String(fileName || "automation-report")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName || "automation-report"}.pdf`);
  } finally {
    document.body.removeChild(captureRoot);
  }
}

/**
 * Build a download-safe PDF filename from report markdown and optional job label.
 * @param {string} markdown
 * @param {string} [jobLabel]
 */
export function jobReportPdfFileName(markdown, jobLabel) {
  const firstLine = String(markdown ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const titleMatch = firstLine?.match(/^#\s+(.+)$/);
  const fromTitle = titleMatch?.[1]?.replace(/[^\w.-]+/g, "_").slice(0, 80);
  const fromJob = String(jobLabel ?? "")
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 60);
  return fromTitle || fromJob || "automation-report";
}
