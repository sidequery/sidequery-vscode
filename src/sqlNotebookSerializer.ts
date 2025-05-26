import * as vscode from 'vscode';
import { SqlParser } from './sqlParser';

export class SqlNotebookSerializer implements vscode.NotebookSerializer {
    async deserializeNotebook(
        content: Uint8Array,
        _token: vscode.CancellationToken
    ): Promise<vscode.NotebookData> {
        const contents = new TextDecoder().decode(content);
        const statements = SqlParser.parseStatements(contents);
        
        const cells: vscode.NotebookCellData[] = statements.map(statement => {
            return new vscode.NotebookCellData(
                vscode.NotebookCellKind.Code,
                statement.text,
                'sql'
            );
        });
        
        if (cells.length === 0) {
            cells.push(new vscode.NotebookCellData(
                vscode.NotebookCellKind.Code,
                '',
                'sql'
            ));
        }
        
        return new vscode.NotebookData(cells);
    }
    
    async serializeNotebook(
        data: vscode.NotebookData,
        _token: vscode.CancellationToken
    ): Promise<Uint8Array> {
        const cells = data.cells
            .filter(cell => cell.kind === vscode.NotebookCellKind.Code)
            .map(cell => cell.value)
            .filter(value => value.trim().length > 0);
        
        const content = cells.join(';\n\n') + (cells.length > 0 ? ';' : '');
        
        return new TextEncoder().encode(content);
    }
}