/**
 * ==========================================================================
 * WcCounter.gs
 * ==========================================================================
 */
function countWordsWithCustomRules() {
  var doc = DocumentApp.getActiveDocument();
  var tabs = doc.getTabs();

  var ignoreCompletely = ["Scenes", "CUT", "Originals"];
  var childTabsOnly = ["Draft"];

  var totalWordCount = 0;
  var breakdownList = [];

  if (!tabs || tabs.length === 0) {
    totalWordCount = countDocTabWords(doc.getBody());
    breakdownList.push({ title: "Main Document", words: totalWordCount, level: 0 });
  } else {
    for (var i = 0; i < tabs.length; i++) {
      totalWordCount += processTabNode(tabs[i], ignoreCompletely, childTabsOnly, 0, breakdownList);
    }
  }

  // Pass data to the HTML template safely
  var template = HtmlService.createTemplateFromFile('WcCounter');
  template.totalWordCount = totalWordCount.toLocaleString();

  // Format numbers beforehand so HTML doesn't crash on methods
  for (var k = 0; k < breakdownList.length; k++) {
    breakdownList[k].wordsFormatted = breakdownList[k].words.toLocaleString();
  }
  template.breakdownList = breakdownList;

  var htmlOutput = template.evaluate().setWidth(440).setHeight(460);
  DocumentApp.getUi().showModalDialog(htmlOutput, 'Word Count Breakdown');
}

function processTabNode(tab, ignoreCompletely, childTabsOnly, level, breakdownList) {
  var title = tab.getTitle().trim();
  if (containsString(title, ignoreCompletely)) return 0;

  var subtotal = 0;
  var ownWords = 0;
  var docTab = tab.asDocumentTab();

  if (!containsString(title, childTabsOnly) && docTab) {
    ownWords = countDocTabWords(docTab);
    subtotal += ownWords;
  }

  if (ownWords > 0) {
    breakdownList.push({ title: title, words: ownWords, level: level });
  } else if (containsString(title, childTabsOnly)) {
    breakdownList.push({ title: title, words: 0, isContainer: true, level: level });
  }

  var childTabs = tab.getChildTabs();
  if (childTabs && childTabs.length > 0) {
    for (var j = 0; j < childTabs.length; j++) {
      subtotal += processTabNode(childTabs[j], ignoreCompletely, childTabsOnly, level + 1, breakdownList);
    }
  }

  return subtotal;
}
function countDocTabWords(docTab) {
  var text = "";
  var body = docTab.getBody ? docTab.getBody() : docTab;

  // 1. Gather text from the body (excluding headings)
  if (body) {
    text += getNonHeadingTextFromBody(body) + " ";
  }

  // 2. Gather text from running headers/footers (if any)
  if (docTab.getHeader && docTab.getHeader()) text += docTab.getHeader().getText() + " ";
  if (docTab.getFooter && docTab.getFooter()) text += docTab.getFooter().getText() + " ";

  // 3. Gather text from footnotes
  if (docTab.getFootnotes) {
    var footnotes = docTab.getFootnotes();
    if (footnotes) {
      for (var k = 0; k < footnotes.length; k++) {
        text += footnotes[k].getFootnoteContents().getText() + " ";
      }
    }
  }

  // 4. Match words (splitting on spaces, em-dashes, and hyphens)
  var words = text.trim().match(/[^\s—–-]+/g);
  return words ? words.length : 0;
}

/**
 * Helper to extract text from a body while skipping Headings, Titles, and Subtitles.
 */
function getNonHeadingTextFromBody(body) {
  var extractedText = [];
  var paragraphs = body.getParagraphs();

  var headingTypes = [
    DocumentApp.ParagraphHeading.HEADING_1,
    DocumentApp.ParagraphHeading.HEADING_2,
    DocumentApp.ParagraphHeading.HEADING_3,
    DocumentApp.ParagraphHeading.HEADING_4,
    DocumentApp.ParagraphHeading.HEADING_5,
    DocumentApp.ParagraphHeading.HEADING_6,
    DocumentApp.ParagraphHeading.TITLE,
    DocumentApp.ParagraphHeading.SUBTITLE
  ];

  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    if (headingTypes.indexOf(p.getHeading()) === -1) {
      extractedText.push(p.getText());
    }
  }

  return extractedText.join(" ");
}

function containsString(str, list) {
  return list.some(function (item) {
    return item.toLowerCase() === str.toLowerCase();
  });
}