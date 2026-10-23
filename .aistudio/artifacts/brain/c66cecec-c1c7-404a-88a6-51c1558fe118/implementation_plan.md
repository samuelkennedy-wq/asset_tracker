# Resolution Status Actions, Rejection Reason Dropdown & Manager Ticket/Serial Editing

Comprehensive architectural blueprint to position resolution status actions and dropdowns under Activity & Comments, enhance the Approval Manager rejection workflow with a categorized rejection reason modal dropdown, and provide manager-controlled unlocking and editing for ticket numbers and hardware serial numbers.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user-confirmed decisions govern the implementation:
> - **Resolution Status Actions & Dropdowns**: Position the resolution status buttons (`Open`, `Pending`, `Waiting for Reporter`, `Resolved`, `Reopened`) and a status transition dropdown directly under the **Activity & Comments** section. Each action actively updates ticket status in real-time and logs the transition into the comment stream.
> - **Approval Manager Rejection Workflow**: Approving or rejecting sets `approval_status` (and rejects ticket status). The rejection popup will feature a structured dropdown with standard enterprise IT rejection reasons plus custom remarks.
> - **Locked Ticket & Serial Numbers with Manager Edit Override**: Ticket numbers and hardware serials remain locked by default, while IT Managers possess dedicated authorization controls in the Approval Manager Desk to edit and update them safely.

---

## 1. Overview & Core Concept

- **What It Does**: Unifies resolution lifecycle tracking directly inside ticket activity streams, equips IT Managers with structured rejection reason selection, and secures ticket and hardware serial numbers behind manager-only edit permissions.
- **Target Audience / Persona**: IT Field Engineers (Basavaraj, Murugesh, Vishal, Mahantesh) updating ticket progress and resolution status on the ground, and IT Approval Managers (Samuel Kennedy, IT Infrastructure Leads) reviewing, authorizing, rejecting, and correcting ticket details.
- **Key Value**: Eliminates disconnected status controls, ensures auditable rejection causes through standardized dropdown reasons, and prevents accidental serial tampering while granting managers necessary administrative edit power.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Resolution Status Transitions in Activity & Comments**:
   - The user opens any ticket dossier (or views the ledger's Activity & Comments column).
   - Right under the **Activity & Comments** header, a dedicated **Resolution Status** panel displays the horizontal action pills:
     - `All` (displays total activity/comments count)
     - `Open` (shows count/active state)
     - `Pending` (shows count/active state)
     - `Waiting for Reporter` (shows count/active state)
     - `Resolved` (shows count/active state)
     - `Reopened` (shows count/active state)
   - Adjacent to the pills, an **Action Status Dropdown** allows instant selection of any workflow resolution status with an optional quick note.
   - Clicking any pill or selecting from the dropdown sends a status update request to `/api/movement/tickets/:id/status`, instantly updating the ticket status and appending a workflow transition record to the comment list.

2. **Approval & Rejection in Approval Manager Desk**:
   - In the Approval Manager Desk, the manager reviews tickets in the queue or detailed ticket modal.
   - Clicking **Approve** marks `approval_status = 'APPROVED'`, issues the Clearance Pass ID, and records manager approval.
   - Clicking **Reject** opens the **Rejection Authorization Modal**.
   - Inside the modal, instead of an empty unguided text field, there is a prominent **Reason for Rejection Dropdown**:
     - *Missing or Invalid Hardware Serial Number*
     - *Unauthorized Destination Floor / Port Mismatch*
     - *Asset Allocated to Another Active Workstation*
     - *Pending Physical Inspection / QA Check Required*
     - *Duplicate Movement Ticket Already Raised*
     - *Other / Custom Administrative Reason* (reveals specific notes field)
   - Confirming rejection updates `approval_status = 'REJECTED'`, sets the ticket status to `REJECTED`, records the chosen reason, and appends the decision to ticket comments.

3. **Locked Ticket Numbers & Serial Numbers with Manager Edit Control**:
   - In field views and default dossier displays, ticket numbers and serial numbers display a locked padlock icon and protected styling, preventing accidental alteration.
   - In the **Approval Manager Desk**, an authorized **Edit Ticket & Serial Numbers** action allows the manager to modify the ticket number (e.g. `TKT-0042`) and the scanned CPU/Asset serial numbers.
   - Once saved via `/api/movement/tickets/:id`, changes are persisted across both the ticket registry and underlying hardware assets.

### Visual Styling & Theme Tokens

- **Dominant Neutral Canvas**: Crisp white `#FFFFFF` with slate structural surfaces `#F8FAFC`.
- **Resolution Status Accents**:
  - `Open`: `#2563EB` (Blue)
  - `Pending`: `#D97706` (Amber)
  - `Waiting for Reporter`: `#7C3AED` (Purple)
  - `Resolved`: `#059669` (Emerald)
  - `Reopened`: `#EA580C` (Orange)
- **Zero-Pill Compliance**: Clean tabular figures (`font-mono tabular-nums`), structured action buttons with clear borders, and readable unboxed metadata dividers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Control (Pills + Dropdown) in Activity & Comments**:
  - *Chosen Approach*: Provide both the interactive status pills (matching the screenshot) and a compact status action dropdown in the Activity & Comments section.
  - *Why*: Gives users both high-visibility status telemetry and fast single-click action capability.
- **Decision 2: Standardized Rejection Taxonomy in Modal Dropdown**:
  - *Chosen Approach*: Pre-populate the rejection modal with standard enterprise IT causes, supplemented by an optional remarks field.
  - *Why*: Enforces structured, audit-ready rejection logs rather than arbitrary text entries.
- **Decision 3: Role-Restricted Serial Editing**:
  - *Chosen Approach*: Lock serials by default for engineers, but allow authorized managers in the Approval Manager Desk to unlock and update them.
  - *Why*: Protects barcode chain-of-custody while providing an escape hatch for manager corrections.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MovementDesk / App Layout                       │
├───────────────────────────────────┬────────────────────────────────────┤
│       Movement Ticket Registry     │     Approval Manager Desk          │
│  - Ticket status column           │  - Approval status controls        │
│  - Locked Ticket # & Serial       │  - Rejection Modal with Dropdown   │
│  - Activity & Comments drawer     │  - Manager Edit Serial/Ticket #    │
└─────────────────┬─────────────────┴─────────────────┬──────────────────┘
                  │                                   │
                  ▼                                   ▼
┌─────────────────────────────────────┐  ┌───────────────────────────────┐
│       TicketCommentsView.tsx        │  │     Server API Endpoints      │
├─────────────────────────────────────┤  ├───────────────────────────────┤
│ • Resolution Status Section         │  │ • POST /tickets/:id/status    │
│   - All, Open, Pending, Waiting,    │  │ • POST /tickets/:id/approve   │
│     Resolved, Reopened action pills │  │ • POST /tickets/:id/reject    │
│   - Status Transition Dropdown      │  │ • PUT  /tickets/:id (update   │
│ • Real-time Activity Timeline       │  │   ticket_no & serials)        │
│ • Engineer Comment Composer         │  │ • GET  /tickets, /assets      │
└─────────────────────────────────────┘  └───────────────────────────────┘
```

### Component & File Work Plan

1. **`src/components/TicketCommentsView.tsx`**:
   - Add the **Resolution Status** action container directly under the header.
   - Render the action pills (`All`, `Open`, `Pending`, `Waiting for Reporter`, `Resolved`, `Reopened`) with tabular counters and active state highlighting.
   - Implement an inline Action Dropdown to transition status with single-click execution.
   - Automatically post transition comments with author, role, and note.

2. **`src/components/ApprovalManagerDesk.tsx`**:
   - Enhance the Rejection dialog with a structured `<select>` dropdown containing standardized rejection causes.
   - Ensure rejection updates both `approval_status = 'REJECTED'` and ticket `status = 'REJECTED'`.
   - Implement the Manager Ticket Number & Hardware Serial Edit modal/form, unlocking fields for managers while displaying locked indicators for read-only states.

3. **`src/components/MovementDesk.tsx`**:
   - Pass resolution status callbacks and current ticket status to `TicketCommentsView`.
   - Ensure the ticket details drawer and main tables display locked serial badges with clear metadata.

4. **Verification**:
   - Execute `npm run lint` and `npm run build` via `compile_applet` to confirm flawless TypeScript compilation and zero regressions.
