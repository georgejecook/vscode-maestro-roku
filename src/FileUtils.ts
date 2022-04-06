import * as path from 'path';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import getLinesForJsonKeys from './JsonParser';
import * as fs from 'fs';

export default class FileUtils {
  public getAlternateFileName(filename: string): string | undefined {
    let name = filename ? filename : '';


    if (name.endsWith('.bs')) {
      return name.substring(0, name.length - 4) + '.spec.bs';
    } else if (name.endsWith('.spec.bs')) {
      return name.substring(0, name.length - 3) + '.bs';
    } else if (name.endsWith('.json')) {
      return name.substring(0, name.length - 4) + '.';
    } else {
      return undefined;
    }
  }

  public getSpecFileName(filename: string): string | undefined {
    let name = filename ? filename : '';

    if (name.endsWith('.bs')) {
      return name.substring(0, name.length - 2) + 'spec.bs';
    } else if (name.endsWith('.brs')) {
      return name;
    }
  }

  public getStyleFilename() {
    return this.getWorkspaceFilePath('src/meta/Styles.json');
  }
  public getTDDFilename() {
    return this.getTDDUri()?.fsPath;
  }
  public getTDDUri() {
    return this.getWorkspaceFileUri('bsconfig-tdd.json');
  }

  public getJsonLineNumberWithKey(filepath: string, searchKey: string) {
    let matchedLine = -1;
    let fileText = fs.readFileSync(filepath).toString();
    if (fileText) {

      getLinesForJsonKeys(fileText, function (key, line) {
        console.log('got key', key);
        if (key === searchKey) {
          matchedLine = line -1;
          return false;
        }
        return true;
      });
    }
    return matchedLine;
  }

  public getWorkspaceFilePath(filepath: string) {
    let root = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
    if (root) {
      return vscode.Uri.file(path.join(root.uri.fsPath, filepath)).fsPath;
    }
    return undefined;
  }
  public getWorkspaceFileUri(filepath: string) {
    let root = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
    if (root) {
      return vscode.Uri.file(path.join(root.uri.fsPath, filepath));
    }
    return undefined;
  }

  public getBundleFileName(filename: string): string | undefined {
    let name = filename ? filename : '';
    let nameParsed = path.parse(name.replace('.spec.bs', '').replace('.bs', ''));
    return path.join(`${path.join(nameParsed.dir, nameParsed.name)}.bundle`, `${nameParsed.name}.json`);
  }

  public getCodeFileName(filename: string): string | undefined {
    let name = filename ? filename : '';

    if (name.endsWith('.spec.bs')) {
      return name.substring(0, name.length - 7) + 'bs';
    } else if (name.endsWith('.bs')) {
      return name;
    } else if (name.endsWith('.json')) {
      //assuming we are a bundle
      let nameParsed = path.parse(filename);
      let filePath = path.resolve(nameParsed.dir, '..');
      let bsName = `${path.join(filePath, nameParsed.name)}.bs`;
      return bsName;
    } else {
      return undefined;
    }
  }
}
