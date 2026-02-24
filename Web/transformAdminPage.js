const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports to the top
const importStatement = `
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import AiSettingsTab from '@/components/admin/AiSettingsTab';
import UsersTab from '@/components/admin/UsersTab';
import BackupsTab from '@/components/admin/BackupsTab';
`;

content = content.replace(
    /import \{ BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer \} from 'recharts';/,
    importStatement
);

// 2. Remove AnalyticsTab and AiSettingsTab + ProviderForm blocks
// We need to cut out everything from `// Analytics Tab Component` up to `// Components` where `StatCard` is defined.
const componentsIndex = content.indexOf('// Components');
const analyticsIndex = content.indexOf('// Analytics Tab Component');

if (analyticsIndex !== -1 && componentsIndex !== -1) {
    content = content.substring(0, analyticsIndex) + content.substring(componentsIndex);
}

// 3. Remove handler functions from DashboardContent
const handlersToRemove = [
    'const handleResetPassword',
    'const handleRecalculateFitness',
    'const handleDeleteUser',
    'const handleToggleAi',
    'const handleUploadBackup',
    'const handleBackupAction'
];

for (const handler of handlersToRemove) {
    const startIndex = content.indexOf(handler);
    if (startIndex !== -1) {
        // Find the boundary to the next definition or the 'if (loading && !stats)' block
        let endIndex = content.indexOf('const handle', startIndex + 10);
        if (endIndex === -1) {
            endIndex = content.indexOf('if (loading && !stats)', startIndex);
        }
        if (endIndex !== -1) {
            content = content.substring(0, startIndex) + content.substring(endIndex);
        }
    }
}

// 4. Replace Users Tab Render
const usersTabStart = '{/* Users Tab */}';
const usersTabEnd = '{/* Backups Tab */}';

const uiTabStartIndex = content.indexOf(usersTabStart);
const uiTabEndIndex = content.indexOf(usersTabEnd);

if (uiTabStartIndex !== -1 && uiTabEndIndex !== -1) {
    content = content.substring(0, uiTabStartIndex) +
        `                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <UsersTab
                            users={users}
                            setUsers={setUsers}
                            aiSettings={aiSettings}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                            fetchAllData={fetchAllData}
                        />
                    )}

                    ` + content.substring(uiTabEndIndex);
}

// 5. Replace Backups Tab Render
const backupsTabStart = '{/* Backups Tab */}';
const backupsTabEnd = '{/* AI Settings Tab */}';

const biTabStartIndex = content.indexOf(backupsTabStart);
const biTabEndIndex = content.indexOf(backupsTabEnd);

if (biTabStartIndex !== -1 && biTabEndIndex !== -1) {
    content = content.substring(0, biTabStartIndex) +
        `                    {/* Backups Tab */}
                    {activeTab === 'backups' && (
                        <BackupsTab
                            backups={backups}
                            processing={processing}
                            setProcessing={setProcessing}
                            setActionMessage={setActionMessage}
                            fetchAllData={fetchAllData}
                        />
                    )}

                    ` + content.substring(biTabEndIndex);
}


fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully replaced JSX blocks and handlers in admin/page.tsx');
