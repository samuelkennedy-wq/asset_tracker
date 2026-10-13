import fs from 'fs';

let gateCode = fs.readFileSync('src/components/ScannerGate.tsx', 'utf8');
gateCode = gateCode.replaceAll("'TKT-0001'", "'IT012346'");
gateCode = gateCode.replaceAll("'TKT-0002'", "'IT012347'");
gateCode = gateCode.replace(
  'placeholder="e.g. Ticket Number (TKT-0001, RET-2026-0001) or Engineer Emp ID (01099318)"',
  'placeholder="e.g. Ticket Number (IT012346, IT012347) or Engineer Emp ID (01099318)"'
);
fs.writeFileSync('src/components/ScannerGate.tsx', gateCode, 'utf8');

let mgrCode = fs.readFileSync('src/components/ApprovalManagerDesk.tsx', 'utf8');
mgrCode = mgrCode.replace(
  'placeholder="e.g. TKT-0001 (Ticket Number is official ID)"',
  'placeholder="e.g. IT012346 (Ticket Number is official ID)"'
);
fs.writeFileSync('src/components/ApprovalManagerDesk.tsx', mgrCode, 'utf8');

let chatCode = fs.readFileSync('src/components/ChatbotAssistant.tsx', 'utf8');
chatCode = chatCode.replaceAll('TKT-0001', 'IT012346');
fs.writeFileSync('src/components/ChatbotAssistant.tsx', chatCode, 'utf8');

let srvChatCode = fs.readFileSync('server/chatbot.ts', 'utf8');
srvChatCode = srvChatCode.replaceAll('TKT-0001', 'IT012346');
srvChatCode = srvChatCode.replaceAll('TKT-0004', 'IT012349');
// Update regex in chatbot to also match IT###### (e.g. IT012346)
srvChatCode = srvChatCode.replace(
  'const ticketMatch = rawQ.match(/(?:TKT-|#TKT-)?([0-9]{1,5})/i);',
  'const ticketMatch = rawQ.match(/(?:IT|TKT-|#TKT-)?([0-9]{4,6})/i);'
);
fs.writeFileSync('server/chatbot.ts', srvChatCode, 'utf8');

console.log('Successfully updated all components with IT012346 6-digit pattern!');
