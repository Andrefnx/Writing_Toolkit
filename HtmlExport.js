function openHtmlExportSidebar() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('HTML Export')
      .setWidth(300);
  DocumentApp.getUi().showSidebar(html);
}

function getCurrentTabHtml() {
  const doc = DocumentApp.getActiveDocument();
  let activeTab = doc.getActiveTab();
  
  if (!activeTab) {
    return "<p>No active tab found.</p>";
  }
  
  let documentTab = null;
  try {
    if (activeTab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
      documentTab = activeTab.asDocumentTab();
    } else {
      documentTab = findDocumentTabRecursive(doc.getTabs());
    }
  } catch (e) {
    return convertElementToHtml(doc.getBody());
  }

  if (!documentTab) {
    return convertElementToHtml(doc.getBody());
  }
  
  const body = documentTab.getBody();
  return convertElementToHtml(body);
}

function findDocumentTabRecursive(tabs) {
  for (const tab of tabs) {
    if (tab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
      return tab.asDocumentTab();
    }
    const children = tab.getChildTabs();
    if (children && children.length > 0) {
      const found = findDocumentTabRecursive(children);
      if (found) return found;
    }
  }
  return null;
}

function convertElementToHtml(parent) {
  let html = '';
  const numChildren = parent.getNumChildren();

  for (let i = 0; i < numChildren; i++) {
    const child = parent.getChild(i);
    const type = child.getType();

    switch (type) {
      case DocumentApp.ElementType.PARAGRAPH:
        html += parseParagraph(child.asParagraph());
        break;
      case DocumentApp.ElementType.LIST_ITEM:
        html += `<li>${parseTextRuns(child.asListItem())}</li>\n`;
        break;
      case DocumentApp.ElementType.TABLE:
        html += parseTable(child.asTable());
        break;
      default:
        break;
    }
  }
  return html;
}

function parseParagraph(paragraph) {
  const headingType = paragraph.getHeading();
  const innerHtml = parseTextRuns(paragraph);
  const alignment = paragraph.getAlignment();
  
  let alignStyle = '';
  if (alignment) {
    if (alignment === DocumentApp.HorizontalAlignment.CENTER) {
      alignStyle = ' style="text-align: center;"';
    } else if (alignment === DocumentApp.HorizontalAlignment.RIGHT) {
      alignStyle = ' style="text-align: right;"';
    } else if (alignment === DocumentApp.HorizontalAlignment.JUSTIFY) {
      alignStyle = ' style="text-align: justify;"';
    }
  }
  
  switch (headingType) {
    case DocumentApp.ParagraphHeading.HEADING_1: return `<h1${alignStyle}>${innerHtml}</h1>\n`;
    case DocumentApp.ParagraphHeading.HEADING_2: return `<h2${alignStyle}>${innerHtml}</h2>\n`;
    case DocumentApp.ParagraphHeading.HEADING_3: return `<h3${alignStyle}>${innerHtml}</h3>\n`;
    case DocumentApp.ParagraphHeading.HEADING_4: return `<h4${alignStyle}>${innerHtml}</h4>\n`;
    case DocumentApp.ParagraphHeading.HEADING_5: return `<h5${alignStyle}>${innerHtml}</h5>\n`;
    case DocumentApp.ParagraphHeading.HEADING_6: return `<h6${alignStyle}>${innerHtml}</h6>\n`;
    default: 
      return innerHtml === '' ? '<br>\n' : `<p${alignStyle}>${innerHtml}</p>\n`;
  }
}

function parseTextRuns(element) {
  let result = '';
  const text = element.getText();
  if (!text) return '';

  for (let i = 0; i < element.getNumChildren(); i++) {
    const child = element.getChild(i);
    if (child.getType() === DocumentApp.ElementType.TEXT) {
      const textElem = child.asText();
      const textVal = textElem.getText();
      const len = textVal.length;
      
      if (len === 0) continue;

      let j = 0;
      while (j < len) {
        let isBold = textElem.isBold(j);
        let isItalic = textElem.isItalic(j);
        let isUnderline = textElem.isUnderline(j);
        let isStrikethrough = textElem.isStrikethrough(j);
        let linkUrl = textElem.getLinkUrl(j);

        let k = j + 1;
        while (k < len &&
               textElem.isBold(k) === isBold &&
               textElem.isItalic(k) === isItalic &&
               textElem.isUnderline(k) === isUnderline &&
               textElem.isStrikethrough(k) === isStrikethrough &&
               textElem.getLinkUrl(k) === linkUrl) {
          k++;
        }

        let chunk = textVal.substring(j, k);
        let escapedChunk = escapeHtml(chunk);

        if (isBold) escapedChunk = `<strong>${escapedChunk}</strong>`;
        if (isItalic) escapedChunk = `<em>${escapedChunk}</em>`;
        if (isUnderline) escapedChunk = `<u>${escapedChunk}</u>`;
        if (isStrikethrough) escapedChunk = `<del>${escapedChunk}</del>`;
        if (linkUrl) escapedChunk = `<a href="${linkUrl}" target="_blank">${escapedChunk}</a>`;

        result += escapedChunk;
        j = k;
      }
    }
  }
  return result;
}

function parseTable(table) {
  let tableHtml = '<table border="1">\n';
  for (let r = 0; r < table.getNumRows(); r++) {
    tableHtml += '  <tr>\n';
    const row = table.getRow(r);
    for (let c = 0; c < row.getNumCells(); c++) {
      const cell = row.getCell(c);
      tableHtml += `    <td>${convertElementToHtml(cell)}</td>\n`;
    }
    tableHtml += '  </tr>\n';
  }
  tableHtml += '</table>\n';
  return tableHtml;
}

function escapeHtml(text) {
  return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
}