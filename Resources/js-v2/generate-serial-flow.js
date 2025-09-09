#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FlowChartGenerator {
    constructor() {
        this.allFunctions = new Map(); // Map of funcName -> fileName
        this.files = {};
        this.unresolvedCalls = {}; // Track unresolved calls per function for logging
        this.calledByCount = new Map(); // Track how many functions call each function
        this.sourceFiles = new Map(); // Files that are sources (called but don't call)
        this.colorMap = {}; // Map source files to colors/symbols
    }

    // First pass: collect all function names
    collectFunctions(filePath) {
        const fileName = path.basename(filePath, '.js');
        const content = fs.readFileSync(filePath, 'utf-8');
        
        this.files[fileName] = {
            content: content,
            functions: []
        };
        
        // Match function declarations and expressions
        const funcPattern = /(?:^|\n)(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:^|\n)(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/gm;
        
        let match;
        while ((match = funcPattern.exec(content)) !== null) {
            const funcName = match[1] || match[2];
            if (funcName) {
                this.allFunctions.set(funcName, fileName);
                this.files[fileName].functions.push({
                    name: funcName,
                    index: match.index,
                    calls: [],
                    calledBy: []
                });
                this.calledByCount.set(`${fileName}.${funcName}`, 0);
            }
        }
    }

    // Find the end of a function by counting braces
    findFunctionEnd(content, startIndex) {
        let braceCount = 0;
        let inString = false;
        let stringChar = null;
        let i = startIndex;
        
        // Find the opening brace
        while (i < content.length && content[i] !== '{') {
            i++;
        }
        
        if (i >= content.length) return content.length;
        
        braceCount = 1;
        i++;
        
        while (i < content.length && braceCount > 0) {
            const char = content[i];
            const nextChar = content[i + 1];
            
            // Handle strings
            if ((char === '"' || char === "'" || char === '`')) {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar && content[i - 1] !== '\\') {
                    inString = false;
                    stringChar = null;
                }
            }
            
            // Handle comments
            if (!inString) {
                if (char === '/' && nextChar === '/') {
                    while (i < content.length && content[i] !== '\n') {
                        i++;
                    }
                    continue;
                }
                if (char === '/' && nextChar === '*') {
                    i += 2;
                    while (i < content.length - 1 && !(content[i] === '*' && content[i + 1] === '/')) {
                        i++;
                    }
                    i += 2;
                    continue;
                }
            }
            
            // Count braces
            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
            }
            
            i++;
        }
        
        return i;
    }

    // Clean function body
    cleanFunctionBody(body) {
        let cleaned = body;
        
        // Remove single-line comments
        cleaned = cleaned.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments
        cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
        
        // Replace strings with empty
        cleaned = cleaned.replace(/"[^"\\]*(\\.[^"\\]*)*"/g, '""');
        cleaned = cleaned.replace(/'[^'\\]*(\\.[^'\\]*)*'/g, "''");
        cleaned = cleaned.replace(/`[^`\\]*(\\.[^`\\]*)*`/g, '``');
        
        return cleaned;
    }

    // Second pass: find function calls within each function
    findFunctionCalls(filePath) {
        const fileName = path.basename(filePath, '.js');
        const content = this.files[fileName].content;
        const functions = this.files[fileName].functions;
        
        functions.forEach(func => {
            const funcKey = `${fileName}.${func.name}`;
            this.unresolvedCalls[funcKey] = [];
            
            // Find where this function ends
            const funcEnd = this.findFunctionEnd(content, func.index);
            const funcBody = content.substring(func.index, funcEnd);
            
            // Clean the function body
            const cleanBody = this.cleanFunctionBody(funcBody);
            
            // Find function calls IN ORDER
            const callPattern = /\b(\w+)\s*\(/g;
            let match;
            
            while ((match = callPattern.exec(cleanBody)) !== null) {
                const calledFunc = match[1];
                
                // Skip if it's calling itself
                if (calledFunc === func.name) continue;
                
                // Check if it's one of our functions
                if (this.allFunctions.has(calledFunc)) {
                    const targetFile = this.allFunctions.get(calledFunc);
                    
                    // Add to calls array (preserving order)
                    func.calls.push({
                        name: calledFunc,
                        targetFile: targetFile
                    });
                    
                    // Track who calls this function
                    const targetKey = `${targetFile}.${calledFunc}`;
                    this.calledByCount.set(targetKey, this.calledByCount.get(targetKey) + 1);
                    
                    // Track the reverse relationship
                    const targetFunc = this.files[targetFile].functions.find(f => f.name === calledFunc);
                    if (targetFunc) {
                        targetFunc.calledBy.push({
                            name: func.name,
                            sourceFile: fileName
                        });
                    }
                } else {
                    // Track unresolved
                    if (!this.unresolvedCalls[funcKey].includes(calledFunc)) {
                        this.unresolvedCalls[funcKey].push(calledFunc);
                    }
                }
            }
        });
    }

    // Third pass: identify source files
    identifySourceFiles() {
        const colors = ['🔴', '🟢', '🔵', '🟡', '🟣', '🟠', '⚫', '⚪'];
        let colorIndex = 0;
        
        Object.keys(this.files).forEach(fileName => {
            const file = this.files[fileName];
            
            // Check if ALL functions in this file are sources
            const allAreSources = file.functions.every(func => 
                func.calls.length === 0 && func.calledBy.length > 0
            );
            
            // Check if called by multiple files
            const callingFiles = new Set();
            file.functions.forEach(func => {
                func.calledBy.forEach(caller => {
                    callingFiles.add(caller.sourceFile);
                });
            });
            
            if (allAreSources && callingFiles.size >= 2) {
                this.sourceFiles.set(fileName, true);
                this.colorMap[fileName] = colors[colorIndex % colors.length];
                colorIndex++;
            }
        });
    }

    // Generate mermaid with SERIAL connections
    generateMermaid() {
        let mermaid = '```mermaid\ngraph TD\n';
        
        // Track all nodes that have been connected
        const connectedNodes = new Set();
        
        // Add file containers (excluding source files)
        Object.keys(this.files).forEach(fileName => {
            if (this.sourceFiles.has(fileName)) return;
            
            mermaid += `    subgraph ${fileName}["${fileName}.js"]\n`;
            
            this.files[fileName].functions.forEach(func => {
                const nodeId = `${fileName}_${func.name}`;
                
                // Add color indicators for source file calls
                let colorIndicators = '';
                func.calls.forEach(call => {
                    if (this.sourceFiles.has(call.targetFile)) {
                        colorIndicators += this.colorMap[call.targetFile] || '';
                    }
                });
                
                const label = colorIndicators ? `${func.name} ${colorIndicators}` : func.name;
                mermaid += `        ${nodeId}["${label}"]\n`;
            });
            
            mermaid += '    end\n\n';
        });
        
        // Add SERIAL connections
        mermaid += '    %% Serial function calls\n';
        Object.keys(this.files).forEach(fileName => {
            if (this.sourceFiles.has(fileName)) return;
            
            this.files[fileName].functions.forEach(func => {
                const parentNode = `${fileName}_${func.name}`;
                
                // Filter out calls to source files
                const flowCalls = func.calls.filter(call => !this.sourceFiles.has(call.targetFile));
                
                if (flowCalls.length === 0) return;
                
                // Connect serially through all calls
                flowCalls.forEach((call, index) => {
                    const currentNode = `${call.targetFile}_${call.name}`;
                    
                    if (index === 0) {
                        // First call - connect from parent
                        mermaid += `    ${parentNode} --> ${currentNode}\n`;
                        connectedNodes.add(parentNode);
                        connectedNodes.add(currentNode);
                    } else {
                        // Subsequent calls - connect from previous call
                        const prevCall = flowCalls[index - 1];
                        const prevNode = `${prevCall.targetFile}_${prevCall.name}`;
                        mermaid += `    ${prevNode} --> ${currentNode}\n`;
                        connectedNodes.add(currentNode);
                    }
                });
            });
        });
        
        mermaid += '```\n';
        return mermaid;
    }
    
    // Generate legend
    generateLegend() {
        let legend = '\n## Legend\n\n';
        
        if (Object.keys(this.colorMap).length > 0) {
            legend += 'Color indicators show calls to utility/source files:\n\n';
            Object.entries(this.colorMap).forEach(([fileName, color]) => {
                const funcs = this.files[fileName].functions.map(f => f.name).join(', ');
                legend += `- ${color} = ${fileName}.js (${funcs})\n`;
            });
        }
        
        legend += '\n### Flow Type\n';
        legend += '- Arrows show **serial execution order** within functions\n';
        legend += '- Functions are chained in the order they are called\n';
        
        return legend;
    }
    
    // Generate call report
    generateCallReport() {
        let report = '\n## Function Call Analysis\n\n';
        
        // Source files
        if (this.sourceFiles.size > 0) {
            report += '### Source/Utility Files (excluded from flow)\n\n';
            this.sourceFiles.forEach((_, fileName) => {
                const file = this.files[fileName];
                report += `**${fileName}.js**\n`;
                file.functions.forEach(func => {
                    const calledBy = func.calledBy.map(c => `${c.sourceFile}.${c.name}`).join(', ');
                    report += `  - ${func.name}: called by ${calledBy}\n`;
                });
                report += '\n';
            });
        }
        
        return report;
    }

    // Main process
    run() {
        const jsFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && !file.includes('generate'))
            .map(file => path.join(__dirname, file));
        
        console.log('=== First Pass: Collecting Functions ===');
        jsFiles.forEach(file => {
            this.collectFunctions(file);
            const fileName = path.basename(file, '.js');
            console.log(`${fileName}.js: Found ${this.files[fileName].functions.length} functions`);
        });
        
        console.log(`\nTotal functions found: ${this.allFunctions.size}`);
        
        console.log('\n=== Second Pass: Finding Connections ===');
        jsFiles.forEach(file => {
            this.findFunctionCalls(file);
        });
        
        console.log('\n=== Third Pass: Identifying Source Files ===');
        this.identifySourceFiles();
        this.sourceFiles.forEach((_, fileName) => {
            console.log(`${fileName}.js identified as source/utility file (${this.colorMap[fileName]})`);
        });
        
        // Count connections
        let connectionCount = 0;
        Object.values(this.files).forEach(file => {
            file.functions.forEach(func => {
                const flowCalls = func.calls.filter(c => !this.sourceFiles.has(c.targetFile));
                if (flowCalls.length > 0) {
                    connectionCount += flowCalls.length;
                }
            });
        });
        console.log(`\nSerial connections to create: ${connectionCount}`);
        
        // Generate and save
        const mermaid = this.generateMermaid();
        const legend = this.generateLegend();
        const callReport = this.generateCallReport();
        const output = `# Serial Flow Chart\n\nGenerated: ${new Date().toLocaleString()}\n\n${mermaid}\n${legend}\n${callReport}`;
        
        fs.writeFileSync(path.join(__dirname, 'serial-flow.md'), output);
        console.log('\n✅ Chart saved to serial-flow.md');
    }
}

// Run it
const generator = new FlowChartGenerator();
generator.run();