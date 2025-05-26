import * as vscode from 'vscode';
import { SqlParser, SqlStatement } from './sqlParser';
import { DuckDBExecutor, QueryResult } from './duckdbExecutor';

export class SqlEditorProvider implements vscode.CustomTextEditorProvider {
    private static readonly viewType = 'sidequery.sqlEditor';
    private executor: DuckDBExecutor;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.executor = new DuckDBExecutor();
    }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };

        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            const statements = SqlParser.parseStatements(document.getText());
            webviewPanel.webview.postMessage({
                type: 'update',
                statements: statements
            });
        }

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        webviewPanel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'executeStatement':
                    await this.executeStatement(webviewPanel.webview, message.statement);
                    break;
                case 'updateStatement':
                    await this.updateStatement(document, message.statement, message.newText);
                    break;
            }
        });

        updateWebview();
    }

    private async executeStatement(webview: vscode.Webview, statement: SqlStatement) {
        try {
            const result = await this.executor.executeQuery(statement.text);
            webview.postMessage({
                type: 'executionResult',
                statementIndex: statement.startLine,
                result: result
            });
        } catch (error) {
            webview.postMessage({
                type: 'executionResult',
                statementIndex: statement.startLine,
                result: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        }
    }

    private async updateStatement(document: vscode.TextDocument, statement: SqlStatement, newText: string) {
        const edit = new vscode.WorkspaceEdit();
        const range = new vscode.Range(
            new vscode.Position(statement.startLine, statement.startChar),
            new vscode.Position(statement.endLine, statement.endChar)
        );
        edit.replace(document.uri, range, newText);
        await vscode.workspace.applyEdit(edit);
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SideQuery SQL Editor</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                        margin: 0;
                        padding: 10px;
                    }
                    
                    .cell {
                        border: 1px solid var(--vscode-panel-border);
                        margin: 10px 0;
                        border-radius: 4px;
                        overflow: hidden;
                    }
                    
                    .cell-header {
                        background-color: var(--vscode-editor-background);
                        padding: 8px 12px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .cell-content {
                        background-color: var(--vscode-editor-background);
                        padding: 12px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    
                    .sql-code {
                        background-color: var(--vscode-textCodeBlock-background);
                        border: 1px solid var(--vscode-textBlockQuote-border);
                        border-radius: 3px;
                        padding: 8px;
                        font-family: monospace;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        margin-bottom: 10px;
                    }
                    
                    .run-button {
                        background-color: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 6px 12px;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                    
                    .run-button:hover {
                        background-color: var(--vscode-button-hoverBackground);
                    }
                    
                    .result-container {
                        margin-top: 10px;
                        padding: 8px;
                        border-radius: 3px;
                        background-color: var(--vscode-textCodeBlock-background);
                    }
                    
                    .result-success {
                        border-left: 3px solid var(--vscode-gitDecoration-addedResourceForeground);
                    }
                    
                    .result-error {
                        border-left: 3px solid var(--vscode-gitDecoration-deletedResourceForeground);
                        color: var(--vscode-gitDecoration-deletedResourceForeground);
                    }
                    
                    .result-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 8px;
                    }
                    
                    .result-table th,
                    .result-table td {
                        border: 1px solid var(--vscode-panel-border);
                        padding: 8px;
                        text-align: left;
                    }
                    
                    .result-table th {
                        background-color: var(--vscode-editor-background);
                        font-weight: bold;
                    }
                    
                    .execution-time {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        margin-top: 4px;
                    }
                </style>
            </head>
            <body>
                <div id="container"></div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    let statements = [];
                    let results = {};
                    
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'update':
                                statements = message.statements;
                                renderCells();
                                break;
                            case 'executionResult':
                                results[message.statementIndex] = message.result;
                                renderCells();
                                break;
                        }
                    });
                    
                    function renderCells() {
                        const container = document.getElementById('container');
                        container.innerHTML = '';
                        
                        statements.forEach((statement, index) => {
                            const cell = document.createElement('div');
                            cell.className = 'cell';
                            
                            const header = document.createElement('div');
                            header.className = 'cell-header';
                            
                            const title = document.createElement('span');
                            title.textContent = \`SQL Cell \${index + 1}\`;
                            
                            const runButton = document.createElement('button');
                            runButton.className = 'run-button';
                            runButton.textContent = 'Run';
                            runButton.onclick = () => executeStatement(statement);
                            
                            header.appendChild(title);
                            header.appendChild(runButton);
                            
                            const content = document.createElement('div');
                            content.className = 'cell-content';
                            
                            const sqlCode = document.createElement('div');
                            sqlCode.className = 'sql-code';
                            sqlCode.textContent = statement.text;
                            
                            content.appendChild(sqlCode);
                            
                            const result = results[statement.startLine];
                            if (result) {
                                const resultContainer = document.createElement('div');
                                resultContainer.className = \`result-container \${result.success ? 'result-success' : 'result-error'}\`;
                                
                                if (result.success) {
                                    if (result.data && result.data.length > 0) {
                                        const table = document.createElement('table');
                                        table.className = 'result-table';
                                        
                                        const headerRow = document.createElement('tr');
                                        result.columns.forEach(col => {
                                            const th = document.createElement('th');
                                            th.textContent = col;
                                            headerRow.appendChild(th);
                                        });
                                        table.appendChild(headerRow);
                                        
                                        result.data.forEach(row => {
                                            const tr = document.createElement('tr');
                                            result.columns.forEach(col => {
                                                const td = document.createElement('td');
                                                td.textContent = row[col] || '';
                                                tr.appendChild(td);
                                            });
                                            table.appendChild(tr);
                                        });
                                        
                                        resultContainer.appendChild(table);
                                    } else {
                                        const message = document.createElement('div');
                                        message.textContent = 'Query executed successfully (no results)';
                                        resultContainer.appendChild(message);
                                    }
                                    
                                    if (result.executionTime) {
                                        const timeDiv = document.createElement('div');
                                        timeDiv.className = 'execution-time';
                                        timeDiv.textContent = \`Executed in \${result.executionTime}ms\`;
                                        resultContainer.appendChild(timeDiv);
                                    }
                                } else {
                                    const errorDiv = document.createElement('div');
                                    errorDiv.textContent = result.error || 'Unknown error';
                                    resultContainer.appendChild(errorDiv);
                                }
                                
                                content.appendChild(resultContainer);
                            }
                            
                            cell.appendChild(header);
                            cell.appendChild(content);
                            container.appendChild(cell);
                        });
                    }
                    
                    function executeStatement(statement) {
                        vscode.postMessage({
                            type: 'executeStatement',
                            statement: statement
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }
}