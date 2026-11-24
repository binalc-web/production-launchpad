import { loadPdfExportLibs } from "@/lib/vitePreloadErrorReload.util.js";
import { downloadBlob } from "@/pages/Project/PrdWorkspace/prdExport";

export function exportPresentationHtml(presentation, fileName) {
  const safeName =
    fileName ||
    `${(presentation?.name || "presentation").replace(/[^\w.-]+/g, "_")}.html`;
  downloadBlob(
    new Blob([presentation.html || ""], { type: "text/html;charset=utf-8" }),
    safeName.endsWith(".html") ? safeName : `${safeName}.html`,
  );
}

function parseSlidesFromHtml(html) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  return [...doc.querySelectorAll("section.slide, .slide")];
}

function slideTitle(slideEl) {
  const h = slideEl.querySelector("h1, h2, .slide-header h1, .slide-header h2");
  return h?.textContent?.trim() || "";
}

function slideBodyText(slideEl) {
  const body = slideEl.querySelector(".slide-body") || slideEl;
  return body.innerText?.trim() || "";
}

function waitForIframe(iframe) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Presentation preview timed out")),
      15000,
    );
    iframe.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    iframe.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Failed to load presentation for export"));
    };
  });
}

export async function exportPresentationPdf(presentation) {
  const [{ default: html2canvas }, { jsPDF }] = await loadPdfExportLibs();
  const html = presentation?.html || "";
  const parsedSlides = parseSlidesFromHtml(html);
  if (!parsedSlides.length) throw new Error("No slides to export");

  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-same-origin");
  iframe.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1280px;height:720px;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  try {
    iframe.srcdoc = html;
    await waitForIframe(iframe);
    await new Promise((resolve) => window.setTimeout(resolve, 150));

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error("Failed to load presentation for export");

    const slides = [...doc.querySelectorAll("section.slide, .slide")];
    if (!slides.length) throw new Error("No slides to export");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [1280, 720],
    });

    for (let i = 0; i < slides.length; i += 1) {
      const slide = slides[i];
      slide.style.width = "1280px";
      slide.style.height = "720px";
      slide.style.minHeight = "720px";
      slide.style.aspectRatio = "auto";
      slide.style.margin = "0";
      slide.style.boxShadow = "none";

      const canvas = await html2canvas(slide, {
        window: win,
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 1280,
        height: 720,
      });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      if (i > 0) pdf.addPage([1280, 720], "landscape");
      pdf.addImage(img, "JPEG", 0, 0, 1280, 720);
    }

    pdf.save(
      `${(presentation.name || "presentation").replace(/[^\w.-]+/g, "_")}.pdf`,
    );
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function exportPresentationPptx(presentation) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const slides = parseSlidesFromHtml(presentation.html);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = presentation.name || "Kickoff Presentation";

  if (!slides.length) {
    const slide = pptx.addSlide();
    slide.addText(presentation.name || "Kickoff Presentation", {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 28,
      bold: true,
    });
  } else {
    for (const slideEl of slides) {
      const slide = pptx.addSlide();
      const title = slideTitle(slideEl);
      const body = slideBodyText(slideEl);
      if (title) {
        slide.addText(title, {
          x: 0.5,
          y: 0.4,
          w: 9,
          h: 0.8,
          fontSize: 24,
          bold: true,
        });
      }
      if (body) {
        slide.addText(body, {
          x: 0.5,
          y: title ? 1.4 : 0.6,
          w: 9,
          h: 4.5,
          fontSize: 14,
          valign: "top",
        });
      }
    }
  }

  await pptx.writeFile({
    fileName: `${(presentation.name || "presentation").replace(/[^\w.-]+/g, "_")}.pptx`,
  });
}

export const PRESENTATION_EXPORT_DESTINATIONS = [
  {
    id: "html",
    label: "HTML (.html)",
    export: ({ presentation }) => exportPresentationHtml(presentation),
  },
  {
    id: "pdf",
    label: "PDF (.pdf)",
    export: async ({ presentation }) => {
      await exportPresentationPdf(presentation);
    },
  },
  {
    id: "pptx",
    label: "PowerPoint (.pptx)",
    export: async ({ presentation }) => {
      await exportPresentationPptx(presentation);
    },
  },
];
