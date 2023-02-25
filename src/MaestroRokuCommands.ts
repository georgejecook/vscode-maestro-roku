import * as vscode from 'vscode';
import FileUtils from './FileUtils';
import DocumentUtils from './DocumentUtils';
import { util } from './Util';
import * as path from 'path';
import * as fs from 'fs';

export class MaestroRokuCommands {

  constructor() {
    this.fileUtils = new FileUtils();
    this.documentUtils = new DocumentUtils();
  }

  private fileUtils: FileUtils;
  private documentUtils: DocumentUtils;
  private context: vscode.ExtensionContext;
  private host: string;
  private extensionTemplates: any;
  private workspaceTemplates: any;

  registerCommands(context: vscode.ExtensionContext) {
    this.context = context;
    this.extensionTemplates = this.loadExtensionTemplatesJson(context.asAbsolutePath(path.join('resources', 'templates')));
    //TODO get these from local workspace
    // this.workspaceTemplates = this.loadExtensionTemplatesJson(context.asAbsolutePath(path.join('resources','templates')));

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
    subscriptions.push(vscode.commands.registerCommand('maestro.files.createComponent', (selectedFile) => {
      this.createComponent(selectedFile);
    }));
    subscriptions.push(vscode.commands.registerCommand('maestro.files.createFile', (selectedFile) => {
      this.createFile(selectedFile);
    }));
  }
  async createFile(selectedFile) {
    if (selectedFile) {
      vscode.window.showErrorMessage('Select a path in the explorer');
    }

    let pkgPath = this.fileUtils.getPkgPathFromFilePath(selectedFile);
    let items = ['Screen', 'Task', 'View', 'Row', 'Cell'].map((item) => { return { label: item }; });

    const userInput = await util.showQuickPickInputBox({
      placeholder: 'Select template to use',
      items: items
    });
    console.log('input was', userInput);

    const namespaceAndName = await util.showQuickPickInputBox({
      placeholder: 'Enter the namespace.name for the component',
    });
    console.log('input was', namespaceAndName);
    const className = namespaceAndName.split('.').pop();
    const namespaceName = namespaceAndName.replace(`.${className}`, '');

    if (!className || !namespaceName) {
      vscode.window.showErrorMessage('You must supply a namespace and class name');
    }
  }

  async createComponent(selectedFile) {
    if (!selectedFile) {
      vscode.window.showErrorMessage('Select a path in the explorer');
    }
    let targetPath = this.getTargetPathForFileCreation(selectedFile);
    let items = this.extensionTemplates.templates.filter((template) => template.files.length > 0).map((item) => {
      return {
        label: item.name,
        item: item
      };
    });

    const selectedName = await util.showQuickPickInputBox({
      placeholder: 'Select template to use',
      items: items
    });
    console.log('input was', selectedName);

    if (!selectedName) {
      return;
    }

    const selectedItem = items.filter((item) => item.label === selectedName)[0].item;

    const namespaceAndName = await util.showQuickPickInputBox({
      placeholder: 'Enter the namespace.name for the component',
    });
    console.log('input was', namespaceAndName);
    let rootFilePath = '';
    if (namespaceAndName) {

      const className = namespaceAndName.split('.').pop();
      const namespaceName = namespaceAndName.replace(`.${className}`, '');

      if (!className || !namespaceName) {
        vscode.window.showErrorMessage('You must supply a namespace and class name');
      }

      let sourcePkgPath = this.fileUtils.getPkgPathFromFilePath(path.join(targetPath, `${className}`));
      for (let filePath of selectedItem.files) {
        let targetFilePath = this.getTargetFilePath(filePath, targetPath, className);
        if (!rootFilePath) {
          rootFilePath = targetFilePath;
        }
        console.log('creating file', targetFilePath);
        if (fs.existsSync(targetFilePath)) {
          vscode.window.showWarningMessage(`${targetFilePath} already exists - not generating`);
          continue;
        }
        let text = this.loadAndReplaceExtensionText(filePath, namespaceName, className, sourcePkgPath);
        //the fileExtension is everything from ., after the last path.sep in filePath

        fs.writeFileSync(targetFilePath, text);
        vscode.window.showInformationMessage(`Created ${targetFilePath}`);
      }
    }
    if (rootFilePath) {
      await this.openFile(rootFilePath);
      await this.onGotoBundle();
      await this.onGotoCode();
      await this.onGotoTest();

    }
  }
  getTargetPathForFileCreation(selectedFile: any) {
    //TODO - what if there is no selectedFile
    let parsedTargetPath = path.parse(selectedFile.fsPath);
    let targetPath = parsedTargetPath.ext ? parsedTargetPath.dir : selectedFile.fsPath;
    return targetPath;
  }


  private getTargetFilePath(filePath: string, targetPath: string, className: string) {
    let templateFileName = filePath.split(path.sep).slice(-1)[0].split('.');
    templateFileName.shift();
    let templateExtension = templateFileName.join('.');
        let targetFilename = `${className}.${templateExtension}`;
        return path.join(targetPath, targetFilename);
  }

  private loadAndReplaceExtensionText(filePath: string, namespaceName: string, className: string, sourcePkgPath: string) {
    let text = fs.readFileSync(filePath).toString();
    text = text.replace(/\$CLASSNAME\$/gim, className);
    text = text.replace(/\$NAMESPACE\$/gim, namespaceName);
    text = text.replace(/\$SOURCE_PKG_PATH\$/gim, sourcePkgPath);
    return text;
  }

  private loadExtensionTemplatesJson(filePath: string) {
    filePath = path.resolve(filePath);
    let txt = fs.readFileSync(path.join(filePath, 'templates.json')).toString();

    let json = JSON.parse(txt);
    for (let template of json.templates) {
      template.files = template.files.map((file) => path.join(filePath, file));
    }
    return json;
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
      let targetFilename = await this.fileUtils.getStyleFilename();
      if (targetFilename) {
        const position = activeEditor.selection.active;
        let key = this.documentUtils.getFullQuotedString(activeEditor.document, position);
        if (key.startsWith('~')) {
          key = key.substring(1);
        }
        //first check if the style is in the current editor
        if (activeEditor?.document?.fileName.endsWith('.json')) {
          let localKey = `$styles.${key}`;
          let localFileName = activeEditor?.document?.fileName;
          let localKeyLineNumber = this.fileUtils.getJsonLineNumberWithKey(localFileName, localKey);
          if (localKeyLineNumber !== -1) {
            let range = this.documentUtils.createRange(localKeyLineNumber, localKeyLineNumber);
            // activeEditor.selection = new vscode.Selection(range.start, range.start);
            if (! await this.openFile(localFileName, range, options)) {
              await this.openFile(localFileName, range, options);
            }
            return;
          }
        }

        //no - go to style key
        // let key = 'theme.colors.general.black';
        let keyLineNumber = this.fileUtils.getJsonLineNumberWithKey(targetFilename, key);
        if (keyLineNumber !== -1) {
          let range = this.documentUtils.createRange(keyLineNumber, keyLineNumber);
          if (! await this.openFile(targetFilename, range, options)) {
            await this.openFile(targetFilename, range, options);
          }
        } else {
          console.error(`style key ${key} not found in Styles.json`);
          if (! await this.openFile(targetFilename, undefined, options)) {
            await this.openFile(targetFilename, undefined, options);
          }
        }
      }
    }
  }

  async onGotoBundle(options: any = undefined) {
    if (vscode.window.activeTextEditor) {
      const currentDocument = vscode.window.activeTextEditor.document;
      let targetFilename = await this.fileUtils.getBundleFileName(currentDocument.fileName);
      let activeEditor = vscode.window.activeTextEditor;
      const position = activeEditor.selection.active;
      const word = this.documentUtils.getWord(currentDocument, position);
      let location = await this.getFirstRangeOfTextInFile(targetFilename, `"id": "${word}"`);
      // this.gotoTextInFile(targetFilename, `"id": "${word}"`, 0, options);
      if (! await this.openFile(targetFilename, location)) {
        await this.openFile(targetFilename, location);
      }

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

  async getFirstRangeOfTextInFile(filename: string, text: string) {

    let uri = vscode.Uri.file(filename);
    let locations = await this.documentUtils.findTextInFile(uri, text);
    return locations?.[0]?.range;
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
      let viewColumn = uri.fsPath.endsWith('.spec.bs') || uri.fsPath.endsWith('.json') ? vscode.ViewColumn.One : vscode.ViewColumn.Two;
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
    let viewColumn = uri.fsPath.endsWith('.spec.bs') || uri.fsPath.endsWith('.json') ? vscode.ViewColumn.One : vscode.ViewColumn.Two;
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