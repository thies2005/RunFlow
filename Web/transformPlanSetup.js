const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/PlanSetupForm.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
content = content.replace(
    /import {[\s\S]*?calculateProjectedGoalTime,[\s\S]*?type PlanSettings[\s\S]*?} from '@\/lib\/metrics\/goalProjection';/,
    match => match + `\nimport TargetRaceSection from './setup/TargetRaceSection';\nimport CalibrationSection from './setup/CalibrationSection';\nimport GoalTimeRenderer from './setup/GoalTimeRenderer';\nimport PlanVolumeSection from './setup/PlanVolumeSection';\nimport HeartRateZonesSection from './setup/HeartRateZonesSection';\n`
);

// 2. Remove formatActivityOption
content = content.replace(
    /const formatActivityOption = \([\s\S]*?return \`\$\{activity\.name\}.*?\`;\n    \};/,
    ''
);

// 3. Replace JSX from {/* Target Race - Onboarding Mode */} up to {/* Message */}
const startMarker = '{/* Target Race - Onboarding Mode */}';
const endMarker = '{/* Message */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex);
    const after = content.substring(endIndex);

    const replacement = `<TargetRaceSection 
                mode={mode}
                goalName={goalName}
                setGoalName={setGoalName}
                raceType={raceType}
                setRaceType={setRaceType}
                raceDate={raceDate}
                setRaceDate={setRaceDate}
                planStartDate={planStartDate}
                setPlanStartDate={setPlanStartDate}
                formErrors={formErrors}
            />

            <CalibrationSection 
                calibrationMode={calibrationMode}
                setCalibrationMode={setCalibrationMode}
                selectedActivityId={selectedActivityId}
                setSelectedActivityId={setSelectedActivityId}
                calibrationDistance={calibrationDistance}
                setCalibrationDistance={setCalibrationDistance}
                hours={hours}
                setHours={setHours}
                minutes={minutes}
                setMinutes={setMinutes}
                seconds={seconds}
                setSeconds={setSeconds}
                calibrationFactor={calibrationFactor}
                setCalibrationFactor={setCalibrationFactor}
                effectiveVO2max={effectiveVO2max}
                raceActivities={raceActivities}
            />

            <GoalTimeRenderer 
                mode={mode}
                effectiveVO2max={effectiveVO2max}
                calibrationFactor={calibrationFactor}
                raceType={raceType}
                computedPlanWeeks={computedPlanWeeks}
                runsPerWeek={runsPerWeek}
                weeklyMileage={weeklyMileage}
                taperWeeks={taperWeeks}
                peakWeeks={peakWeeks}
                buildWeeks={buildWeeks}
                shapePercent={shapePercent}
                goalTimeSeconds={goalTimeSeconds}
                setGoalTimeSeconds={setGoalTimeSeconds}
                goalTimeHours={goalTimeHours}
                setGoalTimeHours={setGoalTimeHours}
                goalTimeMinutes={goalTimeMinutes}
                setGoalTimeMinutes={setGoalTimeMinutes}
                goalTimeSecs={goalTimeSecs}
                setGoalTimeSecs={setGoalTimeSecs}
                isEditingGoalTime={isEditingGoalTime}
                setIsEditingGoalTime={setIsEditingGoalTime}
            />

            <PlanVolumeSection 
                runsPerWeek={runsPerWeek}
                setRunsPerWeek={setRunsPerWeek}
                ridesPerWeek={ridesPerWeek}
                setRidesPerWeek={setRidesPerWeek}
                swimsPerWeek={swimsPerWeek}
                setSwimsPerWeek={setSwimsPerWeek}
                strengthPerWeek={strengthPerWeek}
                setStrengthPerWeek={setStrengthPerWeek}
                weeklyMileage={weeklyMileage}
                setWeeklyMileage={setWeeklyMileage}
                taperWeeks={taperWeeks}
                setTaperWeeks={setTaperWeeks}
                peakWeeks={peakWeeks}
                setPeakWeeks={setPeakWeeks}
                buildWeeks={buildWeeks}
                setBuildWeeks={setBuildWeeks}
                showSchedulingSettings={showSchedulingSettings}
                setShowSchedulingSettings={setShowSchedulingSettings}
                longRunDay={longRunDay}
                setLongRunDay={setLongRunDay}
                qualityDay={qualityDay}
                setQualityDay={setQualityDay}
                restDays={restDays}
                setRestDays={setRestDays}
            />

            <HeartRateZonesSection 
                showHeartRate={showHeartRate}
                setShowHeartRate={setShowHeartRate}
                maxHeartRate={maxHeartRate}
                setMaxHeartRate={setMaxHeartRate}
                restingHeartRate={restingHeartRate}
                setRestingHeartRate={setRestingHeartRate}
                weight={weight}
                setWeight={setWeight}
                thresholdHR={thresholdHR}
                setThresholdHR={setThresholdHR}
                thresholdPaceMin={thresholdPaceMin}
                setThresholdPaceMin={setThresholdPaceMin}
                thresholdPaceSec={thresholdPaceSec}
                setThresholdPaceSec={setThresholdPaceSec}
                calculatedZones={calculatedZones}
                zone1Max={zone1Max}
                setZone1Max={setZone1Max}
                zone2Max={zone2Max}
                setZone2Max={setZone2Max}
                zone3Max={zone3Max}
                setZone3Max={setZone3Max}
                zone4Max={zone4Max}
                setZone4Max={setZone4Max}
                zone5Max={zone5Max}
                setZone5Max={setZone5Max}
                zone6Max={zone6Max}
                setZone6Max={setZone6Max}
            />

            `;

    content = before + replacement + after;
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully replaced JSX blocks in PlanSetupForm.tsx');
} else {
    console.error('Could not find start or end markers');
}
