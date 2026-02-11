
export interface PromptTemplate {
    title: string;
    text: string;
}

export interface PromptCategory {
    category: string;
    prompts: PromptTemplate[];
}

export const PROMPT_LIBRARY: PromptCategory[] = [
    {
        category: "Training Analysis",
        prompts: [
            {
                title: "Analyze Last Run",
                text: "Analyze my last run in detail. What did I do well, and what could I improve? Focus on my pacing and heart rate.",
            },
            {
                title: "Weekly Progress",
                text: "Review my training over the last week. Am I progressive overload correctly? How is my training volume compared to last month?",
            },
            {
                title: "Explain VDOT",
                text: "Based on my recent activities, what is my estimated VDOT and what does that mean for my training paces?",
            },
        ],
    },
    {
        category: "Race Prep",
        prompts: [
            {
                title: "Marathon Strategy",
                text: "I'm training for a marathon. Based on my long runs, what would be a realistic goal time and pacing strategy?",
            },
            {
                title: "Tapering Advice",
                text: "I have a race coming up in 2 weeks. How should I taper my training to be peaked for race day?",
            },
            {
                title: "Race Fueling",
                text: "Create a fueling plan for my upcoming half marathon. How many carbs should I take in per hour?",
            },
        ],
    },
    {
        category: "Recovery & Health",
        prompts: [
            {
                title: "High Heart Rate",
                text: "My heart rate seemed higher than usual on my last easy run. What could be the causes and should I be worried?",
            },
            {
                title: "Recovery Tips",
                text: "I'm feeling sore after yesterday's intervals. What are the best active recovery strategies I can do today?",
            },
            {
                title: "Returning from Injury",
                text: "I'm coming back from a minor injury. How should I structure my return to running to avoid re-injury?",
            },
        ],
    },
    {
        category: "Nutrition",
        prompts: [
            {
                title: "Pre-Run Meal",
                text: "What should I eat before a long run? Give me some examples of good breakfasts 2 hours before running.",
            },
            {
                title: "Daily Macros",
                text: "As a runner running about 40km per week, what should my macronutrient breakdown look like?",
            },
        ],
    },
];
