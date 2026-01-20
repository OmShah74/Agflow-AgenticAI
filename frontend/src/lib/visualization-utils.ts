import Papa from 'papaparse';
import { DataPoint, Dataset } from '@/types/visualization';

/**
 * Parse CSV data into a structured dataset
 */
export function parseCSV(csvText: string, name: string = 'Dataset'): Dataset {
    const result = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    const data = result.data as DataPoint[];
    const columns = result.meta.fields || [];

    return {
        name,
        data,
        columns,
    };
}

/**
 * Parse JSON data into a structured dataset
 */
export function parseJSON(jsonText: string, name: string = 'Dataset'): Dataset {
    try {
        const parsed = JSON.parse(jsonText);
        const data = Array.isArray(parsed) ? parsed : [parsed];
        const columns = data.length > 0 ? Object.keys(data[0]) : [];

        return {
            name,
            data,
            columns,
        };
    } catch (error) {
        throw new Error('Invalid JSON format');
    }
}

/**
 * Validate dataset structure
 */
export function validateDataset(dataset: Dataset): boolean {
    if (!dataset.data || dataset.data.length === 0) {
        return false;
    }
    if (!dataset.columns || dataset.columns.length === 0) {
        return false;
    }
    return true;
}

/**
 * Generate color palette for charts
 */
export function generateColorPalette(count: number): string[] {
    const baseColors = [
        '#0ea5e9', // primary blue
        '#a855f7', // purple
        '#ec4899', // pink
        '#f97316', // orange
        '#10b981', // green
        '#eab308', // yellow
        '#06b6d4', // cyan
        '#8b5cf6', // violet
    ];

    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
}

/**
 * Get numeric columns from dataset
 */
export function getNumericColumns(dataset: Dataset): string[] {
    if (dataset.data.length === 0) return [];

    return dataset.columns.filter(col => {
        const value = dataset.data[0][col];
        return typeof value === 'number';
    });
}

/**
 * Get categorical columns from dataset
 */
export function getCategoricalColumns(dataset: Dataset): string[] {
    if (dataset.data.length === 0) return [];

    return dataset.columns.filter(col => {
        const value = dataset.data[0][col];
        return typeof value === 'string';
    });
}
