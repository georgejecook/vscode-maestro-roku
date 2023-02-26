import * as vscode from 'vscode';

class Util {
  /**
 * Shows ether a QuickPick or InputBox to the user and allows them to enter
 * items not in the QuickPick list of items
 */
  public async showQuickPickInputBox(configuration: { placeholder?: string; items?: vscode.QuickPickItem[]; matchOnDescription?: boolean; matchOnDetail?: boolean } = {}): Promise<string | null> {
    if (configuration?.items?.length) {
      // We have items so use QuickPick
      const quickPick = vscode.window.createQuickPick();
      Object.assign(quickPick, { ...configuration });
      const deffer = new Promise<string | null>(resolve => {
        quickPick.onDidChangeValue(() => {
          // Clear the active item as the user started typing and we want
          // to handle this as a new option not in the supplied list.

          // VsCode does not have a strict match items to typed value option
          // so this is a workaround to that limitation.
          quickPick.activeItems = [];
        });

        quickPick.onDidAccept(() => {
          quickPick.hide();

          // Since we clear the active item when the user types (onDidChangeValue)
          // there will only be an active item if the user clicked on an item with
          // the mouse or used the arrows keys and then hit enter with one selected.
          resolve(quickPick.activeItems?.[0]?.label ?? quickPick.value);
        });

        quickPick.onDidHide(() => {
          // Make sure to dispose this view
          quickPick.dispose();
          resolve(null);
        });
      });
      quickPick.show();
      return deffer;
    } else {
      // There are no items to suggest to the user. Just use a normal InputBox
      return vscode.window.showInputBox({
        placeHolder: configuration.placeholder ?? '',
        value: ''
      });
    }
  }

}
const util = new Util();
export { util };
