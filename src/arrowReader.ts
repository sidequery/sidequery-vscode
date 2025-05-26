import { Table, tableFromIPC } from 'apache-arrow';
import * as fs from 'fs';

export interface ArrowData {
    columns: string[];
    rows: any[];
    rowCount: number;
}

export async function readArrowFile(filePath: string): Promise<ArrowData> {
    try {
        const arrowBuffer = await fs.promises.readFile(filePath);
        const table = tableFromIPC(arrowBuffer);
        
        // Get column names
        const columns = table.schema.fields.map(field => field.name);
        
        // Convert to row-based format for easier rendering
        const rows: any[] = [];
        const rowCount = table.numRows;
        
        for (let i = 0; i < rowCount; i++) {
            const row: any = {};
            for (const field of table.schema.fields) {
                const column = table.getChild(field.name);
                if (column) {
                    let value = column.get(i);
                    
                    // Convert values to JSON-serializable formats
                    if (value !== null && value !== undefined) {
                        // Handle BigInt
                        if (typeof value === 'bigint') {
                            // Convert to number if safe, otherwise to string
                            if (value >= Number.MIN_SAFE_INTEGER && value <= Number.MAX_SAFE_INTEGER) {
                                value = Number(value);
                            } else {
                                value = value.toString();
                            }
                        }
                        // Handle Decimal128 and other numeric objects
                        else if (typeof value === 'object' && value.constructor) {
                            const typeName = value.constructor.name;
                            
                            // Handle typed arrays (Uint32Array, Int32Array, etc.)
                            if (typeName.includes('Array') && 'length' in value) {
                                // For single-element arrays, extract the value
                                if (value.length === 1) {
                                    value = value[0];
                                } else if (value.length === 4 && typeName === 'Uint32Array') {
                                    // This might be a Decimal128 representation
                                    // Try to get a reasonable numeric value
                                    const strValue = value.toString();
                                    const numValue = parseFloat(strValue);
                                    value = isNaN(numValue) ? strValue : numValue;
                                } else if (value.toString) {
                                    // For other arrays, use toString
                                    const strValue = value.toString();
                                    const numValue = parseFloat(strValue);
                                    value = isNaN(numValue) ? strValue : numValue;
                                }
                            }
                            // Handle Decimal type objects
                            else if (typeName === 'Decimal' || value.toString) {
                                const strValue = value.toString();
                                const numValue = parseFloat(strValue);
                                value = isNaN(numValue) ? strValue : numValue;
                            }
                        }
                        // Handle Date objects
                        else if (value instanceof Date) {
                            value = value.toISOString();
                        }
                    }
                    
                    row[field.name] = value;
                }
            }
            rows.push(row);
        }
        
        return {
            columns,
            rows,
            rowCount
        };
    } catch (error) {
        throw new Error(`Failed to read Arrow file: ${error}`);
    }
}