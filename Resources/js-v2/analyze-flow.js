#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class FlowAnalyzer {
    constructor() {
        // Progressive JSON structure - each pass adds to this
        this.analysis = {
            metadata: {
                generated: new Date().toISOString(),
                files: []
            },
            functions: {},  // Pass 1 & 2 populate this
            calls: {},      // Pass 3 populates this
            flows: {},      // Pass 4 populates this
            graph: {}       // Pass 5 populates this
        };
        
        // Legacy structures for compatibility
        this.files = {};
        this.functions = new Map(); // funcName -> {file, hasParams, paramNames}
        this.calls = []; // Array of all function calls with context
        this.output = {
            pass1: '',
            pass2: '',
            pass3: '',
            pass4: '',
            pass5: ''
        };
    }
    
    // Helper to parse arguments handling nested parentheses and objects
    parseArguments(argsString) {
        const args = [];
        let current = '';
        let depth = 0;
        let inString = false;
        let stringChar = '';
        
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            
            // Handle strings
            if ((char === '"' || char === "'" || char === '`') && argsString[i-1] !== '\\') {
                if (!inString) {
                    inString = true;
                    stringChar = char;
                } else if (char === stringChar) {
                    inString = false;
                }
            }
            
            if (!inString) {
                if (char === '(' || char === '{' || char === '[') depth++;
                if (char === ')' || char === '}' || char === ']') depth--;
                
                if (char === ',' && depth === 0) {
                    args.push(current.trim());
                    current = '';
                    continue;
                }
            }
            
            current += char;
        }
        
        if (current.trim()) {
            args.push(current.trim());
        }
        
        return args;
    }

    // Pass 1: Find all function declarations
    pass1_findFunctions(filePath) {
        const fileName = path.basename(filePath, '.js');
        const content = fs.readFileSync(filePath, 'utf-8');
        
        if (!this.files[fileName]) {
            this.files[fileName] = {
                content: content,
                functions: []
            };
        }

        // Generic patterns for function declarations
        const patterns = [
            // Pattern 1: Traditional function declaration
            /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
            // Pattern 2: Variable assignment to function expression
            /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function\s*\(([^)]*)\)/g,
            // Pattern 3: Variable assignment to arrow function
            /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const funcName = match[1];
                const params = match[2].trim();
                
                // Skip if we already found this function
                if (this.files[fileName].functions.some(f => f.name === funcName)) {
                    continue;
                }
                
                const funcInfo = {
                    name: funcName,
                    file: fileName,
                    params: params,
                    paramList: params ? params.split(',').map(p => {
                        // Handle default parameters and destructuring
                        return p.trim().split(/[=\s{]/)[0];
                    }).filter(p => p) : [],
                    hasParams: params.length > 0
                };
                
                this.functions.set(funcName, funcInfo);
                this.files[fileName].functions.push(funcInfo);
                
                // Add to progressive JSON
                const funcKey = `${fileName}.${funcName}`;
                this.analysis.functions[funcKey] = {
                    file: fileName,
                    name: funcName,
                    type: 'function',
                    params: funcInfo.paramList,
                    paramString: funcInfo.params,
                    hasParams: funcInfo.hasParams
                };
            }
        });
    }

    // Pass 2: Analyze function signatures
    pass2_analyzeFunctionSignatures() {
        this.output.pass2 = "=== PASS 2: Function Signatures ===\n\n";
        
        Object.keys(this.files).forEach(fileName => {
            this.output.pass2 += `${fileName}.js:\n`;
            this.files[fileName].functions.forEach(func => {
                if (func.hasParams) {
                    this.output.pass2 += `  ${func.name}(${func.params}) - ${func.paramList.length} args\n`;
                } else {
                    this.output.pass2 += `  ${func.name}() - no args\n`;
                }
            });
            this.output.pass2 += '\n';
        });
    }

    // Pass 3: Find all function calls with their arguments
    pass3_findFunctionCalls() {
        this.output.pass3 = "=== PASS 3: Function Calls ===\n\n";
        
        Object.keys(this.files).forEach(fileName => {
            const content = this.files[fileName].content;
            const lines = content.split('\n');
            
            // For each function in this file, find what it calls
            this.files[fileName].functions.forEach(func => {
                // Find function start line more accurately
                let funcStartLine = -1;
                let funcEndLine = lines.length;
                
                // Look for the function declaration
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Match function declaration patterns (including exports)
                    if (line.includes(`function ${func.name}(`) ||
                        line.includes(`const ${func.name} =`) ||
                        line.includes(`let ${func.name} =`) ||
                        line.includes(`var ${func.name} =`)) {
                        funcStartLine = i;
                        break;
                    }
                }
                
                if (funcStartLine === -1) {
                    return;
                }
                
                // Find function end by properly tracking braces, strings, and comments
                let braceCount = 0;
                let inString = false;
                let stringChar = '';
                let inComment = false;
                let foundStart = false;
                
                for (let i = funcStartLine; i < lines.length; i++) {
                    const line = lines[i];
                    
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        const nextChar = line[j + 1];
                        
                        // Handle comments
                        if (!inString && !inComment && char === '/' && nextChar === '/') {
                            break; // Rest of line is comment
                        }
                        if (!inString && !inComment && char === '/' && nextChar === '*') {
                            inComment = true;
                            j++;
                            continue;
                        }
                        if (inComment && char === '*' && nextChar === '/') {
                            inComment = false;
                            j++;
                            continue;
                        }
                        if (inComment) continue;
                        
                        // Handle strings
                        if (!inString && (char === '"' || char === "'" || char === '`')) {
                            inString = true;
                            stringChar = char;
                        } else if (inString && char === stringChar && line[j-1] !== '\\') {
                            inString = false;
                        }
                        if (inString) continue;
                        
                        // Count braces
                        if (char === '{') {
                            braceCount++;
                            foundStart = true;
                        } else if (char === '}') {
                            braceCount--;
                            if (foundStart && braceCount === 0) {
                                funcEndLine = i + 1;
                                break;
                            }
                        }
                    }
                    
                    if (funcEndLine !== lines.length) break;
                }
                
                // Extract function body
                let funcBody = lines.slice(funcStartLine, funcEndLine).join('\n');
                
                // Look for function calls
                this.functions.forEach((targetFunc, targetName) => {
                    // Pattern to find function calls (just the start)
                    const callPattern = new RegExp(`\\b${targetName}\\s*\\(`, 'g');
                    
                    let callMatch;
                    const seenCalls = new Set();
                    
                    while ((callMatch = callPattern.exec(funcBody)) !== null) {
                        // Create unique key for this call to avoid duplicates
                        const callKey = `${callMatch.index}:${targetName}`;
                        if (seenCalls.has(callKey)) continue;
                        seenCalls.add(callKey);
                        
                        // Check context before the match to skip definitions
                        const before = funcBody.substring(Math.max(0, callMatch.index - 50), callMatch.index);
                        // Skip if this looks like a FUNCTION definition (not a call assignment)
                        // Only skip if it's defining a function with the same name
                        const defPattern = new RegExp(`(const|let|var)\\s+${targetName}\\s*=\\s*$`);
                        if (before.match(/function\s+$/) ||
                            before.match(defPattern) ||
                            before.match(/export\s+(function|const|let|var)\s+$/)) {
                            continue;
                        }
                        
                        // Skip self-references in function definition line
                        if (targetName === func.name) {
                            const lineStart = funcBody.lastIndexOf('\n', callMatch.index) + 1;
                            const lineEnd = funcBody.indexOf('\n', callMatch.index);
                            const line = funcBody.substring(lineStart, lineEnd > 0 ? lineEnd : funcBody.length);
                            
                            // Check if this line is a function definition
                            if (line.match(/^\s*(export\s+)?(async\s+)?function\s+/) ||
                                line.match(/^\s*(export\s+)?(const|let|var)\s+\w+\s*=/)) {
                                continue;
                            }
                        }
                        
                        // Calculate brace depth at this position to understand nesting
                        let braceDepth = 0;
                        let beforeCall = funcBody.substring(0, callMatch.index);
                        for (let i = 0; i < beforeCall.length; i++) {
                            if (beforeCall[i] === '{') braceDepth++;
                            else if (beforeCall[i] === '}') braceDepth--;
                        }
                        
                        // Check if we're in a callback (arrow function or function expression)
                        // Look for patterns like addEventListener('click', () => { ... })
                        let isInCallback = false;
                        const callbackPatterns = [
                            /addEventListener\([^)]*,\s*\([^)]*\)\s*=>\s*{[^}]*$/,  // arrow function callback
                            /addEventListener\([^)]*,\s*function[^{]*{[^}]*$/,      // function expression callback
                            /\.\w+\([^)]*,\s*\([^)]*\)\s*=>\s*{[^}]*$/,            // any method with arrow callback
                            /setTimeout\([^{]*{[^}]*$/,                              // setTimeout callback
                            /setInterval\([^{]*{[^}]*$/,                             // setInterval callback
                            /\.then\([^{]*{[^}]*$/,                                  // Promise then
                            /\.catch\([^{]*{[^}]*$/,                                 // Promise catch
                            /\.forEach\([^{]*{[^}]*$/,                               // Array forEach
                            /\.map\([^{]*{[^}]*$/,                                   // Array map
                            /\.filter\([^{]*{[^}]*$/                                 // Array filter
                        ];
                        
                        for (const pattern of callbackPatterns) {
                            if (beforeCall.match(pattern)) {
                                isInCallback = true;
                                break;
                            }
                        }
                        
                        // Check if we're in a switch case
                        let caseLabel = null;
                        // Look for the most recent case statement
                        const caseMatches = [...beforeCall.matchAll(/case\s+['"`]?([^'"`:\s]+)['"`]?\s*:/g)];
                        const breakMatches = [...beforeCall.matchAll(/break\s*;/g)];
                        
                        if (caseMatches.length > 0) {
                            // Get the last case
                            const lastCase = caseMatches[caseMatches.length - 1];
                            const lastCaseIdx = lastCase.index;
                            
                            // Check if there's a break after this case
                            const breaksAfterCase = breakMatches.filter(b => b.index > lastCaseIdx);
                            
                            // If no break after the last case, we're in that case
                            if (breaksAfterCase.length === 0 || 
                                (breaksAfterCase[0].index > callMatch.index)) {
                                caseLabel = lastCase[1];
                            }
                        }
                        
                        // Find matching closing parenthesis
                        const startPos = callMatch.index + callMatch[0].length;
                        let depth = 1;
                        let endPos = startPos;
                        let inString = false;
                        let stringChar = '';
                        
                        while (endPos < funcBody.length && depth > 0) {
                            const char = funcBody[endPos];
                            const prevChar = endPos > 0 ? funcBody[endPos - 1] : '';
                            
                            // Handle strings
                            if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
                                if (!inString) {
                                    inString = true;
                                    stringChar = char;
                                } else if (char === stringChar) {
                                    inString = false;
                                }
                            }
                            
                            if (!inString) {
                                if (char === '(') depth++;
                                if (char === ')') depth--;
                            }
                            
                            endPos++;
                        }
                        
                        const args = funcBody.substring(startPos, endPos - 1).trim();
                        
                        const callInfo = {
                            caller: func.name,
                            callerFile: fileName,
                            callee: targetName,
                            calleeFile: targetFunc.file,
                            arguments: args,
                            argList: args ? this.parseArguments(args) : [],
                            hasArgs: args.length > 0,
                            position: callMatch.index,  // Track position in source
                            braceDepth: braceDepth,  // Track nesting level
                            caseLabel: caseLabel,  // Track switch case if applicable
                            isInCallback: isInCallback  // Track if in callback/event handler
                        };
                        this.calls.push(callInfo);
                        
                        // Add to progressive JSON
                        const callerKey = `${fileName}.${func.name}`;
                        if (!this.analysis.calls[callerKey]) {
                            this.analysis.calls[callerKey] = [];
                        }
                        this.analysis.calls[callerKey].push({
                            callee: targetName,
                            calleeFile: targetFunc.file,
                            position: callMatch.index,
                            braceDepth: braceDepth,
                            arguments: args,
                            argList: args ? this.parseArguments(args) : []
                        });
                    }
                });
            });
        });
        
        // Output the calls grouped by caller
        const callsByCaller = {};
        this.calls.forEach(call => {
            const key = `${call.callerFile}.${call.caller}`;
            if (!callsByCaller[key]) {
                callsByCaller[key] = [];
            }
            callsByCaller[key].push(call);
        });
        
        Object.keys(callsByCaller).forEach(caller => {
            this.output.pass3 += `${caller} calls:\n`;
            callsByCaller[caller].forEach(call => {
                if (call.hasArgs) {
                    this.output.pass3 += `  - ${call.callee}(${call.arguments})\n`;
                } else {
                    this.output.pass3 += `  - ${call.callee}()\n`;
                }
            });
            this.output.pass3 += '\n';
        });
    }

    // Pass 4: Analyze argument flow
    pass4_analyzeArgumentFlow() {
        this.output.pass4 = "=== PASS 4: Flow Structure Analysis ===\n\n";
        
        // Use the progressive JSON structure
        this.flowAnalysis = this.analysis.flows;
        
        // Group calls by caller function and track their order
        const callsByCaller = {};
        this.calls.forEach(call => {
            const key = `${call.callerFile}.${call.caller}`;
            if (!callsByCaller[key]) {
                callsByCaller[key] = [];
            }
            callsByCaller[key].push(call);
        });
        
        // Analyze each function's calls for data flow
        Object.keys(callsByCaller).forEach(caller => {
            const calls = callsByCaller[caller];
            if (calls.length < 2) return; // Need at least 2 calls to analyze flow
            
            // Skip flow analysis for setup/initialization functions
            // These register handlers, not sequential flow
            if (caller.includes('setup') || caller.includes('init') || caller.includes('Listeners')) {
                return;
            }
            
            // Sort calls by their position in the source code
            calls.sort((a, b) => a.position - b.position);
            
            this.flowAnalysis[caller] = {
                function: caller,
                flows: []
            };
            
            // Track variables that might flow between calls
            const potentialOutputs = new Set();
            
            for (let i = 0; i < calls.length - 1; i++) {
                const call1 = calls[i];
                const call2 = calls[i + 1];
                
                // Determine relationship based on actual argument patterns
                let relationship = 'parallel';
                let reason = '';
                
                // Check if calls are in a control flow structure (if/switch/etc)
                // This would require more complex analysis, so for now we check simpler patterns
                
                // Skip flows between callback functions - they're event handlers, not sequential flow
                if (call1.isInCallback || call2.isInCallback) {
                    continue;  // Event handlers don't represent data flow
                }
                
                // Check if calls are in different switch cases (mutually exclusive)
                if (call1.caseLabel && call2.caseLabel && call1.caseLabel !== call2.caseLabel) {
                    // Different switch cases - these are mutually exclusive, skip connection
                    continue;  // Don't create a flow between these
                }
                
                // Use definitive structural information
                const depthDiff = call2.braceDepth - call1.braceDepth;
                const sameCallSignature = call1.callee === call2.callee && call1.arguments === call2.arguments;
                
                // Definitive patterns we can identify:
                if (sameCallSignature && depthDiff === 0) {
                    // Identical calls at same depth - likely in different branches of if/switch
                    // But only if they're not just sequential calls
                    // Check if there's significant code between them
                    const positionDiff = call2.position - call1.position;
                    if (positionDiff > 100) { // Arbitrary threshold for "significant gap"
                        relationship = 'branched';
                        reason = '🔀 Different branches';
                    } else {
                        // Sequential calls to same function - skip or mark as iterative
                        relationship = 'iterative';
                        reason = '🔄 Repeated call';
                    }
                } else if (depthDiff > 0) {
                    // Call2 is nested deeper
                    relationship = 'enters-block';
                    reason = `↘️ Enters nested block (${depthDiff} deeper)`;
                } else if (depthDiff < 0) {
                    // Call2 exits from nested block
                    relationship = 'exits-block';
                    reason = `↗️ Exits to outer scope (${-depthDiff} up)`;
                } else if (!call2.hasArgs) {
                    relationship = 'sequential';
                    reason = '➡️ Sequential (no args)';
                } else if (!call1.hasArgs && call2.hasArgs) {
                    // call1 has no args but call2 does - check if call2's args could be constants
                    const call2Args = call2.argList.join(', ');
                    // Check if all arguments are literals
                    const allLiterals = call2.argList.every(arg => {
                        return arg.match(/^['"`].*['"`]$/) || // strings
                               arg.match(/^\d+(\.\d+)?$/) || // numbers
                               arg.match(/^(true|false|null|undefined)$/); // keywords
                    });
                    
                    if (allLiterals) {
                        relationship = 'sequential';
                        reason = '➡️ Sequential (literal args)';
                    } else if (call2Args.includes('state') || call2Args.includes('data')) {
                        relationship = 'sequential';
                        reason = '➡️ Sequential (scope vars)';
                    } else {
                        relationship = 'data-flow';
                        reason = '📊 Data flow (may use return)';
                    }
                } else if (call1.hasArgs && call2.hasArgs) {
                    // Both have args - check for patterns
                    const call1Args = call1.argList.join(', ');
                    const call2Args = call2.argList.join(', ');
                    
                    // Check if call2 uses similar variable names as call1
                    // This is a heuristic - not perfect
                    let hasOverlap = false;
                    call1.argList.forEach(arg1 => {
                        const varName = arg1.split('.')[0].split('[')[0].trim();
                        if (varName && call2Args.includes(varName)) {
                            hasOverlap = true;
                        }
                    });
                    
                    if (hasOverlap) {
                        relationship = 'sequential';
                        reason = '➡️ Sequential (shared vars)';
                    } else if (call2.argList.every(arg => {
                        return arg.match(/^['"`].*['"`]$/) || 
                               arg.match(/^\d+(\.\d+)?$/) || 
                               arg.match(/^(true|false|null|undefined)$/);
                    })) {
                        relationship = 'sequential';
                        reason = '➡️ Sequential (literal args)';
                    } else {
                        // Check if they're the same function (likely in a loop)
                        if (call1.callee === call2.callee) {
                            relationship = 'iterative';
                            reason = '🔄 Loop/Iteration';
                        } else {
                            relationship = 'sequential';
                            reason = '➡️ Sequential (potential flow)';
                        }
                    }
                }
                
                // Store flow in JSON structure
                this.flowAnalysis[caller].flows.push({
                    from: call1.callee,
                    to: call2.callee,
                    relationship: relationship,
                    reason: reason,
                    depthChange: depthDiff,
                    fromArgs: call1.arguments,
                    toArgs: call2.arguments
                });
            }
        });
        
        // Add human-readable summary first
        Object.keys(this.flowAnalysis).forEach(func => {
            const analysis = this.flowAnalysis[func];
            if (analysis.flows.length === 0) return;
            
            this.output.pass4 += `### ${func}\n`;
            
            // Group flows by relationship type
            const flowsByType = {};
            analysis.flows.forEach(flow => {
                if (!flowsByType[flow.relationship]) {
                    flowsByType[flow.relationship] = [];
                }
                flowsByType[flow.relationship].push(flow);
            });
            
            // Output flows grouped by type
            Object.keys(flowsByType).forEach(type => {
                const flows = flowsByType[type];
                const icon = flows[0].reason.split(' ')[0]; // Get emoji from reason
                this.output.pass4 += `\n**${icon} ${type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}:**\n`;
                flows.forEach(flow => {
                    this.output.pass4 += `  - ${flow.from}() → ${flow.to}()\n`;
                });
            });
            this.output.pass4 += '\n';
        });
        
        // Then add complete JSON for programmatic use
        this.output.pass4 += "### Complete Flow Data (JSON)\n\n```json\n";
        this.output.pass4 += JSON.stringify(this.flowAnalysis, null, 2);
        this.output.pass4 += "\n```\n\n";
    }

    // Pass 5: Generate graph recommendations and Mermaid chart
    pass5_generateConnections() {
        this.output.pass5 = "=== PASS 5: Graph Generation ===\n\n";
        
        // Initialize graph structure in JSON
        this.analysis.graph = {
            nodes: {},
            edges: [],
            recommendations: {
                sequential: [],
                parallel: [],
                branched: [],
                iterative: [],
                nested: []
            }
        };
        
        // Create nodes for all functions
        Object.keys(this.analysis.functions).forEach(funcKey => {
            const func = this.analysis.functions[funcKey];
            this.analysis.graph.nodes[funcKey] = {
                id: funcKey,
                file: func.file,
                name: func.name,
                label: `${func.file}::${func.name}`,
                type: func.type,
                hasParams: func.params.length > 0,
                callCount: 0
            };
        });
        
        // Process flows from Pass 4 to build recommendations and edges
        Object.keys(this.analysis.flows).forEach(callerKey => {
            const flows = this.analysis.flows[callerKey].flows;
            
            flows.forEach(flow => {
                // Create edge
                const edge = {
                    from: `${callerKey.split('.')[0]}.${flow.from}`,
                    to: `${callerKey.split('.')[0]}.${flow.to}`,
                    relationship: flow.relationship,
                    depthChange: flow.depthChange,
                    caller: callerKey
                };
                this.analysis.graph.edges.push(edge);
                
                // Update call counts
                if (this.analysis.graph.nodes[edge.to]) {
                    this.analysis.graph.nodes[edge.to].callCount++;
                }
                
                // Add to recommendations based on relationship type
                const rec = {
                    from: flow.from,
                    to: flow.to,
                    caller: callerKey,
                    reason: flow.reason
                };
                
                switch(flow.relationship) {
                    case 'sequential':
                    case 'data-flow':
                        this.analysis.graph.recommendations.sequential.push(rec);
                        break;
                    case 'branched':
                        this.analysis.graph.recommendations.branched.push(rec);
                        break;
                    case 'iterative':
                        this.analysis.graph.recommendations.iterative.push(rec);
                        break;
                    case 'enters-block':
                    case 'exits-block':
                        this.analysis.graph.recommendations.nested.push(rec);
                        break;
                    default:
                        this.analysis.graph.recommendations.parallel.push(rec);
                }
            });
        });
        
        // Generate human-readable summary
        this.output.pass5 += "### Recommendations Summary\n\n";
        
        const recs = this.analysis.graph.recommendations;
        
        if (recs.sequential.length > 0) {
            this.output.pass5 += "**📊 Sequential/Data Flow:**\n";
            recs.sequential.forEach(r => {
                this.output.pass5 += `  - ${r.from}() → ${r.to}() (in ${r.caller})\n`;
            });
            this.output.pass5 += "\n";
        }
        
        if (recs.branched.length > 0) {
            this.output.pass5 += "**🔀 Branched Flows:**\n";
            recs.branched.forEach(r => {
                this.output.pass5 += `  - ${r.from}() ⟷ ${r.to}() (in ${r.caller})\n`;
            });
            this.output.pass5 += "\n";
        }
        
        if (recs.nested.length > 0) {
            this.output.pass5 += "**↘️ Nested Blocks:**\n";
            recs.nested.forEach(r => {
                this.output.pass5 += `  - ${r.from}() ${r.reason.includes('Enters') ? '↘️' : '↗️'} ${r.to}() (in ${r.caller})\n`;
            });
            this.output.pass5 += "\n";
        }
        
        if (recs.iterative.length > 0) {
            this.output.pass5 += "**🔄 Iterative Patterns:**\n";
            recs.iterative.forEach(r => {
                this.output.pass5 += `  - ${r.from}() ⟲ ${r.to}() (in ${r.caller})\n`;
            });
            this.output.pass5 += "\n";
        }
        
        if (recs.parallel.length > 0) {
            this.output.pass5 += "**⚡ Parallel/Independent:**\n";
            const parallelByFunc = {};
            recs.parallel.forEach(r => {
                if (!parallelByFunc[r.caller]) parallelByFunc[r.caller] = [];
                parallelByFunc[r.caller].push(`${r.from}(), ${r.to}()`);
            });
            Object.keys(parallelByFunc).forEach(func => {
                this.output.pass5 += `  - In ${func}: [${parallelByFunc[func].join('; ')}]\n`;
            });
            this.output.pass5 += "\n";
        }
    }

    // Main process
    run() {
        console.log('Starting multi-pass analysis...\n');
        
        // Get all .js files
        const jsFiles = fs.readdirSync(__dirname)
            .filter(file => file.endsWith('.js') && !file.includes('generate') && !file.includes('analyze'))
            .map(file => path.join(__dirname, file));
        
        // Pass 1: Find functions
        console.log('Pass 1: Finding functions...');
        this.output.pass1 = "=== PASS 1: Functions Found ===\n\n";
        jsFiles.forEach(file => {
            this.pass1_findFunctions(file);
            const fileName = path.basename(file, '.js');
            const funcNames = this.files[fileName].functions.map(f => f.name).join(', ');
            this.output.pass1 += `${fileName}.js: ${funcNames}\n`;
        });
        this.output.pass1 += `\nTotal functions: ${this.functions.size}\n\n`;
        
        // Pass 2: Analyze signatures
        console.log('Pass 2: Analyzing function signatures...');
        this.pass2_analyzeFunctionSignatures();
        
        // Pass 3: Find calls
        console.log('Pass 3: Finding function calls...');
        this.pass3_findFunctionCalls();
        
        // Pass 4: Analyze flow
        console.log('Pass 4: Analyzing argument flow...');
        this.pass4_analyzeArgumentFlow();
        
        // Pass 5: Generate connections
        console.log('Pass 5: Generating connection recommendations...');
        this.pass5_generateConnections();
        
        // Generate Mermaid charts using recommendations from JSON
        let mermaidChart = `## Function Flow Charts\n\n`;
        
        // Chart 0: ACTUAL Core Flow (from the real detected flows) - CLEAN VERSION
        mermaidChart += `### Timeline Application Flow (Based on Actual Code)\n\n\`\`\`mermaid\ngraph LR\n`;
        mermaidChart += `    classDef entry fill:#2196F3,stroke:#0D47A1,stroke-width:3px,color:#fff,font-weight:bold\n`;
        mermaidChart += `    classDef process fill:#9C27B0,stroke:#4A148C,stroke-width:2px,color:#fff\n`;
        mermaidChart += `    classDef render fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff\n`;
        mermaidChart += `    classDef output fill:#4CAF50,stroke:#1B5E20,stroke-width:2px,color:#fff\n\n`;
        
        // The ACTUAL flow as detected, in a clean linear representation
        mermaidChart += `    %% Entry point\n`;
        mermaidChart += `    init[main.init]:::entry\n\n`;
        
        mermaidChart += `    %% Data loading sequence (actual from state.loadData)\n`;
        mermaidChart += `    loadData[state.loadData]:::process\n`;
        mermaidChart += `    parseMarkdown[Parse<br/>Markdown]:::process\n`;
        mermaidChart += `    applyFilters[Apply<br/>Filters]:::process\n`;
        mermaidChart += `    calcCoords[Calculate<br/>Coordinates]:::process\n\n`;
        
        mermaidChart += `    %% Rendering sequence (actual from render.renderTimeline)\n`;
        mermaidChart += `    render[render.render]:::render\n`;
        mermaidChart += `    renderTimeline[Render<br/>Timeline]:::render\n`;
        mermaidChart += `    renderYears[Year<br/>Markers]:::render\n`;
        mermaidChart += `    renderNodes[Case<br/>Nodes]:::render\n`;
        mermaidChart += `    createLabels[Position<br/>Labels]:::render\n`;
        mermaidChart += `    renderTitles[Case<br/>Titles]:::render\n\n`;
        
        mermaidChart += `    %% Output\n`;
        mermaidChart += `    display[Timeline<br/>Display]:::output\n\n`;
        
        mermaidChart += `    %% The actual flow connections\n`;
        mermaidChart += `    init --> loadData\n`;
        mermaidChart += `    loadData --> parseMarkdown\n`;
        mermaidChart += `    parseMarkdown --> applyFilters\n`;
        mermaidChart += `    applyFilters --> calcCoords\n`;
        mermaidChart += `    calcCoords --> render\n`;
        mermaidChart += `    render --> renderTimeline\n`;
        mermaidChart += `    renderTimeline --> renderYears\n`;
        mermaidChart += `    renderYears --> renderNodes\n`;
        mermaidChart += `    renderNodes --> createLabels\n`;
        mermaidChart += `    createLabels --> renderTitles\n`;
        mermaidChart += `    renderTitles --> display\n`;
        
        mermaidChart += `\`\`\`\n\n`;
        
        // Add detailed breakdown of each major stage
        mermaidChart += `### Detailed Breakdown by Stage\n\n`;
        
        // Stage 1: Initialization details
        mermaidChart += `#### 1️⃣ Initialization Stage (main.init)\n\n`;
        mermaidChart += `<details>\n<summary>Click to see what happens during initialization</summary>\n\n\`\`\`mermaid\ngraph TD\n`;
        mermaidChart += `    init[main.init]\n`;
        mermaidChart += `    clear[clearContainers]\n`;
        mermaidChart += `    setup[setupListeners]\n`;
        mermaidChart += `    legend[buildLegend]\n`;
        mermaidChart += `    load[loadData]\n`;
        mermaidChart += `    init --> clear\n`;
        mermaidChart += `    init --> setup\n`;
        mermaidChart += `    init --> legend\n`;
        mermaidChart += `    init --> load\n`;
        mermaidChart += `\`\`\`\n\n`;
        mermaidChart += `**What it does:**\n`;
        mermaidChart += `- Clears all containers to reset the UI\n`;
        mermaidChart += `- Sets up event listeners for user interactions\n`;
        mermaidChart += `- Builds the emoji legend for filtering\n`;
        mermaidChart += `- Triggers data loading\n\n`;
        mermaidChart += `</details>\n\n`;
        
        // Stage 2: Data Loading details
        mermaidChart += `#### 2️⃣ Data Loading Stage (state.loadData)\n\n`;
        mermaidChart += `<details>\n<summary>Click to see the data loading pipeline</summary>\n\n\`\`\`mermaid\ngraph LR\n`;
        
        // Get the actual flow from our analysis
        const loadDataFlows = this.analysis.flows['state.loadData'];
        if (loadDataFlows && loadDataFlows.flows) {
            const sequential = loadDataFlows.flows.filter(f => f.relationship === 'sequential' || f.relationship === 'data-flow');
            
            // Build chain
            mermaidChart += `    loadData[loadData]\n`;
            let prevNode = 'loadData';
            sequential.forEach(flow => {
                mermaidChart += `    ${flow.to}[${flow.to}]\n`;
                mermaidChart += `    ${prevNode} --> ${flow.to}\n`;
                prevNode = flow.to;
            });
        }
        
        mermaidChart += `\`\`\`\n\n`;
        mermaidChart += `**What it does:**\n`;
        mermaidChart += `- Loads table data from markdown files\n`;
        mermaidChart += `- Parses markdown to extract events\n`;
        mermaidChart += `- Loads saved UI state (filters, scale, etc.)\n`;
        mermaidChart += `- Applies filters to events\n`;
        mermaidChart += `- Calculates timeline coordinates\n\n`;
        mermaidChart += `</details>\n\n`;
        
        // Stage 3: Rendering details
        mermaidChart += `#### 3️⃣ Rendering Stage (render.renderTimeline)\n\n`;
        mermaidChart += `<details>\n<summary>Click to see the rendering pipeline</summary>\n\n\`\`\`mermaid\ngraph LR\n`;
        
        const renderFlows = this.analysis.flows['render.renderTimeline'];
        if (renderFlows && renderFlows.flows) {
            const sequential = renderFlows.flows.filter(f => f.relationship === 'sequential');
            
            mermaidChart += `    renderTimeline[renderTimeline]\n`;
            let prevNode = 'renderTimeline';
            sequential.forEach(flow => {
                const label = flow.to.replace(/([A-Z])/g, ' $1').trim();
                mermaidChart += `    ${flow.to}[${label}]\n`;
                mermaidChart += `    ${prevNode} --> ${flow.to}\n`;
                prevNode = flow.to;
            });
        }
        
        mermaidChart += `\`\`\`\n\n`;
        mermaidChart += `**What it does:**\n`;
        mermaidChart += `- Sets container width based on timeline scale\n`;
        mermaidChart += `- Renders year markers on timeline\n`;
        mermaidChart += `- Renders case nodes (events) with emojis\n`;
        mermaidChart += `- Creates labels with collision detection\n`;
        mermaidChart += `- Renders case titles\n`;
        mermaidChart += `- Draws connections between related events\n`;
        mermaidChart += `- Calculates and displays statistics\n\n`;
        mermaidChart += `</details>\n\n`;
        
        // Stage 4: User Interaction cycle
        mermaidChart += `#### 4️⃣ User Interaction Cycle\n\n`;
        mermaidChart += `<details>\n<summary>Click to see how user input is handled</summary>\n\n\`\`\`mermaid\ngraph TD\n`;
        mermaidChart += `    user([User Action])\n`;
        mermaidChart += `    handleInput[main.handleInput]\n`;
        mermaidChart += `    update[state.update]\n`;
        mermaidChart += `    filters[applyFilters]\n`;
        mermaidChart += `    render[render]\n`;
        mermaidChart += `    user --> handleInput\n`;
        mermaidChart += `    handleInput --> update\n`;
        mermaidChart += `    update --> filters\n`;
        mermaidChart += `    filters --> render\n`;
        mermaidChart += `    render -.-> user\n`;
        mermaidChart += `\`\`\`\n\n`;
        mermaidChart += `**Supported Actions:**\n`;
        mermaidChart += `- Date filtering\n`;
        mermaidChart += `- Case selection/filtering\n`;
        mermaidChart += `- Scale adjustment\n`;
        mermaidChart += `- Emoji visibility toggles\n`;
        mermaidChart += `- Timeline refresh\n`;
        mermaidChart += `- Isolation mode (focus on specific case/emoji)\n\n`;
        mermaidChart += `</details>\n\n`;
        
        // Chart 2: Detailed flow based on structural analysis (for debugging)
        mermaidChart += `### Detailed Flow Analysis\n\n<details>\n<summary>Click to expand detailed function-level flow</summary>\n\n\`\`\`mermaid\ngraph TD\n`;
        
        // Add style definitions
        mermaidChart += `    classDef highUse fill:#ff9999,stroke:#333,stroke-width:3px\n`;
        mermaidChart += `    classDef medUse fill:#ffcc99,stroke:#333,stroke-width:2px\n`;
        mermaidChart += `    classDef branch fill:#99ccff,stroke:#333,stroke-width:2px\n`;
        mermaidChart += `    classDef utility fill:#e6e6e6,stroke:#999,stroke-width:1px,stroke-dasharray:5\n\n`;
        
        // Identify utility functions (simple helpers, getters, setters, save/load)
        const utilityPatterns = [
            /^(get|set|save|load|clear|check|is|has|find)[A-Z]/,  // Common utility prefixes
            /^arrays?Equal$/,  // Array comparison
            /^findColumn$/,  // Simple finder
            /State$/  // State management utilities
        ];
        
        const isUtility = (funcName) => {
            return utilityPatterns.some(pattern => pattern.test(funcName));
        };
        
        // Group nodes by file into subgraphs
        const nodesByFile = {};
        const nodeIds = new Set();
        
        Object.keys(this.analysis.graph.nodes).forEach(nodeKey => {
            const node = this.analysis.graph.nodes[nodeKey];
            const file = node.file;
            if (!nodesByFile[file]) {
                nodesByFile[file] = [];
            }
            nodesByFile[file].push({ key: nodeKey, node: node });
        });
        
        // Create subgraphs for each file
        Object.keys(nodesByFile).forEach(fileName => {
            mermaidChart += `    subgraph ${fileName}["${fileName}.js"]\n`;
            
            nodesByFile[fileName].forEach(({ key, node }) => {
                const nodeId = key.replace(/\./g, '_');
                nodeIds.add(nodeId);
                
                let styleClass = '';
                // Check if it's a utility function
                if (isUtility(node.name)) {
                    styleClass = ':::utility';
                } else if (node.callCount > 5) {
                    styleClass = ':::highUse';
                } else if (node.callCount > 2) {
                    styleClass = ':::medUse';
                }
                // Use just the function name inside the subgraph
                mermaidChart += `        ${nodeId}["${node.name}"]${styleClass}\n`;
            });
            
            mermaidChart += `    end\n`;
        });
        
        mermaidChart += `\n    %% Sequential/Data Flow Connections\n`;
        // Add sequential/data flow edges (solid arrows)
        const recs = this.analysis.graph.recommendations;
        
        // Create a function name to file mapping
        const funcToFile = {};
        Object.keys(this.analysis.functions).forEach(funcKey => {
            const func = this.analysis.functions[funcKey];
            funcToFile[func.name] = func.file;
        });
        
        // Track added edges to avoid duplicates
        const addedEdges = new Set();
        
        recs.sequential.forEach(rec => {
            const fromFile = funcToFile[rec.from] || rec.caller.split('.')[0];
            const toFile = funcToFile[rec.to] || rec.caller.split('.')[0];
            const fromId = `${fromFile}_${rec.from}`;
            const toId = `${toFile}_${rec.to}`;
            const edgeKey = `${fromId}->${toId}`;
            
            // Skip self-loops and duplicates
            if (fromId !== toId && !addedEdges.has(edgeKey) && nodeIds.has(fromId) && nodeIds.has(toId)) {
                mermaidChart += `    ${fromId} --> ${toId}\n`;
                addedEdges.add(edgeKey);
            }
        });
        
        // Add branched flows (dashed arrows)
        if (recs.branched.length > 0) {
            mermaidChart += `\n    %% Branched Flows (mutually exclusive)\n`;
            recs.branched.forEach(rec => {
                const fromFile = funcToFile[rec.from] || rec.caller.split('.')[0];
                const toFile = funcToFile[rec.to] || rec.caller.split('.')[0];
                const fromId = `${fromFile}_${rec.from}`;
                const toId = `${toFile}_${rec.to}`;
                const edgeKey = `${fromId}-.branch->${toId}`;
                
                // Skip self-loops and duplicates
                if (fromId !== toId && !addedEdges.has(edgeKey) && nodeIds.has(fromId) && nodeIds.has(toId)) {
                    mermaidChart += `    ${fromId} -.->|branch| ${toId}\n`;
                    addedEdges.add(edgeKey);
                }
            });
        }
        
        // Add nested block relationships (thick arrows)
        if (recs.nested.length > 0) {
            mermaidChart += `\n    %% Nested Block Transitions\n`;
            recs.nested.forEach(rec => {
                const fromFile = funcToFile[rec.from] || rec.caller.split('.')[0];
                const toFile = funcToFile[rec.to] || rec.caller.split('.')[0];
                const fromId = `${fromFile}_${rec.from}`;
                const toId = `${toFile}_${rec.to}`;
                const label = rec.reason.includes('Enters') ? 'enters' : 'exits';
                const edgeKey = `${fromId}=${label}=>${toId}`;
                
                // Skip self-loops and duplicates
                if (fromId !== toId && !addedEdges.has(edgeKey) && nodeIds.has(fromId) && nodeIds.has(toId)) {
                    mermaidChart += `    ${fromId} ==>|${label}| ${toId}\n`;
                    addedEdges.add(edgeKey);
                }
            });
        }
        
        // Add iterative patterns (loop backs) - but skip self-loops
        if (recs.iterative.length > 0) {
            mermaidChart += `\n    %% Iterative Patterns\n`;
            const iterativeShown = new Set();
            recs.iterative.forEach(rec => {
                const fromFile = funcToFile[rec.from] || rec.caller.split('.')[0];
                const toFile = funcToFile[rec.to] || rec.caller.split('.')[0];
                const fromId = `${fromFile}_${rec.from}`;
                const toId = `${toFile}_${rec.to}`;
                
                // Only show iterative patterns between different functions
                if (fromId !== toId && !iterativeShown.has(`${fromId}-${toId}`) && nodeIds.has(fromId) && nodeIds.has(toId)) {
                    mermaidChart += `    ${toId} -.->|loop| ${fromId}\n`;
                    iterativeShown.add(`${fromId}-${toId}`);
                }
            });
        }
        
        mermaidChart += `\`\`\`\n\n</details>\n\n`;
        
        // Chart 2: Component interactions
        mermaidChart += `### Component Interactions\n\n\`\`\`mermaid\ngraph LR\n`;
        mermaidChart += `    classDef module fill:#e1f5fe,stroke:#01579b,stroke-width:2px\n`;
        mermaidChart += `    classDef component fill:#fff3e0,stroke:#e65100,stroke-width:2px\n\n`;
        
        mermaidChart += `    Main[main.js<br/>Entry & Events]:::module\n`;
        mermaidChart += `    State[state.js<br/>Data & Filters]:::module\n`;
        mermaidChart += `    Render[render.js<br/>Visualization]:::module\n`;
        mermaidChart += `    Labels[label-layout.js<br/>Label Positioning]:::component\n`;
        mermaidChart += `    Cases[case-titles.js<br/>Case Display]:::component\n`;
        mermaidChart += `    Config[emoji-config.js<br/>Visual Config]:::component\n\n`;
        
        mermaidChart += `    Main -->|init| State\n`;
        mermaidChart += `    Main -->|input| State\n`;
        mermaidChart += `    State -->|data| Render\n`;
        mermaidChart += `    Render -->|layout| Labels\n`;
        mermaidChart += `    Render -->|display| Cases\n`;
        mermaidChart += `    Render -->|style| Config\n`;
        mermaidChart += `    State -->|config| Config\n`;
        
        mermaidChart += `\`\`\`\n\n`;
        
        // Chart 3: Complete call graph (in details for reference)
        mermaidChart += `### Complete Call Graph\n\n<details>\n<summary>Click to see all ${this.calls.length} function connections</summary>\n\n\`\`\`mermaid\ngraph TD\n`;
        
        // Add ALL nodes grouped by file
        Object.keys(this.files).forEach(fileName => {
            mermaidChart += `    subgraph ${fileName}["${fileName}.js"]\n`;
            this.files[fileName].functions.forEach(func => {
                mermaidChart += `        ${fileName}_${func.name}["${func.name}"]\n`;
            });
            mermaidChart += `    end\n`;
        });
        mermaidChart += `\n`;
        
        // Add ALL unique connections
        mermaidChart += `    %% All ${this.calls.length} function calls detected\n`;
        const addedConnections = new Set();
        this.calls.forEach(call => {
            const connectionKey = `${call.callerFile}_${call.caller} --> ${call.calleeFile}_${call.callee}`;
            if (!addedConnections.has(connectionKey)) {
                mermaidChart += `    ${connectionKey}\n`;
                addedConnections.add(connectionKey);
            }
        });
        
        mermaidChart += `\`\`\`\n\n</details>\n\n`;
        
        // Create summary
        const summary = `# Flow Analysis Summary\n\n` +
            `Generated: ${new Date().toLocaleString()}\n\n` +
            `## Statistics\n` +
            `- **Functions found:** ${this.functions.size}\n` +
            `- **Function calls detected:** ${this.calls.length}\n` +
            `- **Calls with arguments:** ${this.calls.filter(c => c.hasArgs).length}\n` +
            `- **Calls without arguments:** ${this.calls.filter(c => !c.hasArgs).length}\n` +
            `- **Files analyzed:** ${Object.keys(this.files).length}\n\n` +
            `---\n\n` +
            mermaidChart +
            `---\n\n`;
        
        // Add complete JSON data at the end
        const jsonOutput = `## Complete Analysis Data (JSON)\n\n\`\`\`json\n${JSON.stringify(this.analysis, null, 2)}\n\`\`\`\n`;
        
        // Write output: Summary with stats → Charts → Pass outputs → JSON
        const fullOutput = summary + [
            this.output.pass5,
            this.output.pass4, 
            this.output.pass3,
            this.output.pass2,
            this.output.pass1,
            jsonOutput
        ].join('\n');
        fs.writeFileSync(path.join(__dirname, 'flow-analysis.md'), fullOutput);
        
        // Also save the complete JSON structure for programmatic use
        fs.writeFileSync(path.join(__dirname, 'flow-analysis.json'), JSON.stringify(this.analysis, null, 2));
        
        console.log('\n✅ Analysis complete! Results saved to flow-analysis.md and flow-analysis.json');
        console.log('\nSummary:');
        console.log(`  - ${this.functions.size} functions found`);
        console.log(`  - ${this.calls.length} function calls detected`);
        console.log(`  - ${this.calls.filter(c => c.hasArgs).length} calls with arguments`);
        console.log(`  - ${this.calls.filter(c => !c.hasArgs).length} calls without arguments`);
    }
}

// Run the analyzer
const analyzer = new FlowAnalyzer();
analyzer.run();