# intelligent-enterprise-platform

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)


A governed multi-agent AI platform for enterprise HR — featuring policy evaluation, career trajectory prediction, self-healing infrastructure agents, and self-governance agents. 

##Creator: Priyank Mohan, Senior IEEE Member and Product Manager

##Reference: This platform is an illustration of a multi-agent AI platform for employees and HR. For more details on the proposed agent architecture refer to this article on Medium: https://medium.com/@mg.priyank/building-an-intelligent-enterprise-platform-0d0dde61ba2a?postPublishedType=repub


##Abstract: Enterprise software platforms are undergoing a paradigm shift from reactive, instruction-based tools toward autonomous, intelligent systems capable of reasoning and independent action. This paper introduces a novel five-plane architecture—comprising the Experience, Business, Stack, Orchestration, and Governance planes—designed to support governed AI operations at scale. By integrating emerging capabilities such as Multi-Agent Systems (MAS) and the Model Context Protocol (MCP), the framework demonstrates how intelligence can be embedded at every layer of the enterprise stack. A central thesis of the work is that the Governance Plane serves as the critical enabler for autonomy, providing the necessary boundaries for trusted operational participation. The proposed framework offers a roadmap for transitioning from static interfaces to active, intelligent participants in organizational operations.


Basic architecture of the platform:
1. Data Layer:
   At this layer, we have the following systems of record which represent domain specific systems that different domain / system teams own.
   1.1. Employee Master (ERP): This is the primary employee system of record that holds all employee details - name, email, date of hire (with history), date of termination (with history), team and manager history, levels and growth history, benefits history, personal details and PII  - address, age, gender, immigration information, marital status, emergency contact information, etc., work location details. 
   1.2. Leave and Attendance: This system holds the attendance information of the employee - what dates and time they attended work, came in to office and their leave history along with balances. The system automatically accrues leave balance for employees based on a central policy. 
   1.3. Disability and Accommodations: This system holds the accommodation request history of employees in the form of cases, where employee submits a type of accommodation request along with documents and then a case manager reviews and makes a decision. It also houses any disability requests in a similar manner.
   1.4. Performance and Feedback: This system holds all the performance and feedback history of the employees - with employee performance reviews, self-inputs, feedback from others, final decisions, growth and compensation.
   1.5. Employee Investigation and Cases: This system holds all types of interactions between HR, Support teams and employees - such as employee queries about policies, leaves, or anything; HR cases about safety, investigations.
   1.6. Training : This system holds a list of various types of trainings - mandatory to optional, career growth vs compliance - such as a career program for product management, or for a solution architect, or for a data engineer, to mandatory data security trainings. 
   1.7. Policy Central: A database that stores all policies of the company with all version history. Different teams and organizations define their policies - such as what is a job role and level expectation, how a performance review must be conducted, compensations, growth, when does an employee qualify for termination - what are the kinds of incidents that can lead to termination along with rehire consequences based on severity, leave accrual policy (how many hours per 15 days, what types of leaves - sick, paid, floating), leave approval and denial policy, leaves based on national leaves in the country of operation, working hours, work expectation, processes and SOPs for a support or HR person to review employee requests from leaves to accommodations, disability, or any other questions, per diems and reimbursements limits. Basically all employee and HR policies.

   Data Lake: Separately there is a data lake that exists which is not a part of this specific platform but it is a central data mart for various system teams to vend their data for reporting purposes. Each system has their own data schemas, data refresh rates based on the user needs who use their data for reports. 

2. Abstraction Layer:
   APIs: At this layer, we have multiple system specific APIs that can be used by the user experience layer. Some APIs directly source data from the systems such as systems 1.3 and 1.5 don't have APIs that can provide real-time data. Instead they obtain data from a data lake where the systems upload their data every 24 hours as part of a pre-defined / scheduled job. The data lake is owned and maintained by a central BI team who is responsible for ensuring data pipelines are working well, the data is transformed and saved,    data is made available for various types of reporting which happens in a completely different enterprise system and used by all types of employees - from HR, to employees to leaders and managers.
   User Authentication and IAM: This is a module which defines various permission groups, policies and is a gateway for all transactions that happen via APIs or simply abstraction layer. The system records user groups with one or more employees, with a user group name, and then associates the system and transaction (operation) type scope - Managers group can only access employee's performance data in the performance system but cannot write i.e. read or view only. Another group - HRs can only access read view of employee disability and accommodation cases without access to medical documents or attachments but another group of case managers within disability and accommodations have complete read write and delete access to the data. The authentication can happen down to an API's attribute level so that a system may prevent an employee manager from seeing the medical history of an employee.

3. User Experience:
   At this layer, we have the platform UX. The platform UX houses a homepage for each user who is allowed to login using the SSO of their company and then the user authentication module. The dashboard shows the users a list of their open cases or tasks to work on, tasks that are new, or late. An HR can view a list of all employees who they support and have come to work today, list of all employees who are low on leave balance or list of employees terminated in last 1 month. The HR can also deep dive into an employee profile page that pulls all the data pertaining to the employee from various underlying systems from data layers and shows each system data in their own unique manner that meets the use case needs. Such as case view is a more case management view whereas a leave balance is like a leave balance ledger - credits and debits.
The HR user can view employee attributes based on their access and perform actions based on their access.
Each system's data is housed within micro-front ends that each domain/system team owns and maintains since they are specialists in knowing what data and how their users want to use it.

The employee facing UX allows employee to see their data - all their history from various systems, reach out to HR or support for help with anything or track open cases / requests.

---

## AI agents

This platform includes **7 AI agents**, grouped into two planes:

**Business plane (3 agents)**  
- **Semantic Layer Agent** — Supplies policy metadata (definitions, clause semantics, inference rules) so the Policy Evaluation Agent interprets policies correctly. Used in the termination investigation workflow.  
- **Policy Evaluation Agent** — Evaluates employee snapshot and case against the termination policy; outputs applied clause and violation result.  
- **Retrieval Augmentation Agent** — Uses the applied policy clause to retrieve past similar termination cases and ground the recommendation.

**Career trajectory classifier**  
- **Career Trajectory Agent** — Predicts whether an employee is trending toward growth (promotion, high performance) or termination risk. Uses a k-NN classifier over job-relevant snapshots (tenure, leave balance, performance ratings, HR cases, training completion, level). **The model explicitly does not use protected characteristics** such as age, gender, race, ethnicity, sexual orientation, religion, disability status, marital status, or nationality. Only performance-related and job-relevant signals are included in the snapshot and prediction. See [Career trajectory classifier](#career-trajectory-classifier) below.

**Tech plane (3 agents)**  
- **API healing** — Monitors API calls to systems of record; when payload or response contract changes, analyzes the failure, updates the data contract, retries, and creates engineering or FYI tickets.  
- **Database monitoring** — Monitors ERP datatable schemas for changes; updates impacted views and pipeline queries; notifies API healing (contract sync) and invokes the pipeline agent via the tech-stack MCP; monitors indexing performance and suggests caching or priority indexing.  
- **Pipeline healing** — Invoked by the database monitoring agent (via tech-stack MCP) when a schema change affects reporting pipelines; updates pipeline queries to match the new schema.

All agents are orchestrated or triggered from the abstraction and UX layers; tech-plane agents are managed under **Tech agents** in the UI (API healing, Database monitoring, Pipeline healing).

### Models used by agents

| Agent | Model / approach |
|-------|------------------|
| **Semantic Layer Agent** | **OpenAI `gpt-4o-mini`** — policy metadata lookup (when `OPENAI_API_KEY` is set; otherwise mock). |
| **Policy Evaluation Agent** | **OpenAI `gpt-4o-mini`** — evaluates snapshot and case against termination policy (otherwise mock). |
| **Termination review synthesis** | **OpenAI `gpt-4o-mini`** — combines policy evaluation and similar cases into the final recommendation (otherwise mock). |
| **Retrieval Augmentation Agent** | **No LLM** — rule/data-based: uses the cases retrieval service to fetch past cases by applied policy clause. |
| **Career Trajectory Agent** | **k-NN (no LLM)** — deterministic: k=5 nearest neighbors (Manhattan distance) over growth/termination reference snapshots; majority vote for trend. |
| **Self-healing (API healing) Agent** | **OpenAI `gpt-4o-mini`** — infers contract changes and proposes fixes (otherwise mock). |
| **Database Monitoring Agent** | **No LLM** — compares ERP schema to last known state and updates views/pipelines. |
| **Pipeline Agent** | **No LLM** — updates pipeline queries when invoked by DB monitoring. |
| **AI Assistant (chat)** | **OpenAI `gpt-4o-mini`** — intent classification and reply generation (otherwise keyword-based intent and mock replies). |

**Summary:** LLM-based agents use **OpenAI `gpt-4o-mini`** (set `OPENAI_API_KEY` in `.env` for live calls). The Career Trajectory, Retrieval Augmentation, Database Monitoring, and Pipeline agents are deterministic or rule-based and do not call an LLM.

---

## Running the platform

This repo implements the above architecture with a **Next.js 15** app (TypeScript, Tailwind, React 19).

- **Data layer:** `src/data-layer/` — types and mock data for all seven systems of record (Employee Master, Leave & Attendance, Disability & Accommodations, Performance & Feedback, HR Cases, Training, Policy Central) plus IAM user groups. Employee records include address and personal details (phone, DOB, nationality, marital status, emergency contact).
- **Abstraction layer:** `src/abstraction-layer/iam.ts` — permission checks; `src/app/api/` — REST APIs for employees, leave, accommodations, performance, cases, training, policies, dashboard tasks, HR summary, career trajectory (`GET /api/employees/[id]/career-trajectory`), and assistant chat. All API routes enforce IAM.
- **User experience:** Dashboard (my tasks, HR summary: present today / low leave / terminated), Employees list with filters, Employee profile (aggregated data per system, address and personal details, **Career trajectory** section with “View career trajectory recommendation” and a disclaimer that the outcome is data-driven but an AI prediction and does not use protected characteristics), My profile (employee self-service), Policy Central, Cases (investigations and termination reviews), **Tech agents** (API healing, Database monitoring, Pipeline healing), Profile. An **AI Assistant** chat (floating button) lets users ask employee counts, low leave balance, present today, terminated count, and trigger simulate API healing or database monitoring.
- **Persistence:** Tech-agent cases (API healing, database monitoring, pipeline healing), failures, and tickets are stored under the `data/` directory as JSON files and persist across restarts and refresh.

**Commands:**

```bash
npm install
npm run dev    # Opens on http://localhost:3000 (or 3001/3002 if 3000 is in use — use the URL shown in the terminal)
npm run build
npm start      # production
```

If you see "This page isn't working" or HTTP 404, make sure you are opening the **exact URL** printed when you run `npm run dev` (e.g. `http://localhost:3002` if the dev server fell back to port 3002).

**Mock user:** The app uses a single mock session user (Jordan Lee, `emp-2`) with roles `manager` and `hr` and groups Managers + HR, so dashboard and employee views show HR summary and full employee profile data.

### Termination investigation workflow

1. **Investigation case** (`case-inv-1`): Colleague complaint — employee (Alex Chen) allegedly took pictures in confidential restricted office. HR interviewed witnesses, obtained security footage, documented notes. Initial finding: employee was seen using phone.
2. **Initiate termination review**: From the investigation case, HR clicks "Initiate termination review" → opens the termination review UX.
3. **Data aggregation service** (`src/services/data-aggregation.ts`): On load, pulls an employee snapshot from all systems (Employee Master, Leave, Performance, Training, Cases, Policies) as of the incident date.
4. **Three agents** (orchestrated by `POST /api/cases/[id]/termination-review/analyze`):
   - **Semantic Layer Agent** (`src/agents/semantic-layer-agent.ts`): Looks up policy metadata (definitions, clause semantics, how-to-infer rules) from `src/data-layer/policy-metadata.ts` so the Policy Evaluation Agent infers the policy correctly.
   - **Policy Evaluation Agent** (`src/agents/policy-evaluation-agent.ts`): Calls the Semantic Layer Agent, then reads the termination policy and checks whether the employee snapshot and case show a policy violation. Outputs the **applied policy clause** (e.g. `restricted-area-device`, `restricted-area-photography`) and violation result.
   - **Retrieval Augmentation Agent** (`src/agents/retrieval-augmentation-agent.ts`): Takes the applied policy clause from the Policy Evaluation Agent and uses the **cases retrieval service** (`src/services/cases-retrieval.ts`) to retrieve past termination cases where the same policy was applied. No LLM; uses data aggregation / case store.
5. **Synthesis**: The analyze API combines policy evaluation + similar cases into a single recommendation (terminate / warning / insufficient evidence), summary, evidence, and mitigating factors for HR.
6. **HR decision**: HR reviews the recommendation, policy evaluation, similar cases, and employee snapshot, then submits formal termination with reason and rehire consequence.

**AI:** Set `OPENAI_API_KEY` in `.env` for live GPT in Semantic Layer, Policy Evaluation, and synthesis. When unset, mock results are returned.

### Career trajectory classifier

From an employee profile, **View career trajectory recommendation** builds a snapshot of the employee (tenure, leave balance, average manager rating, performance trend, HR case counts, training completion, level) and runs a k-NN classifier against reference snapshots of past employees who had growth (promotion, high performance) vs termination outcomes. The result is a trend (growth / termination / neutral), confidence, summary, and contributing factors. Each factor is **grounded in data**: the UI shows actual numbers (e.g. “2.0/5 avg”, “12 hours” leave balance) and links to the corresponding HR/investigation cases where applicable. A **disclaimer** under the outcome states that the recommendation is data-driven but remains an AI prediction and that the model does not take into account any protected characteristics.

**Fairness and protected characteristics:** The snapshot and model **do not use any protected characteristics**. Specifically excluded from the feature set are: age, gender, race, ethnicity, sexual orientation, religion, disability status, marital status, nationality, and any other legally protected attributes. Only job-relevant, performance-related signals are used so predictions are based on work-related factors only.

**Components and types:**

- **Types** (`src/data-layer/types.ts`): `CareerSnapshot` (feature vector; no protected attributes), `CareerTrajectoryResult` (trend, confidence, summary, factors, `factorItems`, snapshot), `CareerTrajectoryFactor` (label, optional `caseIds`, optional `value` for grounding).
- **Snapshot service** (`src/services/career-snapshot-service.ts`): Builds `CareerSnapshot` from Employee Master (tenure, level only), Leave, Performance, HR Cases, Training.
- **Agent** (`src/agents/career-trajectory-agent.ts`): k-NN (k=5) over growth/termination reference snapshots; outputs trend, confidence, summary, and `factorItems` with labels and values (case IDs added by the API).
- **API:** `GET /api/employees/[id]/career-trajectory` (same IAM as employee read). Enriches factor items with case IDs from `hrCases` for “Investigation or termination-related cases”.
- **Reference data** (`src/data-layer/career-snapshot-data.ts`): Growth and termination snapshot lists plus canonical “good” and “bad” reference snapshots; no protected attributes.
- **UX** (`src/app/employees/[id]/page.tsx`): Career trajectory section with button, result card (trend, confidence, summary, factor list with values and “View case” / “View N cases” links), and disclaimer.

**Sample data:** The mock dataset includes additional employees (e.g. emp-7–emp-11) and a **termination-risk profile** for the mock user **Jordan Lee** (emp-2): low leave balance, a recent “Does not meet” performance review (2025-Q1), and an ongoing investigation case (`case-inv-2`, performance and quality-of-work concerns). Viewing Jordan’s profile and running the recommendation illustrates a termination-risk outcome with grounded factors and case links.

### Self-Healing Agent

Monitors API calls between the **middle layer** and **systems of record** (ERP, Leave, Policy). When a request fails because:

- the **system expects an updated payload** (e.g. new field names), or  
- the **response data contract changed** and the middle layer cannot ingest it,

the agent:

1. **Reads the failure** (recorded by the system gateway when a call fails).
2. **Identifies** what changed (via LLM or mock logic): e.g. `employeeId` vs `id`, `content` vs `body`.
3. **Updates the API data contract** in real time (`src/data-layer/contracts.ts`).
4. **Retries** the call (up to 2–3 attempts).
5. **Creates a ticket**:
   - If **unable to heal**: **Engineering** ticket with failure details, what the agent identified, what it tried, and what the team must look at.
   - If **healed**: **FYI** ticket describing what broke, when, and the fix.

**Components:**

- **System gateway** (`src/data-layer/system-gateway.ts`): Middle layer calls `callErp`, `callLeave`, `callPolicy`; failures are recorded.
- **Contracts** (`src/data-layer/contracts.ts`): Request/response schema per system; the agent updates these when it infers a new contract.
- **Self-Healing Agent** (`src/agents/self-healing-agent.ts`): `runSelfHealingAgent(failureId)` — analyze, propose fix, apply, retry, create ticket.
- **Failure store** / **Ticket store** (`src/services/failure-store.ts`, `ticket-store.ts`): Persisted to `data/failures.json` and `data/tickets.json`. Schema-driven contract updates are in `data/schema-contract-updates.json` and appear as API healing cases.
- **APIs**: `GET/POST /api/internal/failures`, `POST /api/internal/healing`, `GET /api/internal/healing/cases`, `GET /api/tickets`.
- **UI**: **Tech agents** (`/tech-agents`) — tab **API healing**: simulate failure (ERP, Leave, Policy), trigger healing, view cases (failure-based and schema-driven). Redirects: `/healing` → `/tech-agents?tab=healing`, `/database` → `/tech-agents?tab=database`.

### Database monitoring and pipeline healing

- **Database Monitoring Agent** (`src/agents/database-monitoring-agent.ts`): Compares ERP table schema with last known; on change, updates impacted views and pipeline queries, notifies API healing (contract sync) and pipeline agent via tech-stack MCP; monitors indexing performance. Cases persisted to `data/db-monitoring-cases.json`.
- **Pipeline Agent** (`src/agents/pipeline-agent.ts`): Invoked by DB monitoring; updates reporting pipeline queries. Cases persisted to `data/pipeline-cases.json`.
- **UI**: **Tech agents** — tabs **Database monitoring** and **Pipeline healing** to run and view cases.

### AI Assistant

- **Chat** (floating button on every page): `POST /api/assistant/chat` with `{ message }`. Intent detection (keyword or OpenAI) for: employee count, low leave balance, present today, terminated count, simulate API healing (ERP/Leave/Policy), simulate database monitoring. Replies are plain text with optional bold markers for the UI.
