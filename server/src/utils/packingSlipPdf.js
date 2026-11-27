import PDFDocument from "pdfkit";

const money = (minorUnits) =>
  `Rs. ${(Number(minorUnits || 0) / 100).toFixed(2)}`;

export const streamPackingSlip = (order, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="packing-slip-${order.orderNumber}.pdf"`
  );
  doc.pipe(res);

  doc.fontSize(20).text(process.env.STORE_NAME || "Buyza");
  doc.fontSize(10).fillColor("#666").text("PACKING SLIP", { align: "right" }).fillColor("#000");
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(16).text(order.orderNumber);
  doc.font("Helvetica").fontSize(10);
  doc.text(`Placed: ${order.createdAt.toISOString().slice(0, 10)}`);
  doc.text(`Delivery method: ${order.shippingMethod?.name || "-"}`);
  doc.moveDown();

  const address = order.shippingAddress || {};
  doc.font("Helvetica-Bold").fontSize(10).text("SHIP TO");
  doc.font("Helvetica").fontSize(12);
  doc.text(address.fullName);
  doc.text(address.line1 + (address.line2 ? `, ${address.line2}` : ""));
  doc.text(`${address.city}, ${address.province} ${address.postalCode}`);
  doc.font("Helvetica-Bold").text(`Phone: ${address.phone}`);
  doc.font("Helvetica");
  doc.moveDown();

  if (order.payment?.method === "cod" && order.payment?.status !== "paid") {
    doc.font("Helvetica-Bold").fontSize(12).text(`CASH ON DELIVERY: collect ${money(order.total)}`);
    doc.font("Helvetica").fontSize(10);
    doc.moveDown();
  }

  const x = { box: 50, name: 78, qty: 480 };
  let y = doc.y + 4;
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Item", x.name, y).text("Qty", x.qty, y);
  y += 18;
  doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#cccccc").stroke();
  doc.font("Helvetica");

  for (const item of order.items) {
    if (y > 730) {
      doc.addPage();
      y = 50;
    }
    const label = item.variantSku ? `${item.name} (${item.variantSku})` : item.name;
    doc.rect(x.box, y, 12, 12).strokeColor("#000000").stroke();
    doc.fontSize(11).text(label, x.name, y, { width: 380 });
    doc.text(String(item.quantity), x.qty, y);
    y = Math.max(doc.y, y + 16) + 8;
  }

  y += 24;
  if (y > 740) {
    doc.addPage();
    y = 50;
  }
  doc.fontSize(10).text("Packed by: ____________________", 50, y);
  doc.text("Checked by: ____________________", 300, y);
  doc.end();
};
