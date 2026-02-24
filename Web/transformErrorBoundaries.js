const fs = require('fs');
const path = require('path');

function wrapComponent(filePath, componentName, wrapperName, wrapperImport) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Add import statement at the top if not present
    if (!content.includes(wrapperImport)) {
        // Insert after first line ('use client'; or similar imports)
        const lines = content.split('\n');
        lines.splice(1, 0, wrapperImport);
        content = lines.join('\n');
    }

    // Replace the default export function
    // From: export default function ComponentName(props: Props) {
    // To: function ComponentName_Inner(props: Props) {
    // And add wrapper at the very bottom

    // Find where the default export is
    const exportRegex = new RegExp(\`export default function \${componentName}\\\\(([^)]*)\\\\) \\{\`, 'g');
    
    if (exportRegex.test(content)) {
        content = content.replace(exportRegex, \`function \${componentName}Inner($1) {\`);
        
        // Add wrapper export at the end
        const wrapperCode = wrapperName === 'ChartErrorBoundary' 
            ? \`\\nexport default function \${componentName}(props: any) {\\n    return (\\n        <\${wrapperName} chartName="\${componentName}">\\n            <\${componentName}Inner {...props} />\\n        </\${wrapperName}>\\n    );\\n}\\n\`
            : \`\\nexport default function \${componentName}(props: any) {\\n    return (\\n        <\${wrapperName} componentName="\${componentName}" showRetry>\\n            <\${componentName}Inner {...props} />\\n        </\${wrapperName}>\\n    );\\n}\\n\`;

        content += wrapperCode;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(\`Successfully wrapped \${componentName} in \${filePath}\`);
    } else {
        console.log(\`Could not find export for \${componentName} in \${filePath}\`);
        console.log(content.match(/export default function/g));
    }
}

// 1. AiChat
wrapComponent(
    path.join(__dirname, 'src/components/AiChat.tsx'),
    'AiChat',
    'ErrorBoundary',
    "import ErrorBoundary from '@/components/ErrorBoundary';"
);

// 2. AnalyticsDashboard
wrapComponent(
    path.join(__dirname, 'src/components/AnalyticsDashboard.tsx'),
    'AnalyticsDashboard',
    'ChartErrorBoundary',
    "import { ChartErrorBoundary } from '@/components/ErrorBoundary';"
);

// 3. InteractiveStreamsChart
wrapComponent(
    path.join(__dirname, 'src/components/InteractiveStreamsChart.tsx'),
    'InteractiveStreamsChart',
    'ChartErrorBoundary',
    "import { ChartErrorBoundary } from '@/components/ErrorBoundary';"
);
