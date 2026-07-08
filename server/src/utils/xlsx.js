import ExcelJS from 'exceljs';

// Attendee export (§3.2): ticket no, attendee, email, type, order no, amount,
// status, checked-in at. Amount is written in major units (paise/100).
export async function registrationsWorkbook({ event, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OBS Events';
  const ws = wb.addWorksheet('Registrations');
  ws.columns = [
    { header: 'Ticket No', key: 'ticketNumber', width: 18 },
    { header: 'Attendee', key: 'attendeeName', width: 24 },
    { header: 'Email', key: 'attendeeEmail', width: 30 },
    { header: 'Type', key: 'ticketType', width: 16 },
    { header: 'Order No', key: 'orderNumber', width: 18 },
    { header: `Amount (${event.currency})`, key: 'amount', width: 14 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Checked-in At', key: 'checkedInAt', width: 22 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) {
    ws.addRow({
      ...r,
      amount: (Number(r.amount) || 0) / 100,
      checkedInAt: r.checkedInAt ? new Date(r.checkedInAt).toLocaleString('en-IN') : '',
    });
  }
  return wb.xlsx.writeBuffer();
}
