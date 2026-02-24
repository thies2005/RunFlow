#!/usr/bin/env node
/**
 * Converts BLS 4.0 2025 German food database from XLSX to a compact JSON file.
 * Usage: node scripts/convert-bls.js
 * 
 * Input:  ../data/bls/BLS_4_0_Daten_2025_DE.xlsx
 * Output: src/lib/data/bls-foods.json
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Column indices in the XLSX file (0-based)
const COL = {
    CODE: 0,        // BLS Code
    NAME_DE: 1,     // Lebensmittelbezeichnung
    NAME_EN: 2,     // Food name
    CALORIES: 6,    // ENERCC Energie (kcal/100g)
    PROTEIN: 12,    // PROT625 Protein (g/100g)
    FATS: 15,       // FAT Fett (g/100g)
    CARBS: 18,      // CHO Kohlenhydrate (g/100g)
    FIBER: 21,      // FIBT Ballaststoffe (g/100g)
    SODIUM: 123,    // NA Natrium (mg/100g)
    POTASSIUM: 129, // K Kalium (mg/100g)
    CALCIUM: 132,   // CA Calcium (mg/100g)
    IRON: 144,      // FE Eisen (mg/100g)
    SUGAR: 219,     // SUGAR Zucker (g/100g)
    SAT_FAT: 246,   // FASAT Fettsäuren gesättigt (g/100g)
    CHOLESTEROL: 354 // CHORL Cholesterin (mg/100g)
};

const inputPath = path.resolve(__dirname, '../../data/bls/BLS_4_0_Daten_2025_DE.xlsx');
const outputPath = path.resolve(__dirname, '../src/lib/data/bls-foods.json');

console.log('Reading BLS XLSX file...');
const wb = XLSX.readFile(inputPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log(`Total rows (including header): ${rawData.length}`);

// Skip header row (index 0)
const foods = [];
for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[COL.CODE] || !row[COL.NAME_DE]) continue;

    const parseNum = (val) => {
        if (val === null || val === undefined || val === '' || val === '-') return 0;
        const n = parseFloat(val);
        return isNaN(n) ? 0 : Math.round(n * 100) / 100; // 2 decimal places
    };

    foods.push({
        code: String(row[COL.CODE]).trim(),
        name_de: String(row[COL.NAME_DE]).trim(),
        name_en: row[COL.NAME_EN] ? String(row[COL.NAME_EN]).trim() : '',
        calories: parseNum(row[COL.CALORIES]),
        protein: parseNum(row[COL.PROTEIN]),
        carbs: parseNum(row[COL.CARBS]),
        fats: parseNum(row[COL.FATS]),
        fiber: parseNum(row[COL.FIBER]),
        sugar: parseNum(row[COL.SUGAR]),
        saturatedFat: parseNum(row[COL.SAT_FAT]),
        sodium: parseNum(row[COL.SODIUM]),
        potassium: parseNum(row[COL.POTASSIUM]),
        calcium: parseNum(row[COL.CALCIUM]),
        iron: parseNum(row[COL.IRON]),
        cholesterol: parseNum(row[COL.CHOLESTEROL]),
    });
}

console.log(`Converted ${foods.length} food items`);

// Write output
fs.writeFileSync(outputPath, JSON.stringify(foods), 'utf-8');

const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
console.log(`Written to ${outputPath} (${sizeKB} KB)`);
