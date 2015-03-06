function Snippeter (conf) {
  this.snippets = [];
  this.inputElements = null;
  this.startTag = '#';
  this.listElement = null;
  this.caretTag ='[SnippeterCaretTag]';
  this.excludeSign = '-';

  if ('snippets' in conf) this.snippets = conf.snippets;
  if ('inputElements' in conf) this.inputElements = conf.inputElements;
  if ('startTag' in conf) this.startTag = conf.startTag;
  if ('snippetToHtml' in conf) this.snippetToHtml = conf.snippetToHtml;
  if ('listElement' in conf) this.listElement = conf.listElement;
  if ('caretTag' in conf) this.caretTag = conf.caretTag;
  if ('excludeSign' in conf) this.excludeSign = conf.excludeSign;
  if ('snippetMatcher' in conf) this.snippetMatcher = conf.snippetMatcher;
  if ('highlighter' in conf) this.highlighter = conf.highlighter;
  if ('snippetKeywords' in conf) this.snippetKeywords = conf.snippetKeywords;
  if ('snippetValue' in conf) this.snippetValue = conf.snippetValue;

  this.init();

}

Snippeter.prototype.init = function init ()
{
  this.inputElements = $(this.inputElements);
  this.listElement = $(this.listElement);

  var that = this;

  this.inputElements.on('keydown', function (event) {
    that.keydown(event);
  });

  this.inputElements.on('keyup click focusin', function (event) {
    if ([9, 13,27,38,40].indexOf(event.keyCode) <= -1)  {
      that.inputElementUpdate($(event.target));
    }
  });

  $(document).click(function (event) {
    if ( event.target === that.listElement[0] // clicked list
         || $.contains(that.listElement[0], event.target) // clicked into list
         || that.inputElements.index(event.target) >= 0 // clicked into one of the input elements
    )
    {
      return;
    }
    that.cleanList(that.inputElements.first());
  });
}

Snippeter.prototype.keydown = function keydown (event)
{
  var inputElement = $(event.target);
  if ( event.keyCode === 9) { //tab
    this.cleanList(inputElement);
    return;
  }

  var text = inputElement.val();
  var caretPos = inputElement.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);
  if (startTagPos >= 0) { //found open tag before caret
    if ( event.keyCode === 13) { //enter
      event.preventDefault();
      this.insertSelected();
    } else if (event.keyCode === 27) { //escape
      this.deleteTag(inputElement);
      this.inputElementUpdate(inputElement);
    } else if (event.keyCode === 38) { //up
      event.preventDefault();
      this.selectionUp();
    } else if (event.keyCode === 40) { //down
      event.preventDefault();
      this.selectionDown();
    }
  }
}

Snippeter.prototype.inputElementUpdate = function inputElementUpdate (inputElement)
{
  console.log('inputElementUpdate: ', inputElement);
  var text = inputElement.val();
  var caretPos = inputElement.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);
  if (startTagPos >= 0) { // found open tag before caret
      // search and display snippets
      var searchText = text.substring(startTagPos + this.startTag.length, caretPos);
      var snippets = this.filterSnippets(searchText);
      this.updateList(snippets, searchText, inputElement);
  } else { // there is no open tag before caret
    //clean list
    this.cleanList(inputElement);
  }
};

Snippeter.prototype.selectFirst = function selectFirst ()
{
  this.listElement.children('.selected').removeClass('selected');
  this.listElement.children().first().addClass('selected').trigger('select');
}

Snippeter.prototype.selectLast = function selectLast ()
{
  this.listElement.children('.selected').removeClass('selected');
  this.listElement.children().last().addClass('selected').trigger('select');
}

Snippeter.prototype.selectionUp = function selectionUp ()
{
  var selected = this.listElement.children('.selected');
  selected.removeClass('selected');
  if (selected.prev().length) {
    selected.prev().addClass('selected').trigger('select');
  } else {
    this.selectLast();
  }
}

Snippeter.prototype.selectionDown = function selectionDown ()
{
  var selected = this.listElement.children('.selected');
  selected.removeClass('selected');
  if (selected.next().length) {
    selected.next().addClass('selected').trigger('select');
  } else {
    this.selectFirst();
  }
}

Snippeter.prototype.insertSelected = function insertSelected ()
{
  this.listElement.children('.selected').trigger('insert');
}


Snippeter.prototype.filterSnippets = function filterSnippets (searchText)
{
  console.log('filterSnippets: ', searchText);
  if (searchText === '') {
    return this.snippets;
  } else {
    var that = this;
    var filtered = this.snippets.filter(function (snippet) {
      return that.snippetMatcher(snippet, searchText);
    });
    return filtered;
  }
}

Snippeter.prototype.cleanList = function cleanList (relatedTarget)
{
  console.log('cleanList: ', relatedTarget);
  this.listElement.empty();
  this.listElement.trigger({type: 'update', relatedTarget: relatedTarget[0]});
}

Snippeter.prototype.updateList = function updateList (snippets, searchText, relatedTarget)
{
  console.log('updateList: ', snippets, searchText, relatedTarget);

  this.listElement.empty();

  if (snippets && snippets.length) {
    var that = this;
    snippets.forEach(function (snippet) {
      var snippetHtml = that.snippetToHtml(snippet);
      snippetHtml = that.highlighter(snippetHtml, searchText);
      var snippetElement = $(snippetHtml);
      snippetElement.on('click insert', function () {
        that.insert(snippet, relatedTarget);
        that.inputElementUpdate(relatedTarget);
      });
      snippetElement.appendTo(that.listElement);
    });
  }

  this.listElement.trigger({type: 'update', relatedTarget: relatedTarget[0]});
  this.selectFirst();
}

Snippeter.prototype.insert = function insert (snippet, target)
{
  console.log('insert: ', snippet);

  var text = target.val();
  var caretPos = target.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);

  var snippetValue;
  if (typeof snippet === 'string') {
    snippetValue = snippet;
  }
  if (typeof snippet === 'object') {
    snippetValue = this.snippetValue(snippet);
  }

  target.val(
    text.substring(0, startTagPos)
    + snippetValue
    + text.substring(caretPos)
  );

  target.caret(startTagPos + snippetValue.length);

  var caretTagPos = target.val().substring(0, target.caret()).lastIndexOf(this.caretTag);
  if (caretTagPos >= 0) { // found caretTag
    target.val(target.val().replace(this.caretTag, ''));
    target.caret(caretTagPos);
  }
}

Snippeter.prototype.deleteTag = function deleteTag (target)
{
  console.log('deleteTag ');

  var text = target.val();
  var caretPos = target.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);

  target.val(
    text.substring(0, startTagPos)
    + text.substring(caretPos)
  );

  target.caret(startTagPos);
}

Snippeter.prototype.snippetMatcher = function snippetMatcher (snippet, input)
{
  var words = input.split(' ');
  var i;
  for (i = 0; i < words.length; i++) {
    var word = words[i];
    if (this.wordExcludesSnippet(word, snippet) ) {
      return false;
    }
  }
  return true;
}

Snippeter.prototype.wordExcludesSnippet = function wordBansSnippet (word, snippet)
{
  var wordAllowed = true;
  if (word.charAt(0) === this.excludeSign) {
    word = word.substring(1);
    wordAllowed = false;
  }
  if (word === ' ' || word === '') {
    return false;
  }

  var regExp = new RegExp('(' + word + ')', 'gi');

  var wordContained = false;
  if (typeof snippet === 'string') {
    wordContained = $.isArray(snippet.replace(this.caretTag, '').match(regExp));
  }
  if (typeof snippet === 'object') {
    wordContained = $.isArray(this.snippetKeywords(snippet).match(regExp))
      || $.isArray(this.snippetValue(snippet).replace(this.caret, '').match(regExp));
  }

  return wordAllowed !== wordContained;
}

Snippeter.prototype.snippetToHtml = function snippetToHtml (snippet)
{
  if (typeof snippet === 'string') {
    return '<div>' + snippet.replace(this.caretTag, '') + '</div>';
  }
  if (typeof snippet === 'object') {
    return '<div>'
      + '<div class="keywords">' + this.snippetKeywords(snippet) + '</div>'
      + '<div class="value">' + this.snippetValue(snippet).replace(this.caretTag, '') + '</div>'
      + '</div>';
  }
};

Snippeter.prototype.highlighter = function highlighter (source, highlight) {
  if (highlight === '') {
    return source;
  }
  var words = highlight.split(' ');
  var i;
  for (i = 0; i < words.length; i++) {
    if (words[i].length > 1) { // don't highlight single characters to minimize highlighting html code :)
      var regExp = new RegExp('(' + words[i] + ')', 'gi');
      source = source.replace(regExp, '<span class="highlight">$1</span>');
    }
  }
  return source;
};

Snippeter.prototype.snippetKeywords = function snippetKeywords (snippet)
{
  return snippet.keywords;
}

Snippeter.prototype.snippetValue = function snippetValue (snippet)
{
  return snippet.value;
}
