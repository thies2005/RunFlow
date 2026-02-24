import blsFoodsData from './bls-foods.json';

export interface BLSFoodItem {
    code: string;
    name_de: string;
    name_en: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
    potassium: number;
    calcium: number;
    iron: number;
    cholesterol: number;
}

// Cache the loaded data in module scope
const blsFoods: BLSFoodItem[] = blsFoodsData as BLSFoodItem[];

/**
 * Score a food item against a search query for relevance ranking.
 */
function scoreMatch(name: string, query: string): number {
    const lowerName = name.toLowerCase();
    const lowerQuery = query.toLowerCase();

    if (lowerName === lowerQuery) return 100;                    // Exact match
    if (lowerName.startsWith(lowerQuery)) return 80;             // Starts with
    // Word boundary match – query appears after a space/comma
    const wordBoundaryRegex = new RegExp(`(?:^|[\\s,;(])${escapeRegex(lowerQuery)}`, 'i');
    if (wordBoundaryRegex.test(lowerName)) return 60;
    if (lowerName.includes(lowerQuery)) return 40;               // Substring
    return 0;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search the BLS food database by query string.
 * Searches both German and English names, returns results ranked by relevance.
 */
export function searchBLS(query: string, limit: number = 15): Array<{
    id: string;
    name: string;
    brand: string;
    barcode: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
    sugar: number;
    saturatedFat: number;
    sodium: number;
    potassium: number;
    calcium: number;
    iron: number;
    cholesterol: number;
    servingSize: string;
    source: string;
}> {
    if (!query || query.trim().length === 0) return [];

    const normalizedQuery = query.trim().toLowerCase();

    // Split multi-word queries for better matching
    const queryWords = normalizedQuery.split(/\s+/);

    const scored: Array<{ food: BLSFoodItem; score: number }> = [];

    for (const food of blsFoods) {
        // Score against both German and English names
        const scoreDe = scoreMatch(food.name_de, normalizedQuery);
        const scoreEn = scoreMatch(food.name_en, normalizedQuery);
        let bestScore = Math.max(scoreDe, scoreEn);

        // Multi-word matching: if all words appear in the name, give a bonus
        if (bestScore === 0 && queryWords.length > 1) {
            const allWordsMatchDe = queryWords.every(w => food.name_de.toLowerCase().includes(w));
            const allWordsMatchEn = queryWords.every(w => food.name_en.toLowerCase().includes(w));
            if (allWordsMatchDe || allWordsMatchEn) {
                bestScore = 30; // All words found but not as contiguous substring
            }
        }

        if (bestScore > 0) {
            scored.push({ food, score: bestScore });
        }
    }

    // Sort by score descending, then alphabetically
    scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.food.name_de.localeCompare(b.food.name_de);
    });

    return scored.slice(0, limit).map(({ food }) => ({
        id: `bls-${food.code}`,
        name: food.name_de,
        brand: 'BLS',
        barcode: null,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fats: food.fats,
        fiber: food.fiber,
        sugar: food.sugar,
        saturatedFat: food.saturatedFat,
        sodium: food.sodium,
        potassium: food.potassium,
        calcium: food.calcium,
        iron: food.iron,
        cholesterol: food.cholesterol,
        servingSize: '100g',
        source: 'bls',
    }));
}
