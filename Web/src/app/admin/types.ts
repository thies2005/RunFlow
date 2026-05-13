export interface AdminStats {
    users: {
        total: number;
        newToday: number;
    };
    activities: {
        total: number;
        last7Days: number;
    };
    sessions: {
        total: number;
        active: number;
    };
    sync: {
        lastSyncAt: string | null;
    };
    backups: {
        count: number;
        lastBackupAt: string | null;
    };
    timestamp: string;
}

export interface AdminUserAiSettings {
    usageTier: string | null;
    adminAllowed: boolean;
    aiEnabled: boolean;
}

export interface AdminUser {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string;
    lastSyncAt: string | null;
    activityCount: number;
    aiSettings: AdminUserAiSettings | null;
}

export interface AdminBackup {
    name: string;
    size: number;
    sizeFormatted: string;
    createdAt: string;
    type: string;
}

export interface AdminAiSettingsData {
    defaultBaseUrl: string | null;
    hasDefaultApiKey: boolean;
    defaultModel: string | null;
    activeProviderId: string | null;
    fallbackProviderId: string | null;

    tier1Name: string;
    tier1DailyLimit: number;
    tier1MonthlyLimit: number;
    tier1DailyTokenLimit: number;
    tier1MonthlyTokenLimit: number;

    tier2Name: string;
    tier2DailyLimit: number;
    tier2MonthlyLimit: number;
    tier2DailyTokenLimit: number;
    tier2MonthlyTokenLimit: number;

    tier3Name: string;
    tier3DailyLimit: number;
    tier3MonthlyLimit: number;
    tier3DailyTokenLimit: number;
    tier3MonthlyTokenLimit: number;

    calorieSnapModel: string | null;
    tier1CalorieSnapLimit: number;
    tier2CalorieSnapLimit: number;
    tier3CalorieSnapLimit: number;

    mealSuggestModel: string | null;
    tier1MealSuggestLimit: number;
    tier2MealSuggestLimit: number;
    tier3MealSuggestLimit: number;

    activityFeedbackModel: string | null;
    tier1ActivityFeedbackLimit: number;
    tier2ActivityFeedbackLimit: number;
    tier3ActivityFeedbackLimit: number;

    dailyMessageLimit: number;
    monthlyMessageLimit: number;
    systemPrompt: string | null;

    planBuilderModel: string | null;
    planMaxTokensPerAnalysis: number;
}

export interface AdminAiSettings {
    settings: AdminAiSettingsData;
    stats: {
        totalUsers: number;
        enabledUsers: number;
        usersWithCustomKey: number;
    };
}

export interface MigrationResult {
    globalAiSettings: 'skipped' | 'created' | 'updated';
    providersCreated: number;
    providersUpdated: number;
    providersSkipped: number;
    warnings: string[];
}
