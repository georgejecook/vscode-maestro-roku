import * as path from 'path';
import * as vscode from 'vscode';
import { Uri } from 'vscode';
import getLinesForJsonKeys from './JsonParser';
import * as fs from 'fs';

export default class FileUtils {

  ensurePathExists(targetPath: string) {
    //if all parts of targetPath do not exist, create them now
    let relativePathParts = targetPath;
    fs.mkdirSync(relativePathParts, { recursive: true });
  }

  async getLocalTemplatesPath() {
    return await this.getPathToWorkSpaceFolder(path.join('.vscode', '.maestro-templates'));
  }
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

  public async getStyleFilename(): Promise<string> {
    let files = await this.findFileInWorkspace('**/Styles.json');
    return files[0].fsPath;
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
          matchedLine = line - 1;
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
  public async findFileInWorkspace(name: string) {
    let files = await vscode.workspace.findFiles(name, '**/node_modules/**', 1);
    return files;
  }
  public getWorkspaceFileUri(filepath: string) {
    let root = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
    if (root) {
      return vscode.Uri.file(path.join(root.uri.fsPath, filepath));
    }
    return undefined;
  }

  public async getBundleFileName(filename: string): Promise<string | undefined> {
    let name = filename ? filename : '';
    let nameParsed = path.parse(name.replace('.spec.bs', '').replace('.bs', ''));
    let finalPath = path.join(`${path.join(nameParsed.dir, nameParsed.name)}.bundle`, `${nameParsed.name}.json`);

    const filePath = vscode.Uri.file(finalPath);
    let info;
    try {
      info = await vscode.workspace.fs.stat(filePath);
    } catch (error) {
    }

    return info ? finalPath : name.substring(0, name.length - 2) + 'json';
  }

  public getCodeFileName(filename: string): string | undefined {
    let name = filename ? filename : '';

    if (name.endsWith('.spec.bs')) {
      return name.substring(0, name.length - 7) + 'bs';
    } else if (name.endsWith('.bs')) {
      return name;
    } else if (name.endsWith('.json')) {
      if (name.includes('.bundle')) {
        //old style
        let nameParsed = path.parse(name.replace('.spec.bs', '').replace('.bs', ''));
        let filePath = path.resolve(nameParsed.dir, '..');
        return `${path.join(filePath, nameParsed.name)}.bs`;
      } else {
        //new style
        return name.substring(0, name.length - 4) + 'bs';
      }
    } else {
      return undefined;
    }
  }

  public getPkgPathFromFilePath(filePath: string | Uri) {
    let relativeFilePath = vscode.workspace.asRelativePath(filePath);
    let parsedPath = path.parse(relativeFilePath);
    let dir = parsedPath.dir.split(path.sep);
    if (/^[src|src-dev|src-test|src-qa|src-prod]/.test(dir[0])) {
      dir.shift();
      parsedPath.dir = dir.join(path.sep);
    }
    return path.format(parsedPath);
  }

  async getPathToWorkSpaceFolder(pathName: string) {
    // Get the current workspace folder
    let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      // No workspace folder open
      return;
    }
    let vscodeFolderPath = path.join(workspaceFolder.uri.fsPath, pathName);
    return vscodeFolderPath;
  }
}
