import * as vscode from 'vscode';
import { Uri } from 'vscode';

export class WorkspaceEncoding {

  constructor() {
    this.reset();
  }

  private encoding: string[][];

  public find(path: string): string {
    return this.encoding.find((v) => path.startsWith(v[0]))[1];
  }

  public reset() {
    this.encoding = [];
    for (const folder of vscode.workspace.workspaceFolders) {
      this.encoding.push([folder.uri.fsPath, this.getConfiguration(folder.uri)]);
    }
  }

  private getConfiguration(uri: Uri): string {
    const encoding: string = vscode.workspace.getConfiguration('files', uri).get('encoding', 'utf8');
    if (encoding === 'utf8bom') {
      return 'utf8';  // iconv-lite removes bom by default when decoding, so this is fine
    }
    return encoding;
  }
}
