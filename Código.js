function onOpen() {
  DocumentApp.getUi()
    .createMenu('Writing Tools')
    .addItem('Count Words', 'countWordsWithCustomRules')
    .addItem('Compare Document Tabs', 'openParagraphTracker')
    .addItem('Export to HTML', 'openHtmlExportSidebar') // Links to your new file!
    .addToUi();
}