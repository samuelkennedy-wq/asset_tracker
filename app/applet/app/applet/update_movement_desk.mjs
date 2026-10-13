import fs from 'fs';

let deskCode = fs.readFileSync('src/components/MovementDesk.tsx', 'utf8');

const helperCode = `
function getNextItTicketNumber(existingTickets: MovementTicket[]): string {
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
  return 'IT' + (highestNum + 1).toString().padStart(6, '0');
}
`;

if (!deskCode.includes('function getNextItTicketNumber')) {
  deskCode = deskCode.replace('export default function MovementDesk', helperCode + '\nexport default function MovementDesk');
}

deskCode = deskCode.replace(
  "const [ticketNumber, setTicketNumber] = useState('TKT-2026-001');",
  "const [ticketNumber, setTicketNumber] = useState(() => getNextItTicketNumber(tickets));"
);

deskCode = deskCode.replace(
  'placeholder="E.G. TKT-2026-001"',
  'placeholder="E.G. IT012346"'
);

deskCode = deskCode.replace(
  'placeholder="e.g. TKT-0001"',
  'placeholder="e.g. IT012346"'
);

deskCode = deskCode.replace(
  "setTicketNumber('TKT-' + (Math.floor(1000 + Math.random() * 9000)));",
  "setTicketNumber(getNextItTicketNumber(tickets));"
);

fs.writeFileSync('src/components/MovementDesk.tsx', deskCode, 'utf8');
console.log('Successfully updated MovementDesk.tsx with IT012346 pattern!');
