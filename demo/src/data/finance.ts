import type { Invoice } from "../types";

export const invoices: Invoice[] = [
  { id: "INV-001", projectId: "P001", projectName: "Al-Rashidi Industries 100kW", client: "Ahmed Al-Rashidi", type: "advance", amount: 130500, status: "paid", issueDate: "2024-02-10", dueDate: "2024-02-20", paidDate: "2024-02-18" },
  { id: "INV-002", projectId: "P001", projectName: "Al-Rashidi Industries 100kW", client: "Ahmed Al-Rashidi", type: "progress", amount: 174000, status: "paid", issueDate: "2024-03-20", dueDate: "2024-04-05", paidDate: "2024-04-02" },
  { id: "INV-003", projectId: "P001", projectName: "Al-Rashidi Industries 100kW", client: "Ahmed Al-Rashidi", type: "final", amount: 130500, status: "pending", issueDate: "2024-05-20", dueDate: "2024-06-05" },
  { id: "INV-004", projectId: "P002", projectName: "Mutairi Construction HQ Solar", client: "Ibrahim Al-Mutairi", type: "advance", amount: 58500, status: "paid", issueDate: "2024-02-18", dueDate: "2024-02-28", paidDate: "2024-02-25" },
  { id: "INV-005", projectId: "P002", projectName: "Mutairi Construction HQ Solar", client: "Ibrahim Al-Mutairi", type: "progress", amount: 78000, status: "pending", issueDate: "2024-04-01", dueDate: "2024-04-15" },
  { id: "INV-006", projectId: "P003", projectName: "Sulami Healthcare Clinic", client: "Hana Al-Sulami", type: "advance", amount: 32400, status: "paid", issueDate: "2024-01-08", dueDate: "2024-01-15", paidDate: "2024-01-12" },
  { id: "INV-007", projectId: "P003", projectName: "Sulami Healthcare Clinic", client: "Hana Al-Sulami", type: "progress", amount: 43200, status: "paid", issueDate: "2024-02-10", dueDate: "2024-02-20", paidDate: "2024-02-19" },
  { id: "INV-008", projectId: "P003", projectName: "Sulami Healthcare Clinic", client: "Hana Al-Sulami", type: "final", amount: 32400, status: "paid", issueDate: "2024-03-01", dueDate: "2024-03-10", paidDate: "2024-03-08" },
  { id: "INV-009", projectId: "P004", projectName: "Green Valley Resort 50kW", client: "Fatima Al-Zahrawi", type: "advance", amount: 64500, status: "paid", issueDate: "2024-03-12", dueDate: "2024-03-20", paidDate: "2024-03-18" },
  { id: "INV-010", projectId: "P005", projectName: "Farsi Textiles 60kW Rooftop", client: "Yasmine Al-Farsi", type: "advance", amount: 77400, status: "paid", issueDate: "2024-02-28", dueDate: "2024-03-08", paidDate: "2024-03-05" },
  { id: "INV-011", projectId: "P006", projectName: "Otaibi Mall 250kW System", client: "Mariam Al-Otaibi", type: "advance", amount: 319500, status: "pending", issueDate: "2024-03-28", dueDate: "2024-04-07" },
  { id: "INV-012", projectId: "P007", projectName: "Al-Sayed Farms Irrigation", client: "Mohammed Al-Sayed", type: "advance", amount: 96600, status: "paid", issueDate: "2024-02-25", dueDate: "2024-03-05", paidDate: "2024-03-03" },
  { id: "INV-013", projectId: "P007", projectName: "Al-Sayed Farms Irrigation", client: "Mohammed Al-Sayed", type: "progress", amount: 128800, status: "overdue", issueDate: "2024-04-05", dueDate: "2024-04-15" },
  { id: "INV-014", projectId: "P008", projectName: "Shammari Warehouse Network", client: "Khalid Al-Shammari", type: "advance", amount: 51600, status: "pending", issueDate: "2024-04-08", dueDate: "2024-04-18" },
  { id: "INV-015", projectId: "P009", projectName: "Hassan Medical Center 30kW", client: "Nora Al-Hassan", type: "advance", amount: 39000, status: "paid", issueDate: "2023-10-28", dueDate: "2023-11-07", paidDate: "2023-11-04" },
  { id: "INV-016", projectId: "P009", projectName: "Hassan Medical Center 30kW", client: "Nora Al-Hassan", type: "progress", amount: 52000, status: "paid", issueDate: "2023-12-01", dueDate: "2023-12-10", paidDate: "2023-12-09" },
  { id: "INV-017", projectId: "P009", projectName: "Hassan Medical Center 30kW", client: "Nora Al-Hassan", type: "final", amount: 39000, status: "paid", issueDate: "2024-01-02", dueDate: "2024-01-10", paidDate: "2024-01-08" },
  { id: "INV-018", projectId: "P011", projectName: "Ghamdi Food Processing 120kW", client: "Abdullah Al-Ghamdi", type: "advance", amount: 155400, status: "paid", issueDate: "2024-03-08", dueDate: "2024-03-18", paidDate: "2024-03-15" },
  { id: "INV-019", projectId: "P015", projectName: "Zahrani School Network 35kW", client: "Reem Al-Zahrani", type: "advance", amount: 45000, status: "paid", issueDate: "2023-09-28", dueDate: "2023-10-05", paidDate: "2023-10-03" },
  { id: "INV-020", projectId: "P015", projectName: "Zahrani School Network 35kW", client: "Reem Al-Zahrani", type: "progress", amount: 60000, status: "paid", issueDate: "2023-11-10", dueDate: "2023-11-20", paidDate: "2023-11-18" },
  { id: "INV-021", projectId: "P015", projectName: "Zahrani School Network 35kW", client: "Reem Al-Zahrani", type: "final", amount: 45000, status: "paid", issueDate: "2023-12-17", dueDate: "2023-12-25", paidDate: "2023-12-22" },
  { id: "INV-022", projectId: "P012", projectName: "Dosari Hotel 80kW", client: "Layla Al-Dosari", type: "advance", amount: 103500, status: "pending", issueDate: "2024-04-03", dueDate: "2024-04-13" },
  { id: "INV-023", projectId: "P010", projectName: "Juhani Plastics 70kW", client: "Mona Al-Juhani", type: "advance", amount: 90600, status: "pending", issueDate: "2024-04-18", dueDate: "2024-04-28" },
  { id: "INV-024", projectId: "P005", projectName: "Farsi Textiles 60kW Rooftop", client: "Yasmine Al-Farsi", type: "progress", amount: 103200, status: "overdue", issueDate: "2024-04-08", dueDate: "2024-04-18" },
  { id: "INV-025", projectId: "P011", projectName: "Ghamdi Food Processing 120kW", client: "Abdullah Al-Ghamdi", type: "progress", amount: 207200, status: "pending", issueDate: "2024-04-20", dueDate: "2024-04-30" },
];

export const budgetData = [
  { month: "Oct 23", revenue: 150000, expenses: 95000, profit: 55000 },
  { month: "Nov 23", revenue: 280000, expenses: 165000, profit: 115000 },
  { month: "Dec 23", revenue: 320000, expenses: 190000, profit: 130000 },
  { month: "Jan 24", revenue: 410000, expenses: 240000, profit: 170000 },
  { month: "Feb 24", revenue: 380000, expenses: 220000, profit: 160000 },
  { month: "Mar 24", revenue: 520000, expenses: 295000, profit: 225000 },
  { month: "Apr 24", revenue: 490000, expenses: 275000, profit: 215000 },
];

export const paymentTrendData = [
  { month: "Oct 23", collected: 130000, outstanding: 45000 },
  { month: "Nov 23", collected: 240000, outstanding: 85000 },
  { month: "Dec 23", collected: 295000, outstanding: 72000 },
  { month: "Jan 24", collected: 380000, outstanding: 95000 },
  { month: "Feb 24", collected: 350000, outstanding: 65000 },
  { month: "Mar 24", collected: 475000, outstanding: 110000 },
  { month: "Apr 24", collected: 420000, outstanding: 130000 },
];
