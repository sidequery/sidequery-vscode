export interface SqlStatement {
    text: string;
    startLine: number;
    endLine: number;
    startChar: number;
    endChar: number;
}

export class SqlParser {
    static parseStatements(content: string): SqlStatement[] {
        const statements: SqlStatement[] = [];
        const lines = content.split('\n');
        
        let currentStatement = '';
        let startLine = 0;
        let startChar = 0;
        let inSingleLineComment = false;
        let inMultiLineComment = false;
        let inString = false;
        let stringChar = '';
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            inSingleLineComment = false;
            
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const nextChar = line[charIndex + 1];
                
                if (!inString && !inSingleLineComment && !inMultiLineComment) {
                    if (char === '-' && nextChar === '-') {
                        inSingleLineComment = true;
                        charIndex++;
                        continue;
                    }
                    
                    if (char === '/' && nextChar === '*') {
                        inMultiLineComment = true;
                        charIndex++;
                        continue;
                    }
                    
                    if (char === "'" || char === '"') {
                        inString = true;
                        stringChar = char;
                    }
                }
                
                if (inMultiLineComment && char === '*' && nextChar === '/') {
                    inMultiLineComment = false;
                    charIndex++;
                    continue;
                }
                
                if (inString && char === stringChar && line[charIndex - 1] !== '\\') {
                    inString = false;
                    stringChar = '';
                }
                
                if (!inSingleLineComment && !inMultiLineComment && !inString) {
                    if (char === ';') {
                        const statementText = currentStatement.trim();
                        if (statementText && !statementText.match(/^(\s*--.*|\s*\/\*.*\*\/\s*)$/)) {
                            statements.push({
                                text: statementText,
                                startLine,
                                endLine: lineIndex,
                                startChar,
                                endChar: charIndex
                            });
                        }
                        
                        currentStatement = '';
                        startLine = lineIndex + 1;
                        startChar = 0;
                        continue;
                    }
                }
                
                if (!inSingleLineComment && !inMultiLineComment) {
                    if (currentStatement === '' && char.trim() !== '') {
                        startLine = lineIndex;
                        startChar = charIndex;
                    }
                    currentStatement += char;
                }
            }
            
            if (!inSingleLineComment && !inMultiLineComment) {
                currentStatement += '\n';
            }
        }
        
        const finalStatement = currentStatement.trim();
        if (finalStatement) {
            statements.push({
                text: finalStatement,
                startLine,
                endLine: lines.length - 1,
                startChar,
                endChar: lines[lines.length - 1].length
            });
        }
        
        return statements;
    }
}