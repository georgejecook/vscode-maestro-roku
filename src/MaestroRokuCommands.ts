import * as vscode from 'vscode';
import FileUtils from './FileUtils';
import DocumentUtils from './DocumentUtils';

export class MaestroRokuCommands {

  constructor() {
    this.fileUtils = new FileUtils();
    this.documentUtils = new DocumentUtils();
  }

  private fileUtils: FileUtils;
  private documentUtils: DocumentUtils;
  private context: vscode.ExtensionContext;
  private host: string;

  registerCommands(context: vscode.ExtensionContext) {
    this.context = context;

    let subscriptions = context.subscriptions;

    //file navigation
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.cycleFiles', () => {
      this.onCycleFiles();
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.gotoCode', () => {
      this.onGotoCode();
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.gotoBundle', () => {
      this.onGotoBundle();
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.gotoJsonDeclaration', () => {
      this.onGotoJsonDeclaration();
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.gotoStyleKey', () => {
      this.onGotoStyleKey({ preview: true });
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.peekStyleKey', () => {
      this.onGotoStyleKey({ preview: true });
    }));

    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.peekJsonDeclaration', () => {
      this.onGotoJsonDeclaration({ preview: true });
    }));


    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.peekBundle', () => {
      this.onGotoBundle(true);
    }));

    //rooibos specific
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.gotoTest', () => {
      this.onGotoTest();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.updateTDDTarget', () => {
      this.onUpdateTDDTarget();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.runTDDTarget', () => {
      this.onRunTDDTarget();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.removeOnly', () => {
      this.onRemoveOnly();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.onlyDescribe', () => {
      this.onOnlyDescribe();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.onlyIt', () => {
      this.onOnlyIt();
    }));
    subscriptions.push(vscode.commands.registerCommand('extension.maestro.navigation.onlyTest', () => {
      this.onOnlyTest();
    }));
  }

  async onCycleFiles() {
    if (vscode.window.activeTextEditor) {
      const currentDocument = vscode.window.activeTextEditor.document;
      let targetFilename = this.fileUtils.getAlternateFileName(currentDocument.fileName);
      if (targetFilename) {
        if (! await this.openFile(targetFilename)) {
          await this.openFile(targetFilename);
        }
      }
    }
  }

  async onGotoTest() {
    //1. ascertain the function name
    if (vscode.window.activeTextEditor) {
      await this.fixCurrentDocumentColumn();
      const currentDocument = vscode.window.activeTextEditor.document;
      const position = vscode.window.activeTextEditor.selection.active;
      let testLocation = undefined;


      let targetFilename = this.fileUtils.getSpecFileName(currentDocument.fileName);
      if (targetFilename) {
        let functionRegex = / function ([a-z|A-Z|0-9_]*)\(/g;
        let matches = await this.documentUtils.matchTextInFile(currentDocument.getText(), functionRegex, position.line, false);
        if (matches) {
          let uri = vscode.Uri.file(targetFilename);
          let regexText = `\\@describe\\("${matches[1]}`;
          console.log(`looking for test with ${regexText}`);
          let locations = await this.documentUtils.findTextInFile(uri, regexText);
          testLocation = locations[0]?.range;
          if (!testLocation) {
            vscode.window.showInformationMessage(`Could not find unit test block for function "${matches[1]}"`);
          }
        }

      }
      if (! await this.openFile(targetFilename, testLocation)) {
        await this.openFile(targetFilename, testLocation);
      }
    }
  }

  async onGotoCode() {
    if (vscode.window.activeTextEditor) {
      await this.fixCurrentDocumentColumn();
      const currentDocument = vscode.window.activeTextEditor.document;
      let targetFilename = this.fileUtils.getCodeFileName(currentDocument.fileName);
      if (targetFilename) {
        if (! await this.openFile(targetFilename)) {
          await this.openFile(targetFilename);
        }
      }
    }
  }
  async onGotoStyleKey(options: any = undefined) {
    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      let targetFilename = this.fileUtils.getStyleFilename();
      if (targetFilename) {
        const position = activeEditor.selection.active;
        let key = this.documentUtils.getFullQuotedString(activeEditor.document, position);
        if (key.startsWith('~')) {
          key = key.substring(1);
        }
        // let key = 'theme.colors.general.black';
        let keyLineNumber = this.fileUtils.getJsonLineNumberWithKey(targetFilename, key);
        if (keyLineNumber !== -1) {
          let range = this.documentUtils.createRange(keyLineNumber, keyLineNumber);
          if (! await this.openFile(targetFilename, range, options)) {
            await this.openFile(targetFilename, range, options);
          }
        } else {
          console.error(`style key ${key} not found in Styles.json`);
        }
      }
    }
  }

  async onGotoBundle(options: any = undefined) {
    if (vscode.window.activeTextEditor) {
      const currentDocument = vscode.window.activeTextEditor.document;
      let targetFilename = this.fileUtils.getBundleFileName(currentDocument.fileName);
      let activeEditor = vscode.window.activeTextEditor;
      const position = activeEditor.selection.active;
      const word = this.documentUtils.getWord(currentDocument, position);
      this.gotoTextInFile(targetFilename, `"id": "${word}"`, 0, options);
    }
  }

  // super crude mechanism for finding things in a file
  async gotoTextInFile(filename: string, text: string, lineOffset = 0, options: any = undefined) {

    if (vscode.window.activeTextEditor) {
      const currentDocument = vscode.window.activeTextEditor.document;
      let uri = vscode.Uri.file(filename);
      let positions = await this.documentUtils.findTextInFile(uri, text);
      let range = undefined;
      if (positions?.length > 0) {
        range = positions[0].range;
      }
      this.gotoFile(filename, range, options);
    }
  }
  async gotoFile(filename: string, range: vscode.Range = undefined, options: any = undefined) {
    if (vscode.window.activeTextEditor) {
      let currentDocument = vscode.window.activeTextEditor.document;
      if (currentDocument.fileName !== filename) {
        if (! await this.openFile(filename, range, options)) {
          await this.openFile(filename, range, options);
        }
      }
      currentDocument = vscode.window.activeTextEditor.document;
      return currentDocument.fileName === filename;
    } else {
      return false;
    }
  }

  async onGotoJsonDeclaration(options: any = undefined) {
    if (vscode.window.activeTextEditor) {
      const currentDocument = vscode.window.activeTextEditor.document;
      let targetFilename = this.fileUtils.getSpecFileName(currentDocument.fileName);
      if (targetFilename) {
        if (! await this.openFile(targetFilename, options)) {
          await this.openFile(targetFilename, options);
        }
      }
    }
  }



  /*---------------------------------------------------------
  // Private
  //---------------------------------------------------------*/

  async openFile(filename: string, range: vscode.Range = undefined, options = undefined): Promise<boolean> {
    let uri = vscode.Uri.file(filename);
    try {
      let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
      options = options ? options : {};
      let viewColumn = uri.fsPath.endsWith('.spec.bs') ? vscode.ViewColumn.One : vscode.ViewColumn.Two;
      await vscode.window.showTextDocument(doc, viewColumn);
      console.log('opened', filename, 'going to range', range);
      if (range) {
        this.gotoRange(range);
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  private async fixCurrentDocumentColumn() {
    let activeEditor = vscode.window.activeTextEditor;
    let uri = activeEditor.document.uri;
    let viewColumn = uri.fsPath.endsWith('.spec.bs') ? vscode.ViewColumn.One : vscode.ViewColumn.Two;
    if (activeEditor.viewColumn !== viewColumn) {
      const position = activeEditor.selection.active;
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      let doc = await vscode.workspace.openTextDocument(uri); // calls back into the provider
      await vscode.window.showTextDocument(doc, viewColumn);
      this.gotoRange(this.documentUtils.createRange(position.line, position.line));
    }

  }

  private gotoRange(range: vscode.Range) {
    let editor = vscode.window.activeTextEditor;
    editor.selection = new vscode.Selection(
      range.start.line,
      range.start.character,
      range.start.line,
      range.start.character
    );
    console.log("going to range", range.start.line);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }

  /**
   * rooibos specific
   */
  private async onUpdateTDDTarget() {
    await this.runTDDTarget(false);
  }
  /**
   * rooibos specific
   */
  private async onRunTDDTarget() {
    await this.runTDDTarget(true);
  }

  private async runTDDTarget(executeLaunchTarget: boolean) {
    let tddUri = this.fileUtils.getTDDUri();
    let startLocation = await this.documentUtils.findTextInFile(tddUri, '"\\*\\*/START"');
    let endLocation = await this.documentUtils.findTextInFile(tddUri, '"\\*\\*/END"');
    let textLines = await this.documentUtils.getFileTextAsLines(tddUri);
    if (!startLocation[0]?.range?.start?.line || !endLocation[0]?.range?.start?.line) {
      vscode.window.showErrorMessage('Could not find correctly configured bsconfig-tdd.json file. Please create one, as per the instructions in the rooibos wiki');
      return;
    }
    let numberOfLinesToRemove = endLocation[0]?.range.start.line - startLocation[0]?.range.start.line - 1;

    let filesPathsToInclude: string[] = vscode.workspace.textDocuments.filter((document) => document.uri.fsPath.endsWith('.spec.bs')).map((document) => {
      let p = vscode.workspace.asRelativePath(document.uri);
      //FIXME - make a config setting for the project root folder, and to ascertain if a file is from some other place
      if (p.startsWith('src')) {
        //it's in the main source
        p = p.replace('src/', '');
        return `"${p}",`;
      } else {
        p = p.replace('/source/', '/**/');
        p = p.replace('/components/', '/**/');
        return `{"src":"../${p}", "dest": ""},`;
      }
    });
    textLines.splice(startLocation[0].range.start.line + 1, numberOfLinesToRemove, ...filesPathsToInclude);
    this.documentUtils.updateDocumentText(tddUri, textLines.join('\n'));
    if (executeLaunchTarget) {
      vscode.window.showInformationMessage(`Running ${filesPathsToInclude.length} test suites`);
      await vscode.commands.executeCommand('workbench.action.debug.stop');
      await vscode.commands.executeCommand('workbench.action.debug.run');
    } else {
      vscode.window.showInformationMessage(`bsconfig-tdd.json configured to run ${filesPathsToInclude.length} test suites`);
    }
  }

  private async onRemoveOnly() {
    let fileUris = await vscode.workspace.findFiles('**/*.spec.bs');
    for (let uri of fileUris) {
      await this.documentUtils.removeLinesMatchingRegex(uri, /^\s*\@only$/gim);
    }
    vscode.commands.executeCommand('editor.action.formatDocument');
  }

  private async onOnlyDescribe() {
    await this.setOnly('describe');
  }

  private async onOnlyIt() {
    await this.setOnly('it');
  }

  private async onOnlyTest() {
    await this.setOnly('suite');
  }

  private async setOnly(typeText: string) {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
      let oldSelection = editor.selection;
      await this.documentUtils.removeLinesMatchingRegex(editor.document.uri, /^\s*\@only$/gim);
      let regexText = `\\@${typeText}\\("`;
      let location = await this.documentUtils.findTextInFile(editor.document.uri, regexText, oldSelection.start.line, false, true);

      if (location.length > 0) {
        editor.edit((eb) => {
          eb.insert(new vscode.Position(location[0].range.start.line, location[0].range.start.character), '@only\n');
        });
        editor.selection = oldSelection;
      }
      vscode.commands.executeCommand('editor.action.formatDocument');
    }
  }

}