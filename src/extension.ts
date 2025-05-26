import * as vscode from 'vscode';
import { SqlNotebookSerializer } from './sqlNotebookSerializer';
import { SqlNotebookController } from './sqlNotebookController';

export function activate(context: vscode.ExtensionContext) {
    const notebookSerializer = new SqlNotebookSerializer();
    context.subscriptions.push(
        vscode.workspace.registerNotebookSerializer('sql-notebook', notebookSerializer)
    );
    
    const controller = new SqlNotebookController();
    context.subscriptions.push(controller);
    
    context.subscriptions.push(
        vscode.commands.registerCommand('sidequery.openEditor', () => {
            vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(''), 'sql-notebook');
        })
    );
}

export function deactivate() {}