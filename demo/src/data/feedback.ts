import type { Feedback } from "../types";

export const feedbackData: Feedback[] = [
  { id: "F001", projectId: "P003", projectName: "Sulami Healthcare Clinic", client: "Hana Al-Sulami", rating: 5, category: "Overall Satisfaction", comment: "Excellent work from start to finish. The team was professional, punctual, and the system has been performing above expectations. Highly recommend Solar Maps!", date: "2024-03-05", sentiment: "positive", responded: true },
  { id: "F002", projectId: "P009", projectName: "Hassan Medical Center", client: "Nora Al-Hassan", rating: 4, category: "Installation Quality", comment: "Very satisfied with the installation quality and professionalism. Minor delay in procurement but was communicated proactively. Great team overall.", date: "2024-01-10", sentiment: "positive", responded: true },
  { id: "F003", projectId: "P015", projectName: "Zahrani School Network", client: "Reem Al-Zahrani", rating: 5, category: "Project Management", comment: "Outstanding project management. Every milestone was delivered on time. Our students love the visible solar monitoring dashboard!", date: "2023-12-20", sentiment: "positive", responded: true },
  { id: "F004", projectId: "P001", projectName: "Al-Rashidi Industries", client: "Ahmed Al-Rashidi", rating: 4, category: "Communication", comment: "Good communication throughout the project. Progress updates were regular. Looking forward to the completion and hoping for the same quality.", date: "2024-04-01", sentiment: "positive", responded: true },
  { id: "F005", projectId: "P007", projectName: "Al-Sayed Farms Irrigation", client: "Mohammed Al-Sayed", rating: 3, category: "Timeline", comment: "The installation took longer than initially promised. Quality seems good but the delay affected our farming schedule. Hope for better planning next time.", date: "2024-04-10", sentiment: "neutral", responded: false },
  { id: "F006", projectId: "P002", projectName: "Mutairi Construction HQ", client: "Ibrahim Al-Mutairi", rating: 4, category: "Technical Expertise", comment: "Engineers clearly know their work. The system design was excellent and the team handled unexpected structural challenges professionally.", date: "2024-03-15", sentiment: "positive", responded: true },
  { id: "F007", projectId: "P005", projectName: "Farsi Textiles Rooftop", client: "Yasmine Al-Farsi", rating: 2, category: "Invoice & Payment", comment: "Good installation team but finance department needs improvement. Invoice arrived late and there was confusion about payment terms. This caused internal issues for us.", date: "2024-04-12", sentiment: "negative", responded: false },
  { id: "F008", projectId: "P004", projectName: "Green Valley Resort", client: "Fatima Al-Zahrawi", rating: 5, category: "Site Survey", comment: "Incredibly thorough site inspection. The engineering team went above and beyond to understand our facility's needs. Very impressed with the initial analysis.", date: "2024-03-20", sentiment: "positive", responded: true },
  { id: "F009", projectId: "P011", projectName: "Ghamdi Food Processing", client: "Abdullah Al-Ghamdi", rating: 4, category: "Safety Standards", comment: "Very impressed with the safety protocols followed on-site. Zero incidents during installation. The site supervisor maintained excellent discipline.", date: "2024-04-05", sentiment: "positive", responded: true },
  { id: "F010", projectId: "P012", projectName: "Dosari Hotel", client: "Layla Al-Dosari", rating: 3, category: "Quotation Process", comment: "The quotation process took longer than expected. We had to follow up multiple times. Once started, the work quality has been acceptable.", date: "2024-04-08", sentiment: "neutral", responded: false },
];

export const satisfactionMetrics = {
  averageRating: 3.9,
  nps: 52,
  responseRate: 78,
  categories: [
    { name: "Overall Satisfaction", score: 4.1 },
    { name: "Communication", score: 3.8 },
    { name: "Technical Quality", score: 4.3 },
    { name: "Timeline", score: 3.5 },
    { name: "Value for Money", score: 4.0 },
    { name: "After-Sales Support", score: 3.6 },
  ],
  monthlyTrend: [
    { month: "Oct 23", score: 3.7 },
    { month: "Nov 23", score: 4.0 },
    { month: "Dec 23", score: 4.2 },
    { month: "Jan 24", score: 3.8 },
    { month: "Feb 24", score: 4.1 },
    { month: "Mar 24", score: 4.3 },
    { month: "Apr 24", score: 3.9 },
  ],
};
