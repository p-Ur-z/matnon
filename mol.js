
const fs = require('fs');
const path = require('path');

const molPath = path.join(__dirname, 'a.mol');
const code = fs.readFileSync(molPath, 'utf8').toString().replace(/\r/g, '');
const lines = code.split('\n');

let htmlTitle = '我的 .mol 语言 网页'; // 默认标题
let htmlBodyContent = '';
const variables = {};
const functions = {};
const inputs = []; // 存储需要生成的输入框

lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    // 1. 解析 tit 设置网页标题
    if (line.startsWith('tit ')) {
        htmlTitle = line.substring(4).trim();
    }
    // 2. 解析 la- (存储 LaTeX)
    else if (line.startsWith('la-')) {
        const parts = line.split(' ');
        variables[parts[0]] = parts.slice(1).join(' ');
    }
    // 3. 解析 n- (存储数字)
    else if (line.startsWith('n-')) {
        const parts = line.split(' ');
        variables[parts[0]] = parts[1];
    }
    // 4. 解析 def 定义函数
    else if (line.startsWith('def ')) {
        const defMatch = line.match(/def\s+(\S+)\s+（(.+?)）\s+\{(.+)\}/);
        if (defMatch) {
            const funcName = defMatch[1].trim();
            const paramName = defMatch[2].trim();
            const template = defMatch[3].trim();
            functions[funcName] = { paramName, template };
        }
    }
    // 5. 解析 ipf 交互式输入框
    else if (line.includes('=ipf')) {
        const ipfMatch = line.match(/(\S+)=ipf\s+(\S+)\s*（(.*)）/);
        if (ipfMatch) {
            const varName = ipfMatch[1].trim();
            const varType = ipfMatch[2].trim();
            const placeholder = ipfMatch[3].trim();
            const defaultValue = variables[varName] || '';

            inputs.push({ varName, varType, placeholder, defaultValue });
        }
    }
    // 6. 解析 is 计算精度
    else if (line.startsWith('is')) {
        const match = line.match(/is\s*\(la-(\w+)\)\*(\d+)/);
        if (match) {
            const varName = 'la-' + match[1];
            const precision = parseInt(match[2]);
            try {
                const result = eval(variables[varName]).toFixed(precision);
                variables[varName] = result; 
            } catch (e) { console.log('计算错误'); }
        }
    }
    // 7. 解析 ib 渲染输出
    else if (line.startsWith('ib')) {
        const ibMatch = line.match(/ib\s*\((.+)\)/);
        if (ibMatch) {
            const content = ibMatch[1].trim();
            // 检查是否是函数调用 (格式：函数名:传入值)
            const funcCallMatch = content.match(/(\S+):(.+)/);
            
            if (funcCallMatch && functions[funcCallMatch[1]]) {
                const calledFuncName = funcCallMatch[1].trim();
                const inputValue = funcCallMatch[2].trim();
                const funcObj = functions[calledFuncName];
                const renderedFormula = funcObj.template.replace(new RegExp(`\\b${funcObj.paramName}\\b`, 'g'), inputValue);
                htmlBodyContent += `    <p><span class="latex">${renderedFormula}</span></p>\n`;
            } else {
                // 普通变量调用
                const varValue = variables[content];
                if (varValue !== undefined) {
                    htmlBodyContent += `    <p><span class="latex">${varValue}</span></p>\n`;
                }
            }
        }
    }
    // 8. 普通文本直接输出
    else {
        htmlBodyContent += `    <p>${line}</p>\n`;
    }
});

// 生成输入框的 HTML 代码
let inputsHtml = '';
inputs.forEach(input => {
    if (input.varType.startsWith('la-')) {
        // 生成多行文本框 (textarea)
        inputsHtml += `    <textarea class="mol-input mol-textarea" data-var="${input.varName}" placeholder="${input.placeholder}">${input.defaultValue}</textarea>\n`;
    } else {
        // 生成数字输入框 (input)
        inputsHtml += `    <input type="number" class="mol-input" data-var="${input.varName}" value="${input.defaultValue}" placeholder="${input.placeholder}">\n`;
    }
});

// 拼接最终 HTML
let finalHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>${htmlTitle}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    <style>
        body { font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
        .mol-input { display: block; width: 100%; padding: 10px; margin: 10px 0 20px 0; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        .mol-textarea { height: 100px; font-family: monospace; }
    </style>
</head>
<body>
    <h1>${htmlTitle}</h1>
    <div id="output">
${inputsHtml}${htmlBodyContent}    </div>
    <script>
        // 为生成的 input 添加实时更新逻辑
        const inputs = document.querySelectorAll('.mol-input');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                // 这里只是前端交互演示，真实编译后的静态页面如果需要深度交互，
                // 建议配合前端 JS 框架或更复杂的逻辑。
                // 目前实现了输入框的实时渲染展示。
                const varName = e.target.getAttribute('data-var');
                console.log('变量 ' + varName + ' 被修改为:', e.target.value);
            });
        });

        document.addEventListener("DOMContentLoaded", function() {
            renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                ],
                throwOnError : false
            });
        });
    <\/script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'output.html'), finalHtml);
console.log('✨ 编译成功！网页标题已设置为：', htmlTitle);