import { Request, Response } from 'express';
import { loadDb } from './database';

export function handleChatbotQuery(req: Request, res: Response): void {
  try {
    const { query } = req.body || {};
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'Query prompt is required' });
      return;
    }
    const rawQ = query.trim();
    const qLower = rawQ.toLowerCase();
    const db = loadDb();

    // 1. Check if user is asking for general system statistics or overview
    const isStatsQuery = 
      qLower.includes('how many') || 
      qLower.includes('summary') || 
      qLower.includes('total tickets') || 
      qLower.includes('total assets') ||
      qLower.includes('status overview') ||
      qLower.includes('inventory count');

    if (isStatsQuery) {
      const totalA = db.assets.length;
      const totalT = db.movement_tickets.length;
      const pendingT = db.movement_tickets.filter(t => t.status === 'PENDING').length;
      const approvedT = db.movement_tickets.filter(t => t.status === 'APPROVED').length;
      const floor7Count = db.assets.filter(a => (a.current_location || '').includes('FLOOR_7')).length;
      const floor3Count = db.assets.filter(a => (a.current_location || '').includes('FLOOR_3')).length;
      const floor2Count = db.assets.filter(a => (a.current_location || '').includes('FLOOR_2')).length;
      const itStockCount = db.assets.filter(a => (a.current_location || '').includes('IT_ROOM') || (a.current_location || '').includes('STOCK')).length;

      const lines = [
        '📊 **[24]7.ai Asset & Movement Overview:**',
        `• **Total Hardware Assets Registered:** ${totalA}`,
        `• **Movement Tickets Total:** ${totalT} (${pendingT} Pending Manager Review, ${approvedT} Approved)`,
        `• **Floor 7 Deployed Systems:** ${floor7Count}`,
        `• **Floor 3 Deployed Systems:** ${floor3Count}`,
        `• **Floor 2 Deployed Systems:** ${floor2Count}`,
        `• **Assets in IT Custody / Stock Room:** ${itStockCount}`
      ];

      res.json({
        query: rawQ,
        type: 'stats',
        answer: lines.join('\n'),
        stats: { totalA, totalT, pendingT, approvedT }
      });
      return;
    }

    // 2. Search for exact or partial serial numbers and barcodes
    const cleanTokens = qLower
      .replace(/[^a-z0-9\/\-_]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3);

    const matchedAssets = db.assets.filter(a => {
      const sn = (a.serial_number || '').toLowerCase();
      const bc = (a.barcode || '').toLowerCase();
      const cleanSn = sn.replace(/^(s\/n|cpu|mon|kb|ms)-/i, '');

      if (sn && qLower.includes(sn)) return true;
      if (bc && qLower.includes(bc)) return true;
      if (cleanSn.length >= 4 && qLower.includes(cleanSn)) return true;

      for (const tok of cleanTokens) {
        if (sn.includes(tok) || bc.includes(tok)) return true;
      }
      return false;
    });

    if (matchedAssets.length > 0) {
      const a = matchedAssets[0];
      // Associated movement tickets
      const aTickets = db.movement_tickets.filter(t => 
        (t.asset_serial_number || '').toUpperCase().includes(a.serial_number.toUpperCase()) ||
        (t.asset_barcode || '').toUpperCase().includes(a.barcode.toUpperCase())
      );
      const latestTicket = aTickets[aTickets.length - 1];

      const lines = [
        `📍 **Asset Location & Details for \`${a.serial_number}\`:**`,
        `• **Hardware Model:** ${a.model} (${a.asset_type || 'CPU'})`,
        `• **Current Floor / Location:** **${a.current_location.replace('_', ' ')}**`,
        `• **Allocated Switch Port:** \`${a.last_port_number || 'N/A'}\``,
        `• **Asset Tag / Barcode:** \`${a.barcode}\``,
        `• **Custody State:** ${a.status || 'AVAILABLE'}`
      ];

      if (latestTicket) {
        lines.push('');
        lines.push(`📋 **Latest Movement Ticket:** \`${latestTicket.ticket_no}\` (${latestTicket.status})`);
        lines.push(`• **Origin ➔ Destination:** ${latestTicket.origin_location} ➔ **${latestTicket.destination_floor}**`);
        lines.push(`• **Target Room / Bay:** ${latestTicket.target_room || 'General Floor'}`);
        lines.push(`• **Requestor:** ${latestTicket.requestor_name} (Engineer: ${latestTicket.engineer_name})`);
        lines.push(`• **Movement Purpose:** "${latestTicket.reason}"`);
        if (latestTicket.approved_by_name) {
          lines.push(`• **Approved By:** ${latestTicket.approved_by_name}`);
        } else {
          lines.push(`• **Approval:** Pending review`);
        }
      }

      res.json({
        query: rawQ,
        type: 'asset',
        answer: lines.join('\n'),
        asset: a,
        tickets: aTickets
      });
      return;
    }

    // 3. Search for movement tickets (e.g. IT012346, 0001, TKT...)
    const ticketMatch = rawQ.match(/(?:IT|TKT-|#TKT-)?([0-9]{4,6})/i);
    const matchedTickets = db.movement_tickets.filter(t => {
      const tNo = (t.ticket_no || '').toLowerCase();
      if (tNo && qLower.includes(tNo)) return true;
      if (tNo && qLower.includes(tNo.replace('#', ''))) return true;
      if (ticketMatch && tNo.includes(ticketMatch[1])) return true;
      for (const tok of cleanTokens) {
        if (tNo.includes(tok)) return true;
      }
      return false;
    });

    if (matchedTickets.length > 0) {
      const t = matchedTickets[0];
      const lines = [
        `📋 **Details for Movement Ticket \`${t.ticket_no}\`:**`,
        `• **Status:** **${t.status}**`,
        `• **Asset Serial(s):** \`${t.asset_serial_number}\``,
        `• **Asset Barcode(s):** \`${t.asset_barcode}\``,
        `• **From Location:** ${t.origin_location} ➔ **Destination Floor:** **${t.destination_floor}**`,
        `• **Port Allocation:** \`${t.port_number || 'N/A'}\` (Room: ${t.target_room || 'N/A'})`,
        `• **Requestor:** ${t.requestor_name} | **Field Engineer:** ${t.engineer_name}`,
        `• **Reason for Movement:** "${t.reason}"`
      ];

      if (t.approved_by_name) {
        lines.push(`• **Approved By:** ${t.approved_by_name} at ${new Date(t.approved_at || t.created_at).toLocaleTimeString()}`);
      } else {
        lines.push(`• **Approval Status:** Pending Manager Sign-off (Jyothi Potula / D. Manoharan)`);
      }

      if (t.gateway_clearance_status) {
        lines.push(`• **Platina Gate Check:** ${t.gateway_clearance_status}`);
      }

      res.json({
        query: rawQ,
        type: 'ticket',
        answer: lines.join('\n'),
        ticket: t
      });
      return;
    }

    // 4. Search for specific floors (e.g., "assets on floor 7", "what is on 3rd floor")
    const floorMatch = rawQ.match(/(?:floor|flr|level)\s*([0-9]|ground|basement|it[_\s-]?room)/i) || rawQ.match(/([0-9])(?:st|nd|rd|th)\s*floor/i);
    if (floorMatch) {
      const flrNum = floorMatch[1].toUpperCase();
      const flrKey = flrNum.includes('7') ? 'FLOOR_7' : flrNum.includes('3') ? 'FLOOR_3' : flrNum.includes('2') ? 'FLOOR_2' : flrNum;
      const flrAssets = db.assets.filter(a => (a.current_location || '').toUpperCase().includes(flrKey));

      if (flrAssets.length > 0) {
        const lines = [
          `🏢 **Assets Located on Floor ${floorMatch[1]} (${flrAssets.length} systems found):**`
        ];
        flrAssets.forEach(a => {
          lines.push(`• **\`${a.serial_number}\`** (${a.model}) — Port: \`${a.last_port_number || 'N/A'}\`, Status: ${a.status || 'DEPLOYED'}`);
        });

        res.json({
          query: rawQ,
          type: 'floor',
          answer: lines.join('\n'),
          assets: flrAssets
        });
        return;
      } else {
        res.json({
          query: rawQ,
          type: 'floor',
          answer: `No assets currently recorded on Floor ${floorMatch[1]} in the active database.`,
          assets: []
        });
        return;
      }
    }

    // 5. Fallback helpful guide
    const fallbackLines = [
      `I couldn't find an exact record for **"${rawQ}"**.`,
      '',
      '🤖 **How I can help you:**',
      '• **Find Serial Location:** *"Where is S/N-78F8A2 located?"* or *"Locate CPU S/N-L34D9W"*',
      '• **Check Ticket Status:** *"Status of ticket IT012346"* or *"Find IT012349"*',
      '• **Floor Assets:** *"Which assets are on floor 7?"* or *"Assets on floor 3"*',
      '• **Check Barcode:** *"Who has barcode CPU90003?"*',
      '• **System Summary:** *"Show total tickets and asset count"*'
    ];

    res.json({
      query: rawQ,
      type: 'help',
      answer: fallbackLines.join('\n')
    });
  } catch (err: any) {
    console.error('Chatbot error:', err);
    res.status(500).json({ error: 'Chatbot handler error: ' + (err?.message || 'Unknown error') });
  }
}
