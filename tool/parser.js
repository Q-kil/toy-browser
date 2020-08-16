let currentToken = null;
let currentAttribute = null;

let stack = [{ type: 'document', children: [] }];

function emit(token) {
  // if (token.type === 'text')
  //   return;
  let top = stack[stack.length - 1];

  if (token.type == 'startTag') {
    let element = {
      type: 'element',
      children: [],
      attributes: []
    };

    element.tagName = token.tagName;

    for (let p in token) {
      if (p != 'type' && p != 'tagName')
        element.attributes.push({
          name: p,
          value: token[p]
        })
    }

    top.children.push(element);
    element.parent = top;

    if (!token.isSelfClosing)
      stack.push(element);

    currentTextNode = null;
  } else if (token.type == 'endTag') {
    if (top.tagName != token.tagName) {
      throw new Error("Tag start end doesn't match!")
    } else {
      stack.pop();
    }
    currentTextNode = null;
  } else if (token.type == 'text') {
    if (currentTextNode == null) {
      currentTextNode = {
        type: 'text',
        content: ''
      }
      top.children.push(currentTextNode);
    }
    currentTextNode.content += token.content;
  }
}

const EOF = Symbol("EOF");

function data(c) {
  if (c == '<') {
    return tagOpen;
  } else if (c == EOF) {
    return;
  } else {
    return data;
  }
}

function tagOpen(c) {
  if (c == '/') {
    return endTagOpen;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "startTag",
      tagName: ''
    }
    return tagName(c);
  } else {
    return;
  }
}

function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: 'endTag',
      tagName: ''
    }
    return tagName(c);
  } else if (c == '>') {

  } else if (c == EOF) {

  } else {

  }
}

function tagName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c == '/') {
    return selfClosingStartTag;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c;
    return tagName;
  } else if (c == '>') {
    return data;
  } else {
    return tagName;
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c == '>') {
    return data;
  } else if (c == '=') {
    return beforeAttributeName;
  } else {
    return beforeAttributeName;
  }
}

function selfClosingStartTag(c) {
  if (c == '>') {
    currentToken.isSelfClosing = true;
    return data;
  } else if (c == 'EOF') {

  } else {

  }
}

function match(element, selector) {
  if (!selector || !element.attributes) {
    return false;
  }
  if (selector.charAt(0) == '#') {
    let attr = element.attributes.filter(attr => attr.name == 'id')[0];
    if (attr && attr.value == selector.replace('#', '')) {
      return true;
    }
  } else if (selector.charAt(0) == '.') {
    let attr = element.attributes.filter(attr => attr.name == 'class')[0];
    if (attr && attr.value == selector.replace('.', '')) {
      return true;
    }
  } else {
    if (element.tagName == selector)
      return true;
  }
  return false;
}

function specificity(selector) {
  let p = [0, 0, 0, 0];
  let selectorParts = selector.split(' ');
  for (let part of selectorParts) {
    if (selectorParts.match(/^[a-zA-Z]+([\.|#][a-zA-Z_-][\w-]+)/)) {
      selectorParts.push(RegExp.$1);
      selectorParts = selectorParts.replace(RegExp.$1, '');
      split(selectorParts);
    } else if (part.charAt(0) == '#') {
      p[1] += 1;
    } else if (part.charAt(0) == '.') {
      p[2] += 1;
    } else {
      p[3] += 1;
    }
  }
  return p;
}

module.exports.parseHTML = function parseHTML(html) {
  console.log('html', html);
  let state = data;
  for (let c of html) {
    state = state(c);
  }
  state = state(EOF)
}