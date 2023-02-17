import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as iconv from 'iconv-lite';
import {
  Location,
  Position,
  Range,
  SymbolKind,
  TextDocument,
  Uri
} from 'vscode';
import { WorkspaceEncoding } from './WorkspaceEncoding';

export default class DocumentUtils {
  private encoding: WorkspaceEncoding = new WorkspaceEncoding();

  public getWord(document: TextDocument, position: Position): string {
    const range = document.getWordRangeAtPosition(position, /[^\s\x21-\x2f\x3a-\x40\x5b-\x5e\x7b-\x7e]+/);
    if (range !== undefined) {
      return document.getText(range);
    }
  }

  public getFullQuotedString(document: TextDocument, position: Position): string {
    const range = document.getWordRangeAtPosition(position, /[a-zA-Z0-9_\-\.~]+/);
    if (range !== undefined) {
      return document.getText(range).replace(/\"/g, '');
    }
  }

  public createRange(startLine: number, endLine: number) {
    let startPosition = new Position(startLine, 0);
    let endPosition = new Position(endLine, 0);
    return new vscode.Range(startPosition, endPosition);
  }

  public async findTextInFile(uri: Uri, text: string, startLine = -1, forward = true, findFirst = true): Promise<Location[]> {
    let locations = [];
    let fileText = this.getFileTextFromOpenDocumentWithUri(uri) ?? fs.readFileSync(uri.fsPath).toString();
    locations = locations.concat(this.findWordInFile(uri, fileText, text, startLine, forward, findFirst));
    return locations;
  }

  public getOpenDocumentWithUri(uri: Uri) {
    return this.getTextEditorWithUri(uri)?.document;
  }

  public getFileTextFromOpenDocumentWithUri(uri: Uri) {
    return this.getTextEditorWithUri(uri)?.document?.getText();
  }

  public getTextEditorWithUri(uri: Uri) {
    for (let editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.fsPath === uri.fsPath) {
        return editor;
      }
    }
  }

  public async getFileTextAsLines(uri: Uri): Promise<string[]> {
    let fileText = this.getFileTextFromOpenDocumentWithUri(uri) ?? fs.readFileSync(uri.fsPath).toString();
    return fileText ? fileText.split(/\r?\n/) : [];
  }

  public async findTextInText(uri: Uri, fileText: string, text: string, startLine = -1, forward = true, findFirst = true): Promise<Location[]> {
    let locations = [];
    locations = locations.concat(this.findWordInFile(uri, fileText, text, startLine, forward, findFirst));
    return locations;
  }

  public async findTextInOpenFile(document: TextDocument, text: string, startLine = -1, forward = true, findFirst = true): Promise<Location[]> {
    let locations = [];
    locations = locations.concat(this.findWordInFile(document.uri, document.getText(), text, startLine, forward, findFirst));
    return locations;
  }

  public getLineInOpenFile(document: TextDocument, lineNumber: number): string {
    const lines = document.getText().split(/\r?\n/);
    return lines[lineNumber];
  }

  public gotoLocation(position: Location) {
    let editor = vscode.window.activeTextEditor;
    editor.selection = new vscode.Selection(
      position.range.start.line,
      position.range.start.character,
      position.range.start.line,
      position.range.start.character,
    );
    vscode.commands.executeCommand('revealLine', {
      lineNumber: position.range.start.line,
      at: 'center'
    });

  }

  private findWordInFile(uri: Uri, input: string, word: string, startLine = -1, forward = true, findFirst): Location[] {
    let locations = [];
    let searchTerm = word;
    let regex = new RegExp(searchTerm, 'ig');
    for (const [line, text] of iterateLines(input, startLine, forward)) {
      let result;
      while (result = regex.exec(text)) {
        locations.push(new Location(uri, new Position(line, result.index)));
        if (findFirst) {
          return locations;
        }
      }
    }
    return locations;
  }

  public matchTextInFile(input: string, regex: RegExp, startLine = -1, forward = true, findFirst = true) {
    let matches = [];
    for (const [line, text] of iterateLines(input, startLine, forward)) {
      let result;
      while (result = regex.exec(text)) {
        matches.push(result);
        if (findFirst) {
          return result;
        }
      }
    }
    return matches;
  }

  public async removeLinesMatchingRegex(uri: Uri, regex: RegExp) {
    let isChanged = false;
    console.log("searching ", uri.fsPath);
    let lines = await (await this.getFileTextAsLines(uri)).filter((l) => {
      if (regex.test(l)) {
        isChanged = true;
        return false;
      } else {
        return true;
      }
    }
    );
    if (isChanged) {
      let text = lines.join('\r');
      await this.updateDocumentText(uri, text);
    }
  }

  public async updateDocumentText(uri: Uri, text: string, save = true) {
    let editor = this.getTextEditorWithUri(uri);
    if (editor) {
      let oldSelection = editor.selection;
      await editor.edit((editBuilder) => {
        let doc = editor.document;
        editBuilder.replace(new vscode.Range(doc.lineAt(0).range.start, doc.lineAt(doc.lineCount - 1).range.end), text);
      });
      editor.selection = oldSelection;
    } else {
      fs.writeFileSync(uri.fsPath, text);
    }
  }
}

function* iterateLines(input: string, startLine = -1, forward = true): IterableIterator<[number, string]> {
  const lines = input.split(/\r?\n/);
  if (forward) {
    let start = startLine > -1 ? startLine : 0;
    for (let i = start; i < lines.length; i++) {
      const text = lines[i];
      if (/^\s*(?:$|;(?![!#];))/.test(text)) {
        continue;
      }
      yield [i, text];
    }
  } else {
    let start = startLine > -1 ? startLine : lines.length;

    for (let i = start; i >= 0; i--) {
      const text = lines[i];
      if (/^\s*(?:$|;(?![!#];))/.test(text)) {
        continue;
      }
      yield [i, text];
    }
  }

}
  // for (let i = 0; i < lines.length; i++) {
  //   const text = lines[i];
  //   if (/^\s*(?:$|;(?![!#];))/.test(text)) {
  //     continue;
  //   }
  //   yield [i, text];
  // }


