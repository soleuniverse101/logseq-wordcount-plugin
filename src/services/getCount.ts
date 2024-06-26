import { BlockEntity } from "@logseq/libs/dist/LSPlugin";
import { mixedWordsFunction, simpleWordsFunction } from "./countWords";
import { removeFormat } from "./format.ts";
import { Options, parseQuery } from "./query.ts";

export interface CountResult { count: number; options: Options; }

export default async function getCount(
  parentBlock: BlockEntity,
  query: string = "",
): Promise<CountResult> {
  const options = parseQuery(query);

  let totalCount = 0;

  function recurse(childrenArr: BlockEntity[]) {
    for (const child of childrenArr) {
      if (options.filters.every(filter => filter(child))) {
        const content = removeFormat(child.content);
        if (options.countingType == "words") {
          if (logseq.settings!.forceWordCount) {
            totalCount += simpleWordsFunction(content);
          } else {
            totalCount += mixedWordsFunction(content);
          }
        } else {
          totalCount += content.length;
        }
      }
      if (child.children) {
        recurse(child.children as BlockEntity[]);
      }
    }
  }
  if (options.countingContext == "block") {
    recurse(parentBlock.children as BlockEntity[]);
  } else {
    const page = (await logseq.Editor.getPage(parentBlock.page.id))!;
    const pageBlocksTree = await logseq.Editor.getPageBlocksTree(page.name);
    recurse(pageBlocksTree);
  }
  return { count: totalCount, options };
}
