# OpsDesk: 3–5 Minute Hackathon Judges Demo Script

This script walks through the 6 core problem statements from the TBO Zendesk challenge.

---

## Pre-Flight Setup
Open the OpsDesk application at the hosted URL. Click the **"Judge Demo Guide"** button in the top navigation bar at any time to execute 1-click step jumps.

---

## Step 1: Explain the Problem with Isolated Tickets (0:00 - 0:45)
- **Speaker:** "In standard support desks like Zendesk, travel agents receive tickets that say 'Guest is stranded at hotel lobby' without knowing the hotel, the supplier reference, whether check-in is in 2 hours, or whether a refund was already processed on this booking."
- **Action:**
  - Switch persona to **Tariq Al-Mansoor** (Skyline Travel Dubai).
  - Open **"Submit Support Ticket"**. Enter TBOH `TBOH-984210`.
  - Notice the **Context Linking Warning**: OpsDesk immediately informs the agency that existing cases already exist for this booking reference!
  - Click **"Analyze with AI"** to see instant category and priority classification.

---

## Step 2: Context-Rich Ticket Linking (0:45 - 1:30)
- **Speaker:** "Instead of treating tickets in isolation, OpsDesk automatically connects cases sharing the same booking reference without merging separate customer threads."
- **Action:**
  - Switch persona to **Rahul Sharma** (Support Agent).
  - Open ticket **OPS-1001** (*Atlantis The Palm: Front desk reports reservation unconfirmed in PMS*).
  - Point to the **Connected Cases Banner**: Notice `OPS-1004` is linked. Click on it to show that 2 days ago, Hotelbeds charged an unauthorized AED 450 supplement that was already resolved. The agent has 360-degree booking history!

---

## Step 3: Smart Routing Engine & Explanation (1:30 - 2:15)
- **Speaker:** "Why was OPS-1001 assigned to Rahul Sharma? Not randomly, but via multi-signal rules."
- **Action:**
  - Point to the **Routing Decision Banner** on OPS-1001: *"Assigned via Rule 'Emergency Check-in Triage (<24h)': High-risk passenger arrival within 24h routed directly to Senior Triage Specialist Rahul Sharma."*
  - Switch persona to **Vikram Malhotra** (Operations Lead) and click **"Smart Routing Rules"** to show how rules are configured.

---

## Step 4: Supplier Side Conversations & Privacy (2:15 - 3:00)
- **Speaker:** "Support agents must liaise with hotel bedbanks like Hotelbeds and property receptionists without leaking internal notes to the agency."
- **Action:**
  - Return to **OPS-1001**.
  - Show the 3 distinct communication tabs:
    1. **Customer Messages:** Public thread with Skyline Travel.
    2. **Internal Agent Notes:** Private records hidden from agency.
    3. **Supplier Side Conversations:** Thread with `urgent-ops@hotelbeds.com` and `reservations@atlantisthepalm.com`.
  - Point out that recipients are preserved even when the ticket owner changes.

---

## Step 5: Travel-Aware SLA & Escalation Center (3:00 - 3:45)
- **Speaker:** "Generic SLAs treat all tickets identically. OpsDesk travel-aware SLA compresses resolution targets when a guest check-in is within 24 hours."
- **Action:**
  - Switch persona to **Elena Rostova** (Global Escalation Lead).
  - Open **"Escalation Center"**.
  - Inspect **OPS-1005** (*Bellagio Las Vegas: Corporate block refund delayed by 18 days*).
  - Point out the status is **SLA Breached** and assigned directly to the escalation manager with recorded root blockers.

---

## Step 6: AI Insights & Theme Loop (3:45 - 4:30)
- **Speaker:** "Finally, OpsDesk closes the feedback loop with upstream suppliers."
- **Action:**
  - Click **"Insights & Themes"**.
  - Review the Recharts visualizations: Category distribution, regional volume, and agent queue balancing.
  - Review **Top Recurring Complaint Themes**: *Hotel PMS Rejection*, *Supplier Refund Delays*, *Inventory Sync Mismatches*.
  - Click **"Export Operations CSV"** to demonstrate raw data access without arbitrary UI truncation.
