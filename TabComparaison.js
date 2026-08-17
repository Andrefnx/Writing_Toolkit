/**
 * ============================================================================
 * CHANGE TRACKER
 * ============================================================================
 */

var STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "was", "are", "were",
  "of", "in", "on", "at", "to", "for", "with", "it", "this", "that",
  "by", "from", "as", "be", "been", "he", "she", "his", "her", "their"
]);


/**
 * ============================================================================
 * OPEN CHANGE TRACKER
 * ============================================================================
 */

function openParagraphTracker() {
  return openChangeTracker();
}


function openChangeTracker() {

  var document =
    DocumentApp.getActiveDocument();

  var tabs =
    document.getTabs();

  var tabList =
    tabs && tabs.length > 0
      ? getTabNames(tabs, 0)
      : [
          {
            id: "main",
            title: "Main Document",
            depth: 0
          }
        ];

  var template =
    HtmlService.createTemplateFromFile(
      "DiffTracker"
    );

  template.tabList =
    tabList;

  var htmlOutput =
    template
      .evaluate()
      .setWidth(980)
      .setHeight(650);

  DocumentApp.getUi().showModalDialog(
    htmlOutput,
    "Compare Document Tabs"
  );

}


/**
 * ============================================================================
 * GET TAB NAMES
 * ============================================================================
 */

function getTabNames(
  tabs,
  depth
) {

  var tabList = [];

  for (
    var index = 0;
    index < tabs.length;
    index++
  ) {

    var currentTab =
      tabs[index];

    tabList.push({

      id:
        currentTab.getId(),

      title:
        currentTab.getTitle(),

      depth:
        depth

    });

    var childTabs =
      currentTab.getChildTabs();

    if (
      childTabs &&
      childTabs.length > 0
    ) {

      tabList =
        tabList.concat(
          getTabNames(
            childTabs,
            depth + 1
          )
        );

    }

  }

  return tabList;

}


/**
 * ============================================================================
 * COMPARE TWO DOCUMENT TABS
 *
 * Includes:
 *
 *   - EXACT
 *   - SIMILAR
 *   - SPLIT
 *   - MOVED
 *   - EDITED
 *   - REWRITE
 *   - NEW
 *   - REMOVED
 * ============================================================================
 */

function compareDocumentTabs(
  sourceTabId,
  targetTabId
) {

  var document =
    DocumentApp.getActiveDocument();

  var sourceBody =
    getTabBody(
      document,
      sourceTabId
    );

  var targetBody =
    getTabBody(
      document,
      targetTabId
    );

  if (
    !sourceBody ||
    !targetBody
  ) {

    return {
      error:
        "Unable to read one of the selected document tabs."
    };

  }

  var sourceParagraphs =
    extractFullText(
      sourceBody
    );

  var targetParagraphs =
    extractFullText(
      targetBody
    );

  var matchedSourceIndexes =
    new Array(
      sourceParagraphs.length
    ).fill(false);

  var targetToSourceMatches =
    new Array(
      targetParagraphs.length
    ).fill(null);

  var splitGroups = {};

  var targetSplitGroups =
    new Array(
      targetParagraphs.length
    ).fill(null);


  /* ------------------------------------------------------------------------
     PASS 1: EXACT MATCHING
  ------------------------------------------------------------------------ */

  for (
    var targetIndex = 0;
    targetIndex < targetParagraphs.length;
    targetIndex++
  ) {

    var targetParagraph =
      targetParagraphs[targetIndex];

    var exactMatch =
      findExactMatch(
        targetParagraph,
        sourceParagraphs,
        matchedSourceIndexes,
        targetIndex
      );

    if (
      exactMatch.index !== -1
    ) {

      matchedSourceIndexes[
        exactMatch.index
      ] = true;

      targetToSourceMatches[
        targetIndex
      ] =
        exactMatch.index;

    }

  }


  /* ------------------------------------------------------------------------
     PASS 2: SPLIT DETECTION
  ------------------------------------------------------------------------ */

  detectSplitGroups(
    sourceParagraphs,
    targetParagraphs,
    matchedSourceIndexes,
    targetToSourceMatches,
    splitGroups,
    targetSplitGroups
  );


  /* ------------------------------------------------------------------------
     PASS 3: GLOBAL SIMILARITY MATCHING

     All possible paragraph relationships are scored before assigning them.

     This avoids an earlier weak paragraph match consuming the correct source
     paragraph before a much stronger match is evaluated.
  ------------------------------------------------------------------------ */

  performGlobalSimilarityMatching(
    sourceParagraphs,
    targetParagraphs,
    matchedSourceIndexes,
    targetToSourceMatches,
    targetSplitGroups
  );


  /* ------------------------------------------------------------------------
     PASS 4: SUBSTRING MATCHING
  ------------------------------------------------------------------------ */

  for (
    var targetIndex = 0;
    targetIndex < targetParagraphs.length;
    targetIndex++
  ) {

    if (
      targetToSourceMatches[
        targetIndex
      ] !== null
    ) {
      continue;
    }

    if (
      targetSplitGroups[
        targetIndex
      ] !== null
    ) {
      continue;
    }

    var targetParagraph =
      targetParagraphs[targetIndex];

    var cleanTargetText =
      cleanComparisonText(
        targetParagraph.text
      );

    for (
      var sourceIndex = 0;
      sourceIndex < sourceParagraphs.length;
      sourceIndex++
    ) {

      if (
        matchedSourceIndexes[
          sourceIndex
        ]
      ) {
        continue;
      }

      var cleanSourceText =
        cleanComparisonText(
          sourceParagraphs[sourceIndex].text
        );

      if (
        cleanSourceText.indexOf(
          cleanTargetText
        ) !== -1 ||
        cleanTargetText.indexOf(
          cleanSourceText
        ) !== -1
      ) {

        targetToSourceMatches[
          targetIndex
        ] =
          sourceIndex;

        matchedSourceIndexes[
          sourceIndex
        ] = true;

        break;

      }

    }

  }


  /* ------------------------------------------------------------------------
     BUILD TARGET RESULTS
  ------------------------------------------------------------------------ */

  var targetResults = [];

  for (
    var targetIndex = 0;
    targetIndex < targetParagraphs.length;
    targetIndex++
  ) {

    var targetParagraph =
      targetParagraphs[targetIndex];


    if (
      targetSplitGroups[
        targetIndex
      ] !== null
    ) {

      var splitSourceIndex =
        targetSplitGroups[
          targetIndex
        ];

      targetResults.push({

        status:
          "SPLIT",

        text:
          targetParagraph.text,

        diffHtml:
          escapeHtmlText(
            targetParagraph.text
          ),

        oldIndex:
          splitSourceIndex + 1,

        newIndex:
          targetIndex + 1,

        splitTargets:
          (splitGroups[splitSourceIndex] || []).map(
            function(index) {
              return index + 1;
            }
          ),

        splitGroup:
          splitSourceIndex + 1,

        isRewrite:
          false,

        isExactMatch:
          false

      });

      continue;

    }


    var sourceMatchIndex =
      targetToSourceMatches[
        targetIndex
      ];

    if (
      sourceMatchIndex !== null
    ) {

      var sourceParagraph =
        sourceParagraphs[
          sourceMatchIndex
        ];

      var positionDifference =
        Math.abs(
          sourceMatchIndex -
          targetIndex
        );

      var wasMoved =
        positionDifference > 1;

      var textChanges =
        calculateTextChanges(
          sourceParagraph.text,
          targetParagraph.text
        );

      var status =
        "UNCHANGED";

      if (
        wasMoved
      ) {

        status =
          "MOVED";

      } else if (
        textChanges.isRewrite
      ) {

        status =
          "REWRITE";

      } else if (
        textChanges.hasChanges
      ) {

        status =
          "EDITED";

      }

      targetResults.push({

        status:
          status,

        text:
          targetParagraph.text,

        diffHtml:
          escapeHtmlText(
            targetParagraph.text
          ),

        oldIndex:
          sourceMatchIndex + 1,

        newIndex:
          targetIndex + 1,

        isRewrite:
          textChanges.isRewrite,

        isExactMatch:
          textChanges.isExactMatch

      });

    } else {

      targetResults.push({

        status:
          "NEW",

        text:
          targetParagraph.text,

        diffHtml:
          escapeHtmlText(
            targetParagraph.text
          ),

        oldIndex:
          null,

        newIndex:
          targetIndex + 1,

        isRewrite:
          false,

        isExactMatch:
          false

      });

    }

  }


  /* ------------------------------------------------------------------------
     BUILD SOURCE RESULTS
  ------------------------------------------------------------------------ */

  var sourceResults = [];

  for (
    var sourceIndex = 0;
    sourceIndex < sourceParagraphs.length;
    sourceIndex++
  ) {

    var sourceParagraph =
      sourceParagraphs[
        sourceIndex
      ];


    if (
      splitGroups[
        sourceIndex
      ]
    ) {

      var splitTargetIndexes =
        splitGroups[
          sourceIndex
        ];

      sourceResults.push({

        status:
          "SPLIT",

        text:
          sourceParagraph.text,

        diffHtml:
          escapeHtmlText(
            sourceParagraph.text
          ),

        oldIndex:
          sourceIndex + 1,

        newIndex:
          splitTargetIndexes.length > 0
            ? splitTargetIndexes[0] + 1
            : null,

        splitTargets:
          splitTargetIndexes.map(
            function(index) {
              return index + 1;
            }
          ),

        splitGroup:
          sourceIndex + 1,

        isRewrite:
          false,

        isExactMatch:
          false

      });

      continue;

    }


    if (
      matchedSourceIndexes[
        sourceIndex
      ]
    ) {

      var targetMatchIndex =
        targetToSourceMatches.indexOf(
          sourceIndex
        );

      var positionDifference =
        targetMatchIndex !== -1
          ? Math.abs(
              sourceIndex -
              targetMatchIndex
            )
          : 0;

      var wasMoved =
        positionDifference > 1;

      var targetText =
        targetMatchIndex !== -1
          ? targetParagraphs[
              targetMatchIndex
            ].text
          : "";

      var textChanges =
        calculateTextChanges(
          sourceParagraph.text,
          targetText
        );

      var status =
        "UNCHANGED";

      if (
        wasMoved
      ) {

        status =
          "MOVED";

      } else if (
        textChanges.isRewrite
      ) {

        status =
          "REWRITE";

      } else if (
        textChanges.hasChanges
      ) {

        status =
          "EDITED";

      }

      sourceResults.push({

        status:
          status,

        text:
          sourceParagraph.text,

        diffHtml:
          escapeHtmlText(
            sourceParagraph.text
          ),

        oldIndex:
          sourceIndex + 1,

        newIndex:
          targetMatchIndex !== -1
            ? targetMatchIndex + 1
            : null,

        isRewrite:
          textChanges.isRewrite,

        isExactMatch:
          textChanges.isExactMatch

      });

    } else {

      sourceResults.push({

        status:
          "REMOVED",

        text:
          sourceParagraph.text,

        diffHtml:
          escapeHtmlText(
            sourceParagraph.text
          ),

        oldIndex:
          sourceIndex + 1,

        newIndex:
          null,

        isRewrite:
          false,

        isExactMatch:
          false

      });

    }

  }


  return {

    sourceList:
      sourceResults,

    targetList:
      targetResults

  };

}


/**
 * ============================================================================
 * DETECT SPLIT GROUPS
 * ============================================================================
 */

function detectSplitGroups(
  sourceParagraphs,
  targetParagraphs,
  matchedSourceIndexes,
  targetToSourceMatches,
  splitGroups,
  targetSplitGroups
) {

  for (
    var sourceIndex = 0;
    sourceIndex < sourceParagraphs.length;
    sourceIndex++
  ) {

    if (
      matchedSourceIndexes[
        sourceIndex
      ]
    ) {
      continue;
    }

    var sourceText =
      cleanComparisonText(
        sourceParagraphs[
          sourceIndex
        ].text
      );

    if (
      sourceText.length < 20
    ) {
      continue;
    }

    var candidates = [];

    for (
      var targetIndex = 0;
      targetIndex < targetParagraphs.length;
      targetIndex++
    ) {

      if (
        targetToSourceMatches[
          targetIndex
        ] !== null
      ) {
        continue;
      }

      if (
        targetSplitGroups[
          targetIndex
        ] !== null
      ) {
        continue;
      }

      var targetText =
        cleanComparisonText(
          targetParagraphs[
            targetIndex
          ].text
        );

      if (
        targetText.length < 20
      ) {
        continue;
      }

      if (
        sourceText.indexOf(
          targetText
        ) === -1
      ) {
        continue;
      }

      var coverage =
        targetText.length /
        sourceText.length;

      if (
        coverage < 0.15
      ) {
        continue;
      }

      candidates.push({

        targetIndex:
          targetIndex,

        length:
          targetText.length

      });

    }


    if (
      candidates.length < 2
    ) {
      continue;
    }


    var ranges = [];

    for (
      var c = 0;
      c < candidates.length;
      c++
    ) {

      var candidate =
        candidates[c];

      var candidateText =
        cleanComparisonText(
          targetParagraphs[
            candidate.targetIndex
          ].text
        );

      var start =
        sourceText.indexOf(
          candidateText
        );

      if (
        start === -1
      ) {
        continue;
      }

      ranges.push({

        start:
          start,

        end:
          start +
          candidateText.length

      });

    }


    ranges.sort(
      function(a, b) {
        return a.start - b.start;
      }
    );


    var mergedRanges = [];

    for (
      var r = 0;
      r < ranges.length;
      r++
    ) {

      var range =
        ranges[r];

      if (
        mergedRanges.length === 0
      ) {

        mergedRanges.push({

          start:
            range.start,

          end:
            range.end

        });

        continue;

      }

      var last =
        mergedRanges[
          mergedRanges.length - 1
        ];

      if (
        range.start <= last.end
      ) {

        last.end =
          Math.max(
            last.end,
            range.end
          );

      } else {

        mergedRanges.push({

          start:
            range.start,

          end:
            range.end

        });

      }

    }


    var coveredLength = 0;

    for (
      var m = 0;
      m < mergedRanges.length;
      m++
    ) {

      coveredLength +=
        mergedRanges[m].end -
        mergedRanges[m].start;

    }


    var coverageRatio =
      coveredLength /
      sourceText.length;

    if (
      coverageRatio < 0.60
    ) {
      continue;
    }


    var splitIndexes =
      candidates.map(
        function(candidate) {
          return candidate.targetIndex;
        }
      );

    splitIndexes.sort(
      function(a, b) {
        return a - b;
      }
    );


    splitGroups[
      sourceIndex
    ] =
      splitIndexes;

    matchedSourceIndexes[
      sourceIndex
    ] = true;


    for (
      var s = 0;
      s < splitIndexes.length;
      s++
    ) {

      var splitTargetIndex =
        splitIndexes[s];

      targetSplitGroups[
        splitTargetIndex
      ] =
        sourceIndex;

    }

  }

}


/**
 * ============================================================================
 * CLEAN COMPARISON TEXT
 * ============================================================================
 */

function cleanComparisonText(
  text
) {

  return String(text || "")
    .toLowerCase()
    .replace(/[^\w]/g, "");

}


/**
 * ============================================================================
 * EXTRACT NON-EMPTY PARAGRAPHS
 * ============================================================================
 */

function extractFullText(
  body
) {

  var paragraphs =
    body.getParagraphs();

  var paragraphList = [];

  for (
    var index = 0;
    index < paragraphs.length;
    index++
  ) {

    var text =
      paragraphs[
        index
      ]
        .getText()
        .trim();

    if (
      text.length > 0
    ) {

      paragraphList.push({

        text:
          text,

        words:
          SplitTextIntoP(
            text
          )

      });

    }

  }

  return paragraphList;

}


/**
 * ============================================================================
 * SPLIT TEXT INTO WORDS
 * ============================================================================
 */

function SplitTextIntoP(
  text
) {

  return text
    .toLowerCase()
    .replace(
      /[^\w\s]/gi,
      ""
    )
    .split(/\s+/)
    .filter(Boolean);

}


/**
 * ============================================================================
 * FIND EXACT MATCH
 * ============================================================================
 */

function findExactMatch(
  targetParagraph,
  sourceParagraphs,
  matchedSourceIndexes,
  currentTargetIndex
) {

  var targetText =
    targetParagraph.text
      .trim()
      .toLowerCase();

  var bestSourceIndex =
    -1;

  var closestDistance =
    Infinity;


  for (
    var sourceIndex = 0;
    sourceIndex < sourceParagraphs.length;
    sourceIndex++
  ) {

    if (
      matchedSourceIndexes[
        sourceIndex
      ]
    ) {
      continue;
    }

    var sourceText =
      sourceParagraphs[
        sourceIndex
      ].text
        .trim()
        .toLowerCase();

    if (
      targetText === sourceText
    ) {

      var distance =
        Math.abs(
          sourceIndex -
          currentTargetIndex
        );

      if (
        distance < closestDistance
      ) {

        closestDistance =
          distance;

        bestSourceIndex =
          sourceIndex;

      }

    }

  }

  return {

    index:
      bestSourceIndex

  };

}


/**
 * ============================================================================
 * GLOBAL SIMILARITY MATCHING
 * ============================================================================
 */

function performGlobalSimilarityMatching(
  sourceParagraphs,
  targetParagraphs,
  matchedSourceIndexes,
  targetToSourceMatches,
  targetSplitGroups
) {

  var candidates = [];


  for (
    var targetIndex = 0;
    targetIndex < targetParagraphs.length;
    targetIndex++
  ) {

    if (
      targetToSourceMatches[targetIndex] !== null ||
      targetSplitGroups[targetIndex] !== null
    ) {
      continue;
    }


    for (
      var sourceIndex = 0;
      sourceIndex < sourceParagraphs.length;
      sourceIndex++
    ) {

      if (
        matchedSourceIndexes[sourceIndex]
      ) {
        continue;
      }


      var metrics =
        calculateParagraphMatchMetrics(
          targetParagraphs[targetIndex],
          sourceParagraphs[sourceIndex],
          targetIndex,
          sourceIndex
        );

      if (
        !metrics.isCandidate
      ) {
        continue;
      }


      candidates.push({

        targetIndex:
          targetIndex,

        sourceIndex:
          sourceIndex,

        score:
          metrics.score,

        textSimilarity:
          metrics.textSimilarity,

        coverage:
          metrics.coverage,

        commonWordCount:
          metrics.commonWordCount

      });

    }

  }


  candidates.sort(
    function(a, b) {

      if (
        b.score !== a.score
      ) {
        return b.score - a.score;
      }

      if (
        b.commonWordCount !== a.commonWordCount
      ) {
        return b.commonWordCount - a.commonWordCount;
      }

      if (
        b.coverage !== a.coverage
      ) {
        return b.coverage - a.coverage;
      }

      return b.textSimilarity - a.textSimilarity;

    }
  );


  var usedTargets =
    new Array(
      targetParagraphs.length
    ).fill(false);


  for (
    var candidateIndex = 0;
    candidateIndex < candidates.length;
    candidateIndex++
  ) {

    var candidate =
      candidates[candidateIndex];

    if (
      usedTargets[candidate.targetIndex] ||
      matchedSourceIndexes[candidate.sourceIndex] ||
      targetToSourceMatches[candidate.targetIndex] !== null ||
      targetSplitGroups[candidate.targetIndex] !== null
    ) {
      continue;
    }


    targetToSourceMatches[
      candidate.targetIndex
    ] =
      candidate.sourceIndex;

    matchedSourceIndexes[
      candidate.sourceIndex
    ] = true;

    usedTargets[
      candidate.targetIndex
    ] = true;

  }

}


/**
 * ============================================================================
 * CALCULATE PARAGRAPH MATCH METRICS
 * ============================================================================
 */

function calculateParagraphMatchMetrics(
  targetParagraph,
  sourceParagraph,
  targetIndex,
  sourceIndex
) {

  var targetContentWords =
    getMeaningfulWords(
      targetParagraph.words
    );

  var sourceContentWords =
    getMeaningfulWords(
      sourceParagraph.words
    );


  if (
    !targetContentWords.length ||
    !sourceContentWords.length
  ) {

    return {

      isCandidate:
        false,

      score:
        0,

      textSimilarity:
        0,

      coverage:
        0,

      commonWordCount:
        0

    };

  }


  var targetSet =
    new Set(
      targetContentWords
    );

  var sourceSet =
    new Set(
      sourceContentWords
    );

  var commonWordCount = 0;


  targetSet.forEach(
    function(word) {

      if (
        sourceSet.has(word)
      ) {
        commonWordCount++;
      }

    }
  );


  var textSimilarity =
    (
      2.0 *
      commonWordCount
    ) / (
      targetSet.size +
      sourceSet.size
    );


  var coverage =
    commonWordCount /
    Math.min(
      targetSet.size,
      sourceSet.size
    );


  var cleanTargetText =
    cleanComparisonText(
      targetParagraph.text
    );

  var cleanSourceText =
    cleanComparisonText(
      sourceParagraph.text
    );


  var containsRelationship =
    cleanTargetText.length >= 12 &&
    cleanSourceText.length >= 12 &&
    (
      cleanSourceText.indexOf(
        cleanTargetText
      ) !== -1 ||
      cleanTargetText.indexOf(
        cleanSourceText
      ) !== -1
    );


  var distance =
    Math.abs(
      sourceIndex -
      targetIndex
    );


  var positionAdjustment = 0;


  if (
    distance === 0
  ) {

    positionAdjustment =
      0.08;

  } else if (
    distance <= 2
  ) {

    positionAdjustment =
      0.05;

  } else if (
    distance <= 5
  ) {

    positionAdjustment =
      0.025;

  } else if (
    distance > 12
  ) {

    positionAdjustment =
      -0.02;

  }


  var score =
    (textSimilarity * 0.68) +
    (coverage * 0.32) +
    positionAdjustment;


  if (
    containsRelationship
  ) {

    score +=
      0.18;

  }


  if (
    commonWordCount >= 3
  ) {

    score +=
      0.04;

  }


  if (
    commonWordCount <= 1
  ) {

    score -=
      0.18;

  }


  if (
    commonWordCount === 2 &&
    targetSet.size >= 6 &&
    sourceSet.size >= 6
  ) {

    score -=
      0.08;

  }


  var isCandidate =
    containsRelationship ||
    (
      commonWordCount >= 2 &&
      textSimilarity >= 0.20 &&
      score >= 0.34
    );


  return {

    isCandidate:
      isCandidate,

    score:
      score,

    textSimilarity:
      textSimilarity,

    coverage:
      coverage,

    commonWordCount:
      commonWordCount

  };

}


/**
 * ============================================================================
 * MEANINGFUL WORDS
 * ============================================================================
 */

function getMeaningfulWords(
  words
) {

  return (words || []).filter(
    function(word) {

      return (
        !STOP_WORDS.has(word) &&
        word.length > 1
      );

    }
  );

}


/**
 * ============================================================================
 * FIND SIMILAR MATCH
 * ============================================================================
 */

function findSimilarMatch(
  targetParagraph,
  sourceParagraphs,
  matchedSourceIndexes,
  currentTargetIndex
) {

  var bestSourceIndex =
    -1;

  var bestSimilarity =
    0;


  for (
    var sourceIndex = 0;
    sourceIndex < sourceParagraphs.length;
    sourceIndex++
  ) {

    if (
      matchedSourceIndexes[sourceIndex]
    ) {
      continue;
    }


    var metrics =
      calculateParagraphMatchMetrics(
        targetParagraph,
        sourceParagraphs[sourceIndex],
        currentTargetIndex,
        sourceIndex
      );


    if (
      metrics.isCandidate &&
      metrics.score > bestSimilarity
    ) {

      bestSimilarity =
        metrics.score;

      bestSourceIndex =
        sourceIndex;

    }

  }


  return {

    index:
      bestSourceIndex,

    similarity:
      bestSimilarity

  };

}


/**
 * ============================================================================
 * CALCULATE TEXT SIMILARITY
 * ============================================================================
 */

function calculateTextSimilarity(
  words1,
  words2
) {

  if (
    !words1.length ||
    !words2.length
  ) {
    return 0;
  }


  var contentWords1 =
    words1.filter(
      function(word) {

        return (
          !STOP_WORDS.has(word) &&
          word.length > 1
        );

      }
    );


  var contentWords2 =
    words2.filter(
      function(word) {

        return (
          !STOP_WORDS.has(word) &&
          word.length > 1
        );

      }
    );


  if (
    !contentWords1.length ||
    !contentWords2.length
  ) {
    return 0;
  }


  var wordSet1 =
    new Set(
      contentWords1
    );

  var wordSet2 =
    new Set(
      contentWords2
    );

  var commonWordCount =
    0;


  wordSet1.forEach(
    function(word) {

      if (
        wordSet2.has(word)
      ) {
        commonWordCount++;
      }

    }
  );


  return (
    2.0 *
    commonWordCount
  ) / (
    wordSet1.size +
    wordSet2.size
  );

}


/**
 * ============================================================================
 * CALCULATE TEXT CHANGES
 * ============================================================================
 */

function calculateTextChanges(
  sourceText,
  targetText
) {

  var isExactMatch =
    sourceText.trim() ===
    targetText.trim();


  if (
    isExactMatch
  ) {

    return {

      sourceHtml:
        escapeHtmlText(
          sourceText
        ),

      targetHtml:
        escapeHtmlText(
          targetText
        ),

      hasChanges:
        false,

      isRewrite:
        false,

      isExactMatch:
        true

    };

  }


  var sourceTokens =
    sourceText.match(
      /\w+|[^\w\s]|\s+/g
    ) || [];

  var targetTokens =
    targetText.match(
      /\w+|[^\w\s]|\s+/g
    ) || [];


  var lcsMatrix =
    Array(
      sourceTokens.length + 1
    )
      .fill(null)
      .map(
        function() {

          return Array(
            targetTokens.length + 1
          ).fill(0);

        }
      );


  for (
    var sourceIndex = 1;
    sourceIndex <= sourceTokens.length;
    sourceIndex++
  ) {

    for (
      var targetIndex = 1;
      targetIndex <= targetTokens.length;
      targetIndex++
    ) {

      if (
        normalizeText(
          sourceTokens[
            sourceIndex - 1
          ]
        ) ===
        normalizeText(
          targetTokens[
            targetIndex - 1
          ]
        )
      ) {

        lcsMatrix[
          sourceIndex
        ][
          targetIndex
        ] =
          lcsMatrix[
            sourceIndex - 1
          ][
            targetIndex - 1
          ] + 1;

      } else {

        lcsMatrix[
          sourceIndex
        ][
          targetIndex
        ] =
          Math.max(

            lcsMatrix[
              sourceIndex - 1
            ][
              targetIndex
            ],

            lcsMatrix[
              sourceIndex
            ][
              targetIndex - 1
            ]

          );

      }

    }

  }


  var sourcePosition =
    sourceTokens.length;

  var targetPosition =
    targetTokens.length;

  var addedCount =
    0;

  var deletedCount =
    0;


  while (
    sourcePosition > 0 ||
    targetPosition > 0
  ) {

    if (
      sourcePosition > 0 &&
      targetPosition > 0 &&

      normalizeText(
        sourceTokens[
          sourcePosition - 1
        ]
      ) ===

      normalizeText(
        targetTokens[
          targetPosition - 1
        ]
      )
    ) {

      sourcePosition--;
      targetPosition--;

    } else if (

      targetPosition > 0 &&

      (
        sourcePosition === 0 ||

        lcsMatrix[
          sourcePosition
        ][
          targetPosition - 1
        ] >=

        lcsMatrix[
          sourcePosition - 1
        ][
          targetPosition
        ]
      )

    ) {

      if (
        targetTokens[
          targetPosition - 1
        ]
          .trim()
          .length > 0
      ) {
        addedCount++;
      }

      targetPosition--;

    } else if (
      sourcePosition > 0
    ) {

      if (
        sourceTokens[
          sourcePosition - 1
        ]
          .trim()
          .length > 0
      ) {
        deletedCount++;
      }

      sourcePosition--;

    }

  }


  var targetWordCount =
    targetTokens.filter(
      function(token) {

        return (
          token.trim().length > 0
        );

      }
    ).length;


  var sourceWordCount =
    sourceTokens.filter(
      function(token) {

        return (
          token.trim().length > 0
        );

      }
    ).length;


  var isRewrite =
    (
      targetWordCount > 0 &&
      addedCount /
        targetWordCount >=
        0.65
    ) ||
    (
      sourceWordCount > 0 &&
      deletedCount /
        sourceWordCount >=
        0.65
    );


  return {

    sourceHtml:
      escapeHtmlText(
        sourceText
      ),

    targetHtml:
      escapeHtmlText(
        targetText
      ),

    hasChanges:
      addedCount > 0 ||
      deletedCount > 0,

    isRewrite:
      isRewrite,

    isExactMatch:
      false

  };

}


/**
 * ============================================================================
 * NORMALIZE TEXT
 * ============================================================================
 */

function normalizeText(
  text
) {

  return text
    .toLowerCase()
    .replace(
      /[^\w]/g,
      ""
    );

}


/**
 * ============================================================================
 * ESCAPE HTML
 * ============================================================================
 */

function escapeHtmlText(
  text
) {

  return String(text || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    );

}


/**
 * ============================================================================
 * GET TAB BODY
 * ============================================================================
 */

function getTabBody(
  document,
  tabId
) {

  if (
    tabId === "main"
  ) {
    return document.getBody();
  }

  var tabs =
    document.getTabs();

  return findTabBody(
    tabs,
    tabId
  );

}


/**
 * ============================================================================
 * FIND TAB BODY RECURSIVELY
 * ============================================================================
 */

function findTabBody(
  tabs,
  tabId
) {

  for (
    var index = 0;
    index < tabs.length;
    index++
  ) {

    var currentTab =
      tabs[index];

    if (
      currentTab.getId() ===
      tabId
    ) {

      var documentTab =
        currentTab.asDocumentTab();

      return documentTab
        ? documentTab.getBody()
        : null;

    }


    var childTabs =
      currentTab.getChildTabs();

    if (
      childTabs &&
      childTabs.length > 0
    ) {

      var foundBody =
        findTabBody(
          childTabs,
          tabId
        );

      if (
        foundBody
      ) {
        return foundBody;
      }

    }

  }

  return null;

}