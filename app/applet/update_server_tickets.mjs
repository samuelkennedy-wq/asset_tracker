import fs from 'fs';

let serverCode = fs.readFileSync('server.ts', 'utf8');

const helperFunc = `
function generateNextItTicketNo(existingTickets: any[]): string {
  let highestNum = 12345;
  for (const t of (existingTickets || [])) {
    const tNo = (t.ticket_no || '').trim().toUpperCase();
    const match = tNo.match(/^IT([0-9]{6})$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > highestNum) {
        highestNum = num;
      }
    }
  }
  const nextNum = highestNum + 1;
  return 'IT' + nextNum.toString().padStart(6, '0');
}
`;

if (!serverCode.includes('function generateNextItTicketNo')) {
  serverCode = helperFunc + '\n' + serverCode;
}

serverCode = serverCode.replace(
  /const finalTicketNo = userTicketNo \? userTicketNo : `TKT-\$\{ticketId\.toString\(\)\.padStart\(4, '0'\)\}`;/g,
  `const finalTicketNo = (userTicketNo && userTicketNo.trim() !== '') ? userTicketNo.trim().toUpperCase() : generateNextItTicketNo(db.movement_tickets);`
);

serverCode = serverCode.replace(
  /const ticketIdTag = ticket\.ticket_no \|\| `TKT-\$\{ticket\.id\.toString\(\)\.padStart\(4, '0'\)\}`;/g,
  `const ticketIdTag = ticket.ticket_no || ('IT' + (12345 + ticket.id).toString().padStart(6, '0'));`
);

serverCode = serverCode.replace(
  /const ticketIdentification = ticket\.ticket_no \|\| `TKT-\$\{ticket\.id\.toString\(\)\.padStart\(4, '0'\)\}`;/g,
  `const ticketIdentification = ticket.ticket_no || ('IT' + (12345 + ticket.id).toString().padStart(6, '0'));`
);

fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log('Successfully updated server.ts!');
