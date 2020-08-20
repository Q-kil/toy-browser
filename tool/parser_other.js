const css = require('css');

const EOF = Symbol('EOF');
let currentToken = null;
let currentAttribute = null;
let currentTextNode = null;
let stack = [{type: 'document', children: []}];

//  把所有addCssRules收集的规则暂存在数组里
let rules = [];
function addCSSRules(text) {
    let ast = css.parse(text);
    console.log(ast);
    rules.push(...ast.stylesheet.rules);
}

//  计算css规则,估计specificity和后来有限覆盖规则覆盖
//  specificity是个四元组，越左边权重越高 [0(inline), 0(id), 0(class), 0(tagName)]
//  用正则匹配复杂选择器
const REGEX_SELECTOR = /[a-zA-Z]{1}[a-zA-Z0-9]*|\.[a-zA-Z]{1}[a-zA-Z0-9]*|\#[a-zA-Z]{1}[a-zA-Z0-9]+/g;

function specificityMatchRegex(matchArr, p) {
    matchArr.forEach((match) => {
        if(match.charAt(0) === '#') {
            p[1] += 1;
        } else if(match.charAt(0) === '.') {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    })
}

function specificityComplex(selector) {
    let p = [0, 0, 0, 0];
    let selectorParts = selector.split(' ');
    for (const part of selectorParts) {
        const match = part.match(REGEX_SELECTOR);
        if(Array.isArray(match) && match.length) {
            specificityMatchRegex(match, p);
        }else {
            if(part.charAt(0) === '#') {
                p[1] += 1;
            } else if(part.charAt(0) === '.') {
                p[2] += 1;
            } else {
                p[3] += 1;
            }
        }
    }
}

function specificity(selector) {
    let p = [0, 0, 0, 0];
    let selectorParts = selector.split(' ');
    for (const part of selectorParts) {
        if(part.charAt(0) === '#') {
            p[1] += 1;
        } else if(part.charAt(0) === '.') {
            p[2] += 1;
        } else {
            p[3] += 1;
        }
    }
    return p;
}

function compare(sp1, sp2) {
    if(sp1[0] - sp2[0])
        return sp1[0] - sp2[0];
    if(sp1[1] - sp2[1])
        return sp1[1] - sp2[1];
    if(sp1[2] - sp2[2])
        return sp1[2] - sp2[2];
    return sp1[3] - sp2[3];
}

//  目前只有简单选择器
function match(element, selector) {
    if(!selector || !element.attribuites) {
        return false;
    }
    if(selector.charAt(0) === '#') {
        let attr = element.attribuites.filter(attr => attr.name === 'id')[0];
        if(attr && attr.value === selector.replace('#', '')) {
            return true;
        }
    } else if(selector.charAt(0) === '.') {
        let attr = element.attribuites.filter(attr => attr.name === 'class')[0];
        if(attr && attr.value === selector.replace('.', '')) {
            return true;
        }
        //  匹配带空格的class选择器
        if(attr && attr.value.split(' ').includes(selector.replace('.', ''))) {
            return true;
        }
    } else {
        if(selector === element.tagName) {
            return true;
        }
    }
    return false;
}

function computeCSS(element) {
    //  将DOM树反转，由子到父的去匹配规则
    let elements = stack.slice().reverse();
    if(!element.computedStyle) {
        element.computedStyle = {};
    }
    for (let rule of rules) {
        //  将规则反转，由子到父的去匹配elemnet
        let selectorParts = rule.selectors[0].split(" ").reverse()

        if(!match(element, selectorParts[0]))
            continue;

        let matched = false;

        let j = 1;
        //  验证父元素规则是否匹配
        for(let i = 0; i < elements.length; i++) {
            if(match(elements[i], selectorParts[j])) {
                j++;
            }
        }
        if(j >= selectorParts.length) {
            matched = true;
        }

        if(matched) {
            //  如果匹配到，则加入规则
            let sp = specificity(rule.selectors[0]);
            let computedStyle = element.computedStyle;
            for (let declaration of rule.declarations) {
                if(!computedStyle[declaration.property]) {
                    computedStyle[declaration.property] = {}
                }
                if(!computedStyle[declaration.property].specificity) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                }else if(compare(computedStyle[declaration.property].specificity, sp) < 0) {
                    computedStyle[declaration.property].value = declaration.value;
                    computedStyle[declaration.property].specificity = sp;
                }
                
            }
            console.log(element.computedStyle);
        }
    }
}

function emit(token) {
  console.log('token', token);
  
    let top = stack[stack.length - 1];
    //  node生成
    //  开始标签
    if(token.type === 'startTag') {
        let element = {
            type: 'element',
            children: [],
            attribuites: []
        }

        element.tagName = token.tagName;

        Object.keys(token).forEach(key => {
            if(key !='type' && key != 'tagName' && key != 'isSelfClosing') {
                element.attribuites.push({
                    name: key,
                    value: token[key]
                })
            }
        });
        console.log('element', element);

        //  在startTag开始的时候，判断哪些标签匹配了CssRules
         computeCSS(element);

        top.children.push(element);
        element.parent = top;

        if(!token.isSelfClosing) {
            stack.push(element);
        }

        currentTextNode = null;
    } 

    //  闭合标签
    else if(token.type === 'endTag') {
        if(top.tagName != token.tagName) {
            throw new Error('HTML结构有误！')
        }else {
            //  遇到style标签时，执行添加CSS规则操作
            if(token.tagName === 'style') {
                addCSSRules(top.children[0].content)
            }
            stack.pop();
        }
    }

    //  文本节点
    else if(token.type === 'text') {
        if(currentTextNode == null) {
            currentTextNode = {
                type: 'text',
                content: ''
            }
            top.children.push(currentTextNode);
        }
        currentTextNode.content += token.content;
    }
}

function data(c) {
    if(c === '<') {
        return tagOpen
    }else if(c == EOF) {
        emit({
            type: 'EOF'
        })
        return;
    }else {
        emit({
            type: 'text',
            content: c
        })
        return data;
    }
}

function tagOpen(c) {
    if(c === '/') {
        return endTagOpen;
    } else if(c.match(/^[a-zA-Z]$/)) {
        currentToken = {
            type: 'startTag',
            tagName: ''
        }
        return tagName(c);
    } else {
        return;
    }
}

function endTagOpen(c) {
    if(c.match(/^[a-zA-z]$/)) {
        currentToken = {
            type: 'endTag',
            tagName: ''
        }
        return tagName(c);
    } else if(c === '>'){

    } else if(c == EOF) {

    } else {

    }
}

function tagName(c) {
    if(c.match(/^[\t\n\f $]/)) {
        return beforeAttribuiteName;
    } else if(c === '/') {
        //  自封闭标签
        return selfClosingStartTag;
    } else if(c.match(/^[a-zA-z]$/)) {
        currentToken.tagName += c;
        return tagName;
    } else if(c === '>') {
        emit(currentToken);
        return data
    } else {
        return tagName;
    }
}

function beforeAttribuiteName(c) {
    if(c.match(/^[\t\n\f $]/)) {
        return beforeAttribuiteName;
    } else if(c === '/' || c ==='>' || c == EOF) {
        return afterAttribuiteName(c);
    } else if(c === '=') {

    } else {
        currentAttribute = {
            name: '',
            value: ''
        }
        return attribuiteName(c);
    }
}

function attribuiteName(c) {
    if(c.match(/^[\t\n\f $]/) || c === '/' || c === '>' || c === EOF) {
        return afterAttribuiteName(c);
    } else if(c === '=') {
         return beforeAttribuiteValue;
    } else if(c === "\u0000") {

    } else if(c === "\"" || c === '<' || c === "'") {

    } else {
        currentAttribute.name += c;
        return attribuiteName;
    }
}

function afterAttribuiteName(c) {
    if(c === '/') {
        return selfClosingStartTag;
    } else if(c === '>') {
        emit(currentToken);
        return data;
    } else if(c.match(/^[\t\n\f $]/)) {
        return beforeAttribuiteName
    }
}

function beforeAttribuiteValue(c) {
    if(c.match(/^[\t\n\f $]/) || c === '>' || c == EOF || c === '/') {
        return beforeAttribuiteValue;
    } else if(c === "'") {
        return singleQuoteAttribuiteValue;
    } else if(c === "\"") {
        return dubboQuoteAttribuiteValue
    } else {
        return unQuoteAttribuiteValue(c);
    }
}

function singleQuoteAttribuiteValue(c) {
    if(c === "'") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if(c === 'EOF') {

    } else if(c === '\u0000') {

    }else {
        currentAttribute.value += c;
        return singleQuoteAttribuiteValue;
    }
}

function dubboQuoteAttribuiteValue(c) {
    if(c === "\"") {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return afterQuotedAttributeValue;
    } else if(c === 'EOF') {

    } else if(c === '\u0000') {

    } else {
        currentAttribute.value += c;
        return dubboQuoteAttribuiteValue;
    }
}

function afterQuotedAttributeValue(c) {
    if(c.match(/^[\t\n\f $]/)) {
        return beforeAttribuiteName;
    } else if(c === '/') {
        return selfClosingStartTag;
    } else if(c === '>') {
        emit(currentToken);
        return data;
    } else if(c === 'EOF') {

    } else {
        
    }
}

function unQuoteAttribuiteValue(c) {
    if(c.match(/^[\t\n\f $]/)) {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return beforeAttribuiteName;
    } else if(c === '/') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        return selfClosingStartTag;
    } else if(c === '>') {
        currentToken[currentAttribute.name] = currentAttribute.value;
        emit(currentToken);
        return data;
    } else if(c === '\u0000') {

    } else if(c === "\"" || c === "'" || c === '<' || c === '=') {

    } else {
        currentAttribute.value += c;
        return unQuoteAttribuiteValue;
    }
}

function selfClosingStartTag(c) {
    if(c === '>') {
        currentToken.isSelfClosing = true;
        emit(currentToken);
        return data;
    } else if(c == EOF){
        
    }else {

    }
}

module.exports.parseHTML = function parseHtml(html) {
    let state = data;
    for (const c of html) {
        state = state(c);
    }
    state = state(EOF);
    console.log(stack)
    return stack[0];
}
