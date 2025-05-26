import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export interface QueryResult {
    success: boolean;
    arrowPath?: string;
    rowCount?: number;
    error?: string;
    executionTime?: number;
}

export class DuckDBExecutor {
    private duckdbPath: string;
    private tempFiles: Set<string> = new Set();
    
    constructor() {
        this.duckdbPath = this.findDuckDBBinary();
    }
    
    private findDuckDBBinary(): string {
        return 'duckdb';
    }
    
    private generateTempPath(): string {
        const tempDir = os.tmpdir();
        const fileName = `sidequery_arrow_${Date.now()}_${Math.random().toString(36).substring(7)}.arrow`;
        return path.join(tempDir, fileName);
    }
    
    async executeQuery(sql: string, dbPath: string = ':memory:'): Promise<QueryResult> {
        const startTime = Date.now();
        const arrowPath = this.generateTempPath();
        this.tempFiles.add(arrowPath);
        
        return new Promise((resolve) => {
            // First, we need to check if this is a SELECT query or not
            const trimmedSql = sql.trim().toUpperCase();
            const isSelectQuery = trimmedSql.startsWith('SELECT') || 
                                trimmedSql.startsWith('WITH') ||
                                trimmedSql.startsWith('TABLE') ||
                                trimmedSql.startsWith('VALUES');
            
            let fullQuery: string;
            
            if (isSelectQuery) {
                // For SELECT queries, wrap in COPY TO to export as Arrow
                fullQuery = `
                    INSTALL arrow FROM community;
                    LOAD arrow;
                    COPY (${sql}) TO '${arrowPath}' (FORMAT ARROWS);
                    SELECT COUNT(*) as row_count FROM read_arrow('${arrowPath}');
                `;
            } else {
                // For non-SELECT queries (DDL, DML), just execute them
                fullQuery = `
                    INSTALL arrow FROM community;
                    LOAD arrow;
                    ${sql};
                    SELECT 0 as row_count;
                `;
            }
            
            const args = [dbPath, '-json', '-c', fullQuery];
            const duckdb = spawn(this.duckdbPath, args);
            
            let stdout = '';
            let stderr = '';
            
            duckdb.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            duckdb.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            duckdb.on('close', (code) => {
                const executionTime = Date.now() - startTime;
                
                if (code !== 0) {
                    // Clean up temp file on error
                    this.cleanupTempFile(arrowPath);
                    
                    resolve({
                        success: false,
                        error: stderr || 'Unknown error occurred',
                        executionTime
                    });
                    return;
                }
                
                try {
                    if (isSelectQuery) {
                        // Parse the row count from the output
                        const lines = stdout.trim().split('\n').filter(line => line.trim());
                        const lastLine = lines[lines.length - 1];
                        
                        let rowCount = 0;
                        if (lastLine) {
                            try {
                                const parsed = JSON.parse(lastLine);
                                // DuckDB returns an array with one object
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                    rowCount = parsed[0].row_count || 0;
                                } else if (parsed.row_count !== undefined) {
                                    rowCount = parsed.row_count;
                                }
                            } catch (e) {
                                // If parsing fails, check if file exists
                                if (fs.existsSync(arrowPath)) {
                                    rowCount = -1; // Unknown count, but file exists
                                }
                            }
                        }
                        
                        resolve({
                            success: true,
                            arrowPath: fs.existsSync(arrowPath) ? arrowPath : undefined,
                            rowCount,
                            executionTime
                        });
                    } else {
                        // For non-SELECT queries, no Arrow file is created
                        resolve({
                            success: true,
                            executionTime
                        });
                    }
                } catch (error) {
                    this.cleanupTempFile(arrowPath);
                    resolve({
                        success: false,
                        error: `Failed to process query result: ${error}`,
                        executionTime
                    });
                }
            });
            
            duckdb.on('error', (error) => {
                this.cleanupTempFile(arrowPath);
                resolve({
                    success: false,
                    error: `Failed to execute DuckDB: ${error.message}`,
                    executionTime: Date.now() - startTime
                });
            });
        });
    }
    
    private cleanupTempFile(filePath: string): void {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            this.tempFiles.delete(filePath);
        } catch (error) {
            console.error('Failed to cleanup temp file:', error);
        }
    }
    
    cleanup(): void {
        for (const tempFile of this.tempFiles) {
            this.cleanupTempFile(tempFile);
        }
    }
}