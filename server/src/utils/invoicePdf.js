import PDFDocument from "pdfkit";

const moneyFormatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
});
const money = (minorUnits) =>
  moneyFormatter.format((Number(minorUnits) || 0) / 100);

export function streamInvoice(order, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  );
  doc.pipe(res);

  doc.fontSize(20).text(process.env.STORE_NAME || "Buyza", { align: "left" });
  doc
    .fontSize(10)
    .fillColor("#666")
    .text("INVOICE", { align: "right" })
    .fillColor("#000");
  doc.moveDown();

  doc.fontSize(10);
  doc.text(`Order number: ${order.orderNumber}`);
  doc.text(`Date: ${order.createdAt.toISOString().slice(0, 10)}`);
  const paymentMethod =
    order.payment.method === "cod" ? "Cash on delivery" : order.payment.method;
  doc.text(`Payment: ${paymentMethod} (${order.payment.status})`);
  doc.moveDown();

  const address = order.shippingAddress;
  doc.font("Helvetica-Bold").text("Bill / ship to").font("Helvetica");
  doc.text(address.fullName);
  doc.text(address.line1 + (address.line2 ? `, ${address.line2}` : ""));
  doc.text(`${address.city}, ${address.province} ${address.postalCode}`);
  doc.text(`Phone: ${address.phone}`);
  doc.moveDown();

  const columns = { name: 50, quantity: 330, price: 380, total: 470 };
  let y = doc.y;
  doc.font("Helvetica-Bold");
  doc
    .text("Item", columns.name, y)
    .text("Qty", columns.quantity, y)
    .text("Price", columns.price, y)
    .text("Total", columns.total, y);
  doc.font("Helvetica");
  y += 18;
  doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#ccc").stroke();

  for (const item of order.items) {
    if (y > 740) {
      doc.addPage();
      y = 50;
    }
    const label = item.variantSku
      ? `${item.name} (${item.variantSku})`
      : item.name;
    doc.text(label, columns.name, y, { width: 270 });
    doc.text(String(item.quantity), columns.quantity, y);
    doc.text(money(item.unitPrice), columns.price, y);
    doc.text(money(item.lineTotal), columns.total, y);
    y = Math.max(doc.y, y + 16) + 4;
  }

  y += 10;
  doc.moveTo(300, y).lineTo(545, y).strokeColor("#ccc").stroke();
  y += 8;

  const row = (label, value, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
    doc.text(label, 300, y).text(value, columns.total, y);
    y += 16;
  };
  row("Subtotal", money(order.subtotal));
  if (order.discount > 0) row("Discount", `-${money(order.discount)}`);
  row(
    `Shipping (${order.shippingMethod.name})`,
    order.shipping === 0 ? "Free" : money(order.shipping)
  );
  row("Total", money(order.total), true);

  doc.end();
}
