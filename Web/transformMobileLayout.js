const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/mobile-layout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add hook import
content = content.replace(
    /import \{ SettingsModal, EditWorkoutModal \} from '@\/components';/,
    `import { SettingsModal, EditWorkoutModal } from '@/components';
import { useAnalyticsMetrics } from '@/hooks/useAnalyticsMetrics';`
);

// 2. Remove unused imports
content = content.replace(/import \{ calculateEffectiveVO2max \} from '@\/lib\/metrics\/runalyze';\n/, '');
content = content.replace(/import \{\n    calculatePredictedTimes,\n\} from '@\/lib\/metrics\/runalyze';\n/, '');
content = content.replace(/import \{ calculateTrainingPaces \} from '@\/lib\/metrics\/vdot';\n/, '');

// 3. Replace the massive useMemo block
const startString = '    // Analytics calculated data\n    const analyticsMetrics = useMemo(() => {';
const endString = '    }, [activitiesData, goalsData, statsData, historyData, userData]);';

const startIndex = content.indexOf(startString);
const endIndex = content.indexOf(endString, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const hookUsage = `    // Analytics calculated data
    const analyticsMetrics = useAnalyticsMetrics(
        activitiesData,
        goalsData,
        statsData,
        historyData,
        userData
    );`;

    content = content.substring(0, startIndex) + hookUsage + content.substring(endIndex + endString.length);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully transformed mobile-layout.tsx');
