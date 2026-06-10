import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface BillPdfRow {
  date: string | null;
  docket_number: string;
  name: string;
  place: string;
  zone_name: string;
  weight: number;
  mode: string;
  amount: number;
  available: boolean;
  marked?: boolean;
  notes?: string;
}

export function exportBillingPdf(opts: {
  companyName: string;
  dateRange: string;
  rows: BillPdfRow[];
  totalShipments: number;
  totalWeight: number;
  totalAmount: number;
}) {
  const doc = new jsPDF();
  const navy: [number, number, number] = [23, 37, 84];

  doc.setFontSize(18);
  doc.setTextColor(...navy);
  doc.text("Courier Billing Summary", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Company: ${opts.companyName}`, 14, 27);
  doc.text(`Date range: ${opts.dateRange}`, 14, 33);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 39);

  autoTable(doc, {
    startY: 45,
    head: [["S.No", "Date", "Docket", "Name", "Place", "Zone", "Wt(kg)", "Mode", "Amount"]],
    body: opts.rows.map((r, i) => [
      String(i + 1),
      r.date ? new Date(r.date).toLocaleDateString() : "-",
      r.docket_number,
      r.name || "-",
      r.place || "-",
      r.zone_name,
      String(r.weight),
      r.mode,
      r.available ? r.amount.toFixed(2) : "N/A",
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: navy, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    foot: [
      [
        `Total: ${opts.totalShipments}`,
        "",
        "",
        "",
        "",
        "",
        `${opts.totalWeight.toFixed(2)} kg`,
        "",
        opts.totalAmount.toFixed(2),
      ],
    ],
    footStyles: { fillColor: navy, textColor: 255, fontStyle: "bold" },
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  doc.save(`billing-${opts.companyName}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
