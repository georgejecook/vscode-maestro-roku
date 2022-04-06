import getLinesForJsonKeys from './JsonParser';

export function getLineNumberWithKey(jsonText: string, searchKey: string) {
  let matchedLine = 0;
  getLinesForJsonKeys(jsonText, function (key, line) {
    if (key === searchKey) {
      matchedLine = line -1;
      return false;
    }
  });
}