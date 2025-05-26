import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DuckDBExecutor } from './duckdbExecutor';
import { readArrowFile } from './arrowReader';

export class SqlNotebookController implements vscode.Disposable {
    readonly controllerId = 'sidequery-sql-controller';
    readonly notebookType = 'sql-notebook';
    readonly label = 'SQL (DuckDB)';
    readonly supportedLanguages = ['sql'];
    
    private readonly _controller: vscode.NotebookController;
    private readonly _executor: DuckDBExecutor;
    private _executionOrder = 0;
    private readonly _dbFiles = new Map<string, string>();
    private readonly _arrowFiles = new Set<string>();
    
    constructor() {
        this._executor = new DuckDBExecutor();
        this._controller = vscode.notebooks.createNotebookController(
            this.controllerId,
            this.notebookType,
            this.label
        );
        
        this._controller.supportedLanguages = this.supportedLanguages;
        this._controller.supportsExecutionOrder = true;
        this._controller.executeHandler = this._execute.bind(this);
        
        // Clean up database files when notebooks are closed
        vscode.workspace.onDidCloseNotebookDocument(this._onDidCloseNotebook, this);
    }
    
    private _onDidCloseNotebook(notebook: vscode.NotebookDocument) {
        if (notebook.notebookType === this.notebookType) {
            const key = notebook.uri.toString();
            const dbPath = this._dbFiles.get(key);
            if (dbPath) {
                try {
                    fs.unlinkSync(dbPath);
                } catch (error) {
                    // Ignore errors during cleanup
                }
                this._dbFiles.delete(key);
            }
        }
    }
    
    private _getDbPath(notebook: vscode.NotebookDocument): string {
        const key = notebook.uri.toString();
        if (!this._dbFiles.has(key)) {
            // Create a temporary database file for this notebook session
            const tempDir = os.tmpdir();
            const dbPath = path.join(tempDir, `sidequery_${Date.now()}_${Math.random().toString(36).substring(7)}.db`);
            this._dbFiles.set(key, dbPath);
        }
        return this._dbFiles.get(key)!;
    }
    
    private async _execute(
        cells: vscode.NotebookCell[],
        notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): Promise<void> {
        const dbPath = this._getDbPath(notebook);
        for (const cell of cells) {
            const execution = this._controller.createNotebookCellExecution(cell);
            execution.executionOrder = ++this._executionOrder;
            execution.start(Date.now());
            
            try {
                const sql = cell.document.getText();
                
                if (!sql.trim()) {
                    execution.replaceOutput([]);
                    execution.end(true, Date.now());
                    continue;
                }
                
                const result = await this._executor.executeQuery(sql, dbPath);
                
                if (result.success) {
                    if (result.arrowPath) {
                        // Read Arrow file and convert to table data
                        try {
                            const arrowData = await readArrowFile(result.arrowPath);
                            this._arrowFiles.add(result.arrowPath);
                            
                            const tableData = {
                                columns: arrowData.columns,
                                rows: arrowData.rows,
                                rowCount: arrowData.rowCount,
                                executionTime: result.executionTime
                            };
                            
                            execution.replaceOutput([
                                new vscode.NotebookCellOutput([
                                    vscode.NotebookCellOutputItem.json(tableData, 'x-application/sidequery-sql-result')
                                ])
                            ]);
                        } catch (error) {
                            execution.replaceOutput([
                                new vscode.NotebookCellOutput([
                                    vscode.NotebookCellOutputItem.error({
                                        name: 'ArrowReadError',
                                        message: error instanceof Error ? error.message : 'Failed to read Arrow data'
                                    })
                                ])
                            ]);
                            execution.end(false, Date.now());
                            return;
                        }
                    } else {
                        // Non-SELECT queries
                        execution.replaceOutput([
                            new vscode.NotebookCellOutput([
                                vscode.NotebookCellOutputItem.text(
                                    `Query executed successfully${result.executionTime ? ` in ${result.executionTime}ms` : ''}`
                                )
                            ])
                        ]);
                    }
                    execution.end(true, Date.now());
                } else {
                    execution.replaceOutput([
                        new vscode.NotebookCellOutput([
                            vscode.NotebookCellOutputItem.error({
                                name: 'QueryError',
                                message: result.error || 'Unknown error'
                            })
                        ])
                    ]);
                    execution.end(false, Date.now());
                }
            } catch (error) {
                execution.replaceOutput([
                    new vscode.NotebookCellOutput([
                        vscode.NotebookCellOutputItem.error({
                            name: 'ExecutionError',
                            message: error instanceof Error ? error.message : 'Unknown error'
                        })
                    ])
                ]);
                execution.end(false, Date.now());
            }
        }
    }
    
    dispose() {
        // Clean up temporary database files
        for (const dbPath of this._dbFiles.values()) {
            try {
                fs.unlinkSync(dbPath);
            } catch (error) {
                // Ignore errors during cleanup
            }
        }
        this._dbFiles.clear();
        
        // Clean up Arrow files
        for (const arrowPath of this._arrowFiles) {
            try {
                fs.unlinkSync(arrowPath);
            } catch (error) {
                // Ignore errors during cleanup
            }
        }
        this._arrowFiles.clear();
        
        // Clean up executor's temp files
        this._executor.cleanup();
        
        this._controller.dispose();
    }
}