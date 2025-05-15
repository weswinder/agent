
import { Agent, ContextMessage, Message, Thread, User } from "../types";
import { format } from "date-fns";

// Helper to generate dates
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
};

export const users: User[] = [
  { id: "user1", name: "John Doe" },
  { id: "user2", name: "Jane Smith" },
  { id: "user3", name: "Robert Johnson" },
];

export const agents: Agent[] = [
  { id: "agent1", name: "Assistant" },
  { id: "agent2", name: "Coder" },
  { id: "agent3", name: "Researcher" },
];

export const threads: Thread[] = [
  {
    id: "thread1",
    userId: "user1",
    title: "Help with coding project",
    subtitle: "JavaScript assistance",
    latestMessage: "I'll help you debug that function",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(0),
  },
  {
    id: "thread2",
    userId: "user1",
    title: "Research on AI ethics",
    subtitle: "Looking for papers",
    latestMessage: "Here are some resources on AI ethics",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },
  {
    id: "thread3",
    userId: "user2",
    title: "Product ideas",
    subtitle: "Brainstorming session",
    latestMessage: "Let's explore that idea further",
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },
];

export const messages: Record<string, Message[]> = {
  thread1: [
    {
      id: "msg1",
      threadId: "thread1",
      content: "I need help with a JavaScript function that's not working correctly.",
      role: "user",
      sender: "John Doe",
      timestamp: daysAgo(3),
      contentType: "text"
    },
    {
      id: "msg2",
      threadId: "thread1",
      content: "Sure, I can help you with that. Can you share the function code?",
      role: "agent",
      sender: "Assistant",
      timestamp: daysAgo(3),
      generationTime: 1.2,
      contentType: "text"
    },
    {
      id: "msg3",
      threadId: "thread1",
      content: "Here's the function:\n```javascript\nfunction calculateTotal(items) {\n  let total = 0;\n  items.forEach(item => {\n    total += item.price;\n  });\n  return total;\n}\n```\nBut it's not handling discounts.",
      role: "user",
      sender: "John Doe",
      timestamp: daysAgo(2),
      contentType: "text"
    },
    {
      id: "msg4",
      threadId: "thread1",
      content: "I see the issue. Let me modify the function to handle discounts.",
      role: "agent",
      sender: "Coder",
      timestamp: daysAgo(2),
      generationTime: 2.5,
      contentType: "text",
      toolCalls: [
        {
          id: "toolcall1",
          type: "function",
          name: "improveCode",
          args: {
            code: "function calculateTotal(items) {\n  let total = 0;\n  items.forEach(item => {\n    total += item.price;\n  });\n  return total;\n}",
            language: "javascript"
          },
          returnValue: "function calculateTotal(items) {\n  let total = 0;\n  items.forEach(item => {\n    const discountedPrice = item.discount ? item.price * (1 - item.discount) : item.price;\n    total += discountedPrice;\n  });\n  return total;\n}"
        }
      ]
    },
    {
      id: "msg5",
      threadId: "thread1",
      content: "Thanks! That looks much better. Can you explain how the discount calculation works?",
      role: "user",
      sender: "John Doe",
      timestamp: daysAgo(1),
      contentType: "text"
    },
    {
      id: "msg6",
      threadId: "thread1",
      content: "The discount calculation works by checking if an item has a discount property. If it does, it calculates the discounted price as the original price multiplied by (1 - discount). For example, if an item costs $100 and has a 0.2 (20%) discount, the discounted price would be $100 * (1 - 0.2) = $80.",
      role: "agent",
      sender: "Coder",
      timestamp: daysAgo(0),
      generationTime: 1.8,
      contentType: "text"
    },
  ],
  thread2: [
    {
      id: "msg7",
      threadId: "thread2",
      content: "I'm looking for recent papers on AI ethics, particularly related to language models.",
      role: "user",
      sender: "John Doe",
      timestamp: daysAgo(5),
      contentType: "text"
    },
    {
      id: "msg8",
      threadId: "thread2",
      content: "I'll search for recent papers on AI ethics related to language models.",
      role: "agent",
      sender: "Researcher",
      timestamp: daysAgo(5),
      generationTime: 3.2,
      contentType: "text",
      toolCalls: [
        {
          id: "toolcall2",
          type: "function",
          name: "searchPapers",
          args: {
            query: "AI ethics language models recent",
            maxResults: 5
          },
          returnValue: [
            { title: "Ethical Considerations in Large Language Models", authors: "Smith et al.", year: 2023 },
            { title: "Mitigating Harm in Language Models: A Framework", authors: "Johnson et al.", year: 2023 },
            { title: "Transparency and Accountability in AI Systems", authors: "Lee et al.", year: 2022 }
          ]
        }
      ]
    },
    {
      id: "msg9",
      threadId: "thread2",
      content: "Here are some recent papers on AI ethics related to language models:\n\n1. 'Ethical Considerations in Large Language Models' by Smith et al. (2023)\n2. 'Mitigating Harm in Language Models: A Framework' by Johnson et al. (2023)\n3. 'Transparency and Accountability in AI Systems' by Lee et al. (2022)\n\nWould you like me to summarize any of these?",
      role: "agent",
      sender: "Researcher",
      timestamp: daysAgo(4),
      generationTime: 2.1,
      contentType: "text"
    },
    {
      id: "msg10",
      threadId: "thread2",
      content: "Yes, please summarize the first one about ethical considerations.",
      role: "user",
      sender: "John Doe",
      timestamp: daysAgo(3),
      contentType: "text"
    },
    {
      id: "msg11",
      threadId: "thread2",
      content: "Here's a summary of 'Ethical Considerations in Large Language Models':\n\nThis 2023 paper by Smith et al. explores the ethical challenges posed by large language models. The authors identify five key areas of concern: bias and fairness, privacy, transparency, accountability, and environmental impact. They propose a framework for evaluating these systems and suggest concrete steps that developers can take to mitigate potential harms. The paper emphasizes the importance of diverse stakeholder involvement in setting ethical standards for AI development.",
      role: "agent",
      sender: "Researcher",
      timestamp: daysAgo(2),
      generationTime: 4.5,
      contentType: "text"
    },
  ],
  thread3: [
    {
      id: "msg12",
      threadId: "thread3",
      content: "I'm thinking about starting a new tech business. Can you help me brainstorm some ideas?",
      role: "user",
      sender: "Jane Smith",
      timestamp: daysAgo(1),
      contentType: "text"
    },
    {
      id: "msg13",
      threadId: "thread3",
      content: "I'd be happy to help you brainstorm tech business ideas! Let me suggest a few innovative concepts based on current trends:",
      role: "agent",
      sender: "Assistant",
      timestamp: daysAgo(1),
      generationTime: 2.8,
      contentType: "text"
    },
    {
      id: "msg14",
      threadId: "thread3",
      content: "1. AI-Powered Personal Health Assistant: An app that uses AI to analyze health data from wearables and provides personalized health recommendations.\n\n2. Sustainable Smart Home Platform: A system that optimizes energy usage in homes using AI and IoT devices.\n\n3. AR Learning Experiences: Educational content delivered through augmented reality for immersive learning.\n\n4. Remote Collaboration Tools: Advanced virtual workspace solutions for distributed teams.\n\n5. Privacy-Focused Social Network: A social platform that prioritizes user privacy and data ownership.\n\nWould you like me to elaborate on any of these ideas?",
      role: "agent",
      sender: "Assistant",
      timestamp: daysAgo(1),
      generationTime: 3.2,
      contentType: "text"
    },
    {
      id: "msg15",
      threadId: "thread3",
      content: "The health assistant idea sounds interesting. Can you elaborate on that one?",
      role: "user",
      sender: "Jane Smith",
      timestamp: daysAgo(0),
      contentType: "text"
    },
    {
      id: "msg16",
      threadId: "thread3",
      content: "Here's a mockup of how the AI health assistant app might look:",
      role: "agent",
      sender: "Assistant",
      timestamp: daysAgo(0),
      generationTime: 5.1,
      contentType: "image",
      imageUrl: "https://via.placeholder.com/400x600?text=Health+App+Mockup"
    },
    {
      id: "msg17",
      threadId: "thread3",
      content: "The AI-Powered Personal Health Assistant would work like this:\n\n1. Data Collection: The app connects to wearables (smartwatches, fitness trackers) and other health devices to collect data on activity levels, heart rate, sleep patterns, etc.\n\n2. AI Analysis: The system uses machine learning to analyze patterns in the user's health data and identify correlations and potential areas for improvement.\n\n3. Personalized Recommendations: Based on the analysis, the app provides tailored recommendations for exercise, nutrition, sleep, and other wellness activities.\n\n4. Proactive Monitoring: The AI continuously monitors for unusual patterns that might indicate health issues and alerts the user when necessary.\n\n5. Integration with Healthcare: Option to share data with healthcare providers for more comprehensive care.\n\n6. Privacy-First Approach: All health data is encrypted and stored locally when possible, with strict controls on what data leaves the device.\n\nThe business model could include a freemium approach with basic features available for free and advanced analysis and recommendations available through subscription.",
      role: "agent",
      sender: "Assistant",
      timestamp: daysAgo(0),
      generationTime: 4.7,
      contentType: "text"
    },
  ]
};

export const contextMessages: ContextMessage[] = [
  {
    id: "ctx1",
    content: "Ethical considerations are a priority when developing AI systems.",
    vectorSearchRank: 1,
    textSearchRank: 3
  },
  {
    id: "ctx2",
    content: "Language models should be designed to minimize harmful outputs.",
    vectorSearchRank: 2
  },
  {
    id: "ctx3",
    content: "Privacy concerns must be addressed in data collection practices.",
    vectorSearchRank: 3,
    textSearchRank: 1
  },
  {
    id: "ctx4",
    content: "Transparency in AI systems builds user trust.",
    textSearchRank: 2
  },
  {
    id: "ctx5",
    content: "Diverse training data helps reduce bias in model outputs.",
    vectorSearchRank: 4
  }
];
