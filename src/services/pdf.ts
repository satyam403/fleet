import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Inspection, WorkOrder } from '../types';

export async function generateInspectionPDF(inspection: Inspection): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const lineHeight = 20;

  // Title
  page.drawText('DOT INSPECTION REPORT', {
    x: leftMargin,
    y: yPosition,
    size: 20,
    font: fontBold,
    color: rgb(0, 0.2, 0.5),
  });

  yPosition -= 40;

  // Company Info
  page.drawText('FleetOps - Fleet Management System', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 30;

  // Inspection Details
  const details = [
    `Inspection ID: ${inspection.id}`,
    `Date: ${new Date(inspection.date).toLocaleDateString()}`,
    `Trailer: ${inspection.trailerNumber}`,
    `Technician: ${inspection.technicianName}`,
  ];

  details.forEach(detail => {
    page.drawText(detail, {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: font,
    });
    yPosition -= lineHeight;
  });

  yPosition -= 20;

  // Checklist Header
  page.drawText('INSPECTION CHECKLIST', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: fontBold,
    color: rgb(0, 0.2, 0.5),
  });

  yPosition -= 25;

  // Checklist Items
  inspection.checklist.forEach(item => {
    if (yPosition < 100) {
      // Add new page if needed
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getSize().height - 50;
    }

    const statusColor = 
      item.status === 'pass' ? rgb(0, 0.6, 0) :
      item.status === 'fail' ? rgb(0.8, 0, 0) :
      rgb(0.5, 0.5, 0.5);

    page.drawText(`• ${item.label}`, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: fontBold,
    });

    page.drawText(`Status: ${item.status.toUpperCase()}`, {
      x: leftMargin + 250,
      y: yPosition,
      size: 10,
      font: font,
      color: statusColor,
    });

    yPosition -= 15;

    if (item.comments) {
      page.drawText(`  Notes: ${item.comments}`, {
        x: leftMargin + 10,
        y: yPosition,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
      yPosition -= 20;
    } else {
      yPosition -= 10;
    }
  });

  yPosition -= 30;

  // Signature Section
  if (yPosition < 150) {
    const newPage = pdfDoc.addPage([612, 792]);
    yPosition = newPage.getSize().height - 50;
  }

  page.drawText('SIGNATURE', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: fontBold,
  });

  yPosition -= 30;

  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: leftMargin + 200, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText('Technician Signature', {
    x: leftMargin,
    y: yPosition - 15,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export async function generateWorkOrderPDF(workOrder: WorkOrder): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  let yPosition = height - 50;
  const leftMargin = 50;
  const lineHeight = 20;

  // Title
  page.drawText('WORK ORDER', {
    x: leftMargin,
    y: yPosition,
    size: 20,
    font: fontBold,
    color: rgb(0, 0.2, 0.5),
  });

  yPosition -= 40;

  // Company Info
  page.drawText('FleetOps - Fleet Management System', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });

  yPosition -= 30;

  // Work Order Details
  const details = [
    `Work Order #: ${workOrder.woNumber}`,
    `Date: ${new Date(workOrder.date).toLocaleDateString()}`,
    `Trailer: ${workOrder.trailerNumber}`,
    `Technician: ${workOrder.technicianName}`,
    `Status: ${workOrder.status.toUpperCase()}`,
  ];

  details.forEach(detail => {
    page.drawText(detail, {
      x: leftMargin,
      y: yPosition,
      size: 11,
      font: font,
    });
    yPosition -= lineHeight;
  });

  yPosition -= 20;

  // Issue Notes
  page.drawText('ISSUE DESCRIPTION', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: fontBold,
    color: rgb(0, 0.2, 0.5),
  });

  yPosition -= 25;

  const issueLines = workOrder.issueNotes.split('\n');
  issueLines.forEach(line => {
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getSize().height - 50;
    }
    
    page.drawText(line, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: font,
    });
    yPosition -= 15;
  });

  yPosition -= 20;

  // Inventory Items Used
  page.drawText('PARTS & MATERIALS USED', {
    x: leftMargin,
    y: yPosition,
    size: 14,
    font: fontBold,
    color: rgb(0, 0.2, 0.5),
  });

  yPosition -= 25;

  // Table Header
  page.drawText('Item Name', {
    x: leftMargin,
    y: yPosition,
    size: 10,
    font: fontBold,
  });

  page.drawText('Quantity', {
    x: leftMargin + 300,
    y: yPosition,
    size: 10,
    font: fontBold,
  });

  yPosition -= 20;

  // Table Rows
  workOrder.items.forEach(item => {
    if (yPosition < 100) {
      const newPage = pdfDoc.addPage([612, 792]);
      yPosition = newPage.getSize().height - 50;
    }

    page.drawText(item.itemName, {
      x: leftMargin,
      y: yPosition,
      size: 10,
      font: font,
    });

    page.drawText(item.quantity.toString(), {
      x: leftMargin + 300,
      y: yPosition,
      size: 10,
      font: font,
    });

    yPosition -= 18;
  });

  yPosition -= 30;

  // Signature Section
  if (yPosition < 150) {
    const newPage = pdfDoc.addPage([612, 792]);
    yPosition = newPage.getSize().height - 50;
  }

  page.drawText('SIGNATURE', {
    x: leftMargin,
    y: yPosition,
    size: 12,
    font: fontBold,
  });

  yPosition -= 30;

  page.drawLine({
    start: { x: leftMargin, y: yPosition },
    end: { x: leftMargin + 200, y: yPosition },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText('Technician Signature', {
    x: leftMargin,
    y: yPosition - 15,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  yPosition -= 40;

  page.drawLine({
    start: { x: leftMargin + 250, y: yPosition + 40 },
    end: { x: leftMargin + 450, y: yPosition + 40 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawText('Supervisor Signature', {
    x: leftMargin + 250,
    y: yPosition + 25,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
