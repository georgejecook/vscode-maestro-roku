let lastString = "";
let addLevel;
let stack = [];

let _isRunning = true;

export default function getLinesForJsonKeys(data, cb) {
  let lead = true;
  let inString: any = false;
  let inEscape = false;
  let inComment = false;
  let line = 1;

  lastString = "";
  addLevel;
  stack = [];
  _isRunning = true;

  addLevel = true;
  for (var i = 0; i < data.length; i++) {
    var ch = data.charAt(i);
    if (ch === '\n') {
      line++;
    }
    if (lead && (ch !== '{')) {
      continue;
    }
    lead = false;
    if ((inString !== false) && (ch === '\\')) {
      inEscape = true;
      continue;
    }
    if (inEscape) {
      inEscape = false;
      continue;
    }
    if (inComment && ch !== '\n') {
      continue;
    } else {
      inComment = false;
    }
    if ((ch === '/') && (inString === false)) {
      if (data.charAt(i + 1) === '/') {
        inComment = true;
      }
    }
    if (ch === '\'' || ch === '"') {
      if (inString !== false) {
        gotString(inString);
        inString = false;
      } else {
        inString = "";
        continue;
      }
    }
    if ((ch === '{') && (inString === false)) {
      gotIn();
    }
    if ((ch === '}') && (inString === false)) {
      gotOut();
    }
    if ((ch === ':') && (inString === false)) {
      gotColon(line, cb);
      if (!_isRunning) {
        return;
      }
    }
    if ((ch === ',') && (inString === false)) {
      gotComma();
    }
    if (inString !== false) {
      inString += ch;
    }

  }
}

function gotIn() {
  addLevel = true;
}

function gotOut() {
  if (!addLevel) {
    stack.pop();
  }
  addLevel = false;
}

function gotString(s) {
  lastString = s;
}

function gotColon(line, cb) {
  if (!addLevel) {
    stack.pop();
  }
  stack.push(lastString);
  addLevel = false;
  if (typeof cb === "function") {
    if (!cb(stack.join("."), line)) {
      _isRunning = false;
    }
  }
}

function gotComma() {
}