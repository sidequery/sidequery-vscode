interface OutputItem {
    json(): any;
}

export const activate = (context: any) => {
    return {
        renderOutputItem(outputItem: OutputItem, element: HTMLElement) {
            const data = outputItem.json();
            
            if (!data || !data.columns || !data.rows) {
                element.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No data to display</div>';
                return;
            }
            
            const container = document.createElement('div');
            container.style.fontFamily = 'var(--vscode-font-family)';
            container.style.fontSize = 'var(--vscode-font-size)';
            container.style.color = 'var(--vscode-foreground)';
            
            if (data.rows.length === 0) {
                container.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">Query returned no rows</div>';
                element.appendChild(container);
                return;
            }
            
            const table = document.createElement('table');
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.marginTop = '8px';
            
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            
            data.columns.forEach((col: string) => {
                const th = document.createElement('th');
                th.textContent = col;
                th.style.border = '1px solid var(--vscode-panel-border)';
                th.style.padding = '8px';
                th.style.textAlign = 'left';
                th.style.backgroundColor = 'var(--vscode-editor-background)';
                th.style.fontWeight = 'bold';
                headerRow.appendChild(th);
            });
            
            thead.appendChild(headerRow);
            table.appendChild(thead);
            
            const tbody = document.createElement('tbody');
            
            data.rows.forEach((row: any) => {
                const tr = document.createElement('tr');
                data.columns.forEach((col: string) => {
                    const td = document.createElement('td');
                    const value = row[col];
                    td.textContent = value === null || value === undefined ? 'NULL' : String(value);
                    td.style.border = '1px solid var(--vscode-panel-border)';
                    td.style.padding = '8px';
                    td.style.textAlign = 'left';
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            
            table.appendChild(tbody);
            container.appendChild(table);
            
            const info = document.createElement('div');
            info.style.marginTop = '8px';
            info.style.fontSize = '0.9em';
            info.style.color = 'var(--vscode-descriptionForeground)';
            
            const displayRowCount = data.rowCount || data.rows.length;
            info.textContent = `${displayRowCount} row${displayRowCount !== 1 ? 's' : ''}`;
            
            if (data.executionTime) {
                info.textContent += ` • ${data.executionTime}ms`;
            }
            
            container.appendChild(info);
            
            element.innerHTML = '';
            element.appendChild(container);
        }
    };
};