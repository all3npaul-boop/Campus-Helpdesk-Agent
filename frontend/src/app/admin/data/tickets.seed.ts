import {
  Department, Ticket, TicketActivity, TicketCategory, TicketPriority, TicketStatus,
} from '../models/ticket.model';

/**
 * Mock ticket dataset. Timestamps are generated relative to "now" so the console always looks live.
 * NOTE: this file is the ONLY hardcoded ticket source — swap it for the shared ticket API in the next phase.
 */

const HOUR = 3_600_000;

const CAT_DEPT: Record<TicketCategory, Department> = {
  'Hostel Maintenance': 'Hostel', 'Fee / Payment': 'Accounts & Fees', 'ID Card': 'Administration',
  'Transport': 'Transport', 'Academic Request': 'Academics', 'IT Support': 'IT Services',
  'Examination': 'Academics', 'Library': 'Administration', 'Administration': 'Administration',
};
const CAT_TEAM: Record<TicketCategory, string> = {
  'Hostel Maintenance': 'Hostel Maintenance Team', 'Fee / Payment': 'Accounts Desk', 'ID Card': 'ID Card Counter',
  'Transport': 'Transport Office', 'Academic Request': 'Academic Section', 'IT Support': 'IT Service Desk',
  'Examination': 'Exam Cell', 'Library': 'Library Desk', 'Administration': 'Registrar Office',
};
const CAT_INTENT: Record<TicketCategory, string> = {
  'Hostel Maintenance': 'Report a maintenance fault',
  'Fee / Payment': 'Resolve a fee or payment discrepancy',
  'ID Card': 'Request an ID card service',
  'Transport': 'Transport pass or route query',
  'Academic Request': 'Request an academic document or approval',
  'IT Support': 'Restore access to an IT service',
  'Examination': 'Correct or clarify an examination record',
  'Library': 'Library account or borrowing request',
  'Administration': 'Request an administrative certificate or approval',
};
const CAT_ACTION: Record<TicketCategory, string> = {
  'Hostel Maintenance': 'Assign to Hostel Maintenance and schedule a technician visit',
  'Fee / Payment': 'Verify with Accounts and reconcile the student ledger',
  'ID Card': 'Verify identity and issue at the ID card counter',
  'Transport': 'Confirm route and seat availability with the Transport Office',
  'Academic Request': 'Route to the Academic Section for approval',
  'IT Support': 'Route to the IT Service Desk and verify account status',
  'Examination': 'Verify against the exam record with the Exam Cell',
  'Library': 'Check the borrowing record with the Library Desk',
  'Administration': 'Route to the Registrar Office for processing',
};
const PRIORITY_WHY: Record<TicketPriority, string> = {
  Urgent: 'Safety risk or a time-critical deadline for the student.',
  High: 'Blocks daily activity or has a near deadline.',
  Medium: 'Standard service request with no immediate impact.',
  Low: 'Informational or convenience request.',
};
const SLA_HOURS: Record<TicketPriority, number> = { Urgent: 8, High: 24, Medium: 48, Low: 96 };

interface Extra { why?: string; note?: string; rep?: number; miss?: string; res?: string; esc?: string; intent?: string; }

/** [num, student, regSuffix, program, title, description, category, priority, status, confidence, createdHoursAgo, updatedHoursAgo, extra?] */
type Row = [number, string, string, string, string, string, TicketCategory, TicketPriority, TicketStatus, number, number, number, Extra?];

const ROWS: Row[] = [
  [1011, 'Aarav Menon', '214', 'B.Tech CSE · Year 3', 'Tuition fee paid but not reflected in portal', 'Paid the semester tuition via net banking on 2 Sep. The portal still shows the amount as due and no receipt was generated.', 'Fee / Payment', 'High', 'Resolved', 96, 152, 140, { res: 'Payment reconciled with the bank statement. Receipt regenerated and emailed; portal balance updated.' }],
  [1012, 'Sneha Iyer', '388', 'B.Tech ECE · Year 3', 'Unable to log in to the Academia portal', 'The password reset link says "expired" every time I open it. I need access to view my internal marks.', 'IT Support', 'Medium', 'Resolved', 94, 146, 141, { res: 'Account unlocked and a fresh reset link issued. Student confirmed login works.' }],
  [1013, 'Karthik Raman', '057', 'B.Tech Mechanical · Year 2', 'Library book renewal rejected', 'The system says the renewal limit is reached for a reference book I need for my project.', 'Library', 'Low', 'Resolved', 91, 139, 130, { res: 'Renewal extended by 7 days as an exception; project deadline noted.' }],
  [1014, 'Divya Lakshmi', '421', 'B.Tech IT · Year 2', 'Lost ID card — need replacement', 'I lost my ID card near the food court. I need a replacement to enter the hostel and the library.', 'ID Card', 'Medium', 'Resolved', 97, 133, 118, { res: 'Replacement ID issued after the ₹150 fee was paid. Collected from the ID card counter.' }],
  [1015, 'Rohit Sharma', '299', 'B.Tech CSE · Year 3', 'Bonafide certificate for education loan', 'I need a bonafide certificate addressed to the bank for an education loan application.', 'Academic Request', 'Medium', 'Resolved', 95, 127, 104, { res: 'Bonafide certificate generated and signed; ready for pickup at the Academic Section.' }],
  [1016, 'Ananya Krishnan', '146', 'B.Tech Biotech · Year 2', 'Bathroom tap leaking in room 118', 'The tap in the attached bathroom keeps leaking and the floor stays wet.', 'Hostel Maintenance', 'Medium', 'Resolved', 93, 121, 108, { res: 'Tap washer replaced by the maintenance team. Verified with the student.' }],
  [1017, 'Vignesh Subramanian', '512', 'B.Tech Civil · Year 4', 'Bus pass not issued for Route 12', 'I paid the bus fee in August but my pass has still not been issued.', 'Transport', 'Medium', 'Resolved', 92, 116, 100, { res: 'Bus pass issued for Route 12. Collection details sent to the student.' }],
  [1018, 'Harini Balaji', '077', 'B.Tech CSE · Year 3', 'Hall ticket shows wrong subject code', 'My hall ticket lists CS3101 instead of CS3103. I raised this earlier but it has not been corrected.', 'Examination', 'High', 'Escalated', 88, 108, 20, { rep: 2, esc: 'Correction not applied after the first response and the exam is approaching.', why: 'Wrong subject code can bar entry to the exam; second report of the same issue.' }],
  [1019, 'Arjun Reddy', '330', 'MBA · Year 1', 'Campus Wi-Fi keeps disconnecting in the library', 'The Wi-Fi drops every few minutes on the library first floor, making it hard to attend online sessions.', 'IT Support', 'Low', 'Resolved', 89, 100, 88, { res: 'Access point restarted and firmware updated on the library first floor.' }],
  [1020, 'Meera Pillai', '264', 'B.Tech EEE · Year 2', 'Scholarship deducted from fee twice', 'The scholarship amount was adjusted twice in my fee ledger, so my payable amount looks wrong.', 'Fee / Payment', 'High', 'Resolved', 90, 94, 70, { res: 'Duplicate adjustment reversed; net fee corrected in the ledger.' }],
  [1021, 'Sanjay Kumar', '473', 'B.Tech Mechanical · Year 4', 'NOC for internship', 'I need a No Objection Certificate to join a two-month internship during the semester break.', 'Administration', 'Medium', 'Resolved', 94, 88, 62, { res: 'NOC issued and emailed to the student.' }],
  [1022, 'Lavanya Ravi', '191', 'B.Tech CSE · Year 2', 'Water leakage from ceiling in room 306', 'Water is dripping from the ceiling near the electrical socket for three days now. I reported it twice at the warden desk.', 'Hostel Maintenance', 'Urgent', 'Escalated', 91, 82, 30, { rep: 3, esc: 'Repeated unresolved leak near an electrical socket — safety risk.', why: 'Water near electrical fittings is a safety risk; reported three times without resolution.' }],
  [1023, 'Aditya Verma', '405', 'B.Tech CSE · Year 4', 'Official transcript request', 'I need my official transcript sent to a university for a master\'s application.', 'Academic Request', 'Low', 'Resolved', 96, 76, 60, { res: 'Official transcript dispatched by post; tracking number shared with the student.' }],
  [1024, 'Nithya Sundar', '236', 'B.Tech IT · Year 3', 'Route change from Route 8 to Route 5', 'I have moved to a new address and need my bus route changed to Route 5.', 'Transport', 'Medium', 'Resolved', 90, 70, 55, { res: 'Route change approved effective next Monday.' }],
  [1025, 'Tarun Bose', '318', 'B.Tech ECE · Year 2', 'Revaluation status not visible', 'I applied for revaluation two weeks ago but the portal shows no status.', 'Examination', 'Medium', 'Resolved', 93, 64, 40, { res: 'Revaluation application located and status published on the portal.' }],
  [1026, 'Keerthana M', '152', 'B.Sc Maths · Year 2', 'Overdue fine waiver request', 'I returned the book on time but the library shows a fine. Requesting a waiver.', 'Library', 'Low', 'Resolved', 95, 58, 50, { res: 'Fine waived — the book was returned on time but scanned late.' }],
  [1027, 'Pranav Joshi', '289', 'B.Tech Mechanical · Year 3', 'Hostel fee in two instalments', 'My education loan disbursement is delayed. Requesting to pay the hostel fee in two instalments.', 'Fee / Payment', 'Medium', 'In Progress', 87, 46, 12],
  [1028, 'Ishita Das', '347', 'B.Tech Biotech · Year 3', 'Broken window latch in room 402', 'The window latch is broken and the window will not stay closed during rain.', 'Hostel Maintenance', 'Medium', 'In Progress', 92, 41, 30],
  [1029, 'Suresh Babu', '460', 'B.Tech Civil · Year 2', 'Evening return timing for Route 3', 'Please share the evening return timings for Route 3 after the lab sessions.', 'Transport', 'Low', 'Open', 90, 38, 38],
  [1030, 'Fathima Noor', '175', 'B.Tech CSE · Year 2', 'Email storage full', 'My university mailbox is full and I am not receiving new mails from faculty.', 'IT Support', 'Medium', 'Resolved', 94, 36, 28, { res: 'Storage quota increased and old mail archived.' }],
  [1031, 'Deepak Rao', '392', 'B.Tech EEE · Year 4', 'Exam fee debited twice, no receipt', '₹42,500 was debited twice from my bank account for the exam fee. Only one receipt was generated.', 'Fee / Payment', 'Urgent', 'Escalated', 86, 33, 6, { esc: 'Duplicate debit — needs Accounts approval for refund.', why: 'Duplicate debit of a large amount before an exam-registration deadline.' }],
  [1032, 'Swathi Gopal', '208', 'B.Tech CSE · Year 3', 'MATLAB licence expired in CSE Lab 2', 'MATLAB shows "licence expired" on all machines in CSE Lab 2.', 'IT Support', 'Medium', 'In Progress', 89, 30, 14],
  [1033, 'Naveen Chandran', '431', 'B.Tech Civil · Year 1', 'Photo update on ID card', 'The photo on my ID card is from school. Requesting an update.', 'ID Card', 'Low', 'Resolved', 96, 27, 20, { res: 'Photo updated and ID card reprinted.' }],
  [1034, 'Bhavana Rao', '116', 'B.Tech IT · Year 3', 'Attendance condonation request', 'I submitted a condonation request last week and have had no acknowledgement. Exam registration closes soon.', 'Academic Request', 'High', 'Open', 84, 25, 25, { rep: 2 }],
  [1035, 'Yash Agarwal', '354', 'B.Tech ECE · Year 4', 'Supplementary exam registration', 'I could not find the supplementary exam registration option for my arrear paper.', 'Examination', 'Medium', 'In Progress', 90, 22, 10],
  [1036, 'Gayathri S', '227', 'B.Tech Biotech · Year 2', 'Fee structure letter, hostel NOC and migration certificate', 'I need a fee structure letter, a hostel NOC, and want to know the process for a migration certificate.', 'Administration', 'Medium', 'Needs Review', 62, 20, 20, { note: 'Multiple issues in one message', intent: 'Multiple document requests' }],
  [1037, 'Rahul Dev', '338', 'B.Tech CSE · Year 3', 'Fee refund for withdrawn elective', 'I withdrew from an elective within the allowed window and want the fee refunded.', 'Fee / Payment', 'Medium', 'Open', 88, 18, 18, { miss: 'Payment receipt not attached' }],
  [1038, 'Zoya Khan', '183', 'B.Tech IT · Year 2', 'Room light flickering', 'The tube light in my room flickers constantly and gives me headaches while studying.', 'Hostel Maintenance', 'Medium', 'Resolved', 95, 15, 8, { res: 'Tube light and starter replaced.' }],
  [1039, 'Manoj Prabhu', '449', 'B.Tech Mechanical · Year 1', 'VPN access for research portal', 'I need VPN access to read journals from the hostel.', 'IT Support', 'Low', 'Open', 90, 12, 12],
  [1040, 'Aishwarya R', '270', 'B.Tech CSE · Year 2', 'Morning bus 40 minutes late, missed internal test', 'The morning bus on Route 7 arrived 40 minutes late and I missed my internal test.', 'Transport', 'High', 'Open', 85, 10, 10],
  [1041, 'Kabir Singh', '306', 'B.Tech ECE · Year 2', 'Cannot connect to hostel Wi-Fi', 'My phone and laptop both fail to connect to the hostel network since yesterday.', 'IT Support', 'Medium', 'Needs Review', 71, 8, 8, { note: 'Could be Wi-Fi coverage or account access', intent: 'Restore network connectivity' }],
  [1042, 'Priya Nair', '162', 'B.Tech CSE · Year 3', 'Hostel AC complaint — Block C, room 214', 'The air conditioner stopped cooling two nights ago. I told the warden desk but nobody has visited yet, and the room is unbearable during study hours.', 'Hostel Maintenance', 'High', 'Needs Review', 68, 5, 5, { note: 'Ambiguous category', intent: 'Report a maintenance fault (or request a room change)' }],
  [1043, 'Roshni Thomas', '395', 'B.Sc Maths · Year 1', 'Extended library hours during exams', 'Can the reading hall stay open until midnight during the exam weeks?', 'Library', 'Low', 'Open', 93, 3.5, 3.5],
  [1044, 'Mohammed Faizan', '241', 'B.Tech Civil · Year 3', 'Ceiling fan sparking in room 129', 'The ceiling fan sparked when I switched it on and now smells burnt. I have stopped using it.', 'Hostel Maintenance', 'Urgent', 'Open', 90, 2.5, 2.5, { why: 'Possible electrical fault in an occupied room; immediate safety concern.' }],
  [1045, 'Nithya Sundar', '236', 'B.Tech IT · Year 3', 'Change elective or section?', 'I want to switch my elective but I am not sure whether I should change my section instead. Who should I speak to?', 'Academic Request', 'Medium', 'Needs Review', 64, 1.5, 1.5, { note: 'Unclear request type', intent: 'Academic advice (elective or section change)' }],
  [1046, 'Karthik Raman', '057', 'B.Tech Mechanical · Year 2', 'Character certificate request', 'I need a character certificate for a scholarship application.', 'Administration', 'Medium', 'Open', 89, 0.5, 0.5],
];

function buildActivity(row: Row, ago: (h: number) => string): TicketActivity[] {
  const [, , , , , , cat, , status, conf, cH, uH, x = {}] = row;
  const team = CAT_TEAM[cat];
  const min = 1 / 60;
  const log: TicketActivity[] = [
    { at: ago(cH), actor: 'Student', text: 'Ticket created via Campus Assist' },
    { at: ago(cH - min), actor: 'AI', text: `AI classified as ${cat} (${conf}% confidence)` },
  ];
  if (status === 'Needs Review') {
    log.push({ at: ago(cH - 2 * min), actor: 'System', text: `Flagged for review — confidence below ${75}%` });
    return log;
  }
  log.push({ at: ago(cH - 2 * min), actor: 'System', text: `Assigned to ${team}` });
  if (status === 'Open') return log;
  log.push({ at: ago(Math.max(uH + 0.5, cH - 0.4)), actor: 'Admin', text: 'Admin opened ticket' });
  if (status === 'In Progress') log.push({ at: ago(uH), actor: 'Admin', text: 'Status changed to In Progress' });
  if (status === 'Escalated') log.push({ at: ago(uH), actor: 'Admin', text: `Escalated — ${x.esc}` });
  if (status === 'Resolved') log.push({ at: ago(uH), actor: 'Admin', text: `Resolved — ${x.res}` });
  return log;
}

export function buildSeedTickets(now = Date.now()): Ticket[] {
  const ago = (h: number) => new Date(now - h * HOUR).toISOString();
  return ROWS.map((row): Ticket => {
    const [num, name, reg, program, title, description, category, priority, status, conf, cH, uH, x = {}] = row;
    const dept = CAT_DEPT[category];
    return {
      id: `TKT-${num}`,
      student: { name, regNo: `RA2311003010${reg}`, program },
      title, description, category, department: dept, priority, status,
      aiConfidence: conf,
      aiClassification: {
        intent: x.intent ?? CAT_INTENT[category],
        category,
        suggestedDepartment: dept,
        suggestedAction: status === 'Needs Review' ? 'Confirm the category, then assign to the suggested department' : CAT_ACTION[category],
      },
      aiReasoning: x.why ?? PRIORITY_WHY[priority],
      aiNote: x.note,
      assignedTo: status === 'Needs Review' ? null : CAT_TEAM[category],
      createdAt: ago(cH),
      updatedAt: ago(uH),
      slaDueAt: new Date(now - cH * HOUR + SLA_HOURS[priority] * HOUR).toISOString(),
      repeatCount: x.rep ?? 1,
      missingInfo: x.miss,
      escalationReason: x.esc,
      resolution: x.res,
      resolvedAt: status === 'Resolved' ? ago(uH) : undefined,
      activity: buildActivity(row, ago),
    };
  });
}
