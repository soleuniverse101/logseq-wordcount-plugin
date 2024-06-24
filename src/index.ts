import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import getCount from "./services/getCount";
import renderCount from "./services/renderCount";
import { settings } from "./services/settings";
import { mixedWordsFunction } from "./services/countWords";
import { provideStyles } from "./styles";

const main = async () => {
  console.log("Wordcount plugin loaded");

  provideStyles();

  logseq.Editor.registerSlashCommand("Word count", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcount_}}`);
  });

  logseq.Editor.registerSlashCommand("Writing session target", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcount_, --target 500}}`);
  });

  logseq.Editor.registerSlashCommand("Character count", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcount_, --characters}}`);
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const uuid = payload.uuid;
    const [type, query] = payload.arguments;
    if (!type.startsWith(":wordcount_"))
      return;

    const wordcountId = `wordcount_${type.split("_")[1]?.trim()}_${slot}`;

    const headerBlock = await logseq.Editor.getBlock(uuid, {
      includeChildren: true,
    });

    try {
      let countResult = getCount(
        headerBlock!.children as BlockEntity[],
        query
      );
      renderCount(slot, wordcountId, countResult);
    } catch (error) {
      console.error(error);
      logseq.UI.showMsg(
        "Please do not change the render parameters except for your writing target.",
        "error"
      );
    }
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [type, count] = payload.arguments;
    if (!type.startsWith(":wordcount-page_")) return;
    const wordcountId = `wordcount-page_${type.split("_")[1]?.trim()}_${slot}`;

    logseq.provideUI({
      key: wordcountId,
      slot,
      reset: true,
      template: `
          <span class="wordcount-btn" data-slot-id="${wordcountId}" data-wordcount-id="${wordcountId}">Wordcount: ${count}</span>`,
    });
  });

  logseq.Editor.registerSlashCommand("Word count - page", async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer :wordcount-page_, 0}}`
    );
  });

  let count = 0;
  logseq.DB.onChanged(async function ({ blocks }) {
    if (blocks.length === 1) {
      const content = blocks[0].content;
      count = mixedWordsFunction(content);
      const blk = await logseq.Editor.getCurrentBlock();
      if (blk) {
        const page = await logseq.Editor.getPage(blk.page.id);
        const pbt = await logseq.Editor.getPageBlocksTree(page!.name);
        if (pbt[0].content.includes("{{renderer :wordcount-page_,")) {
          let content = pbt[0].content;
          const regexp = /\{\{renderer :wordcount-page_,(.*?)\}\}/;
          const matched = regexp.exec(content);
          content = content.replace(
            matched![0],
            `{{renderer :wordcount-page_, ${count}}}`
          );

          await logseq.Editor.updateBlock(pbt[0].uuid, content);
        }
      }
    }

    if (logseq.settings!.toolbar) {
      logseq.App.registerUIItem("toolbar", {
        key: "wordcount-page",
        template: `<p class="wordcount-toolbar">${count} words</p>`,
      });
    }
  });
};

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
