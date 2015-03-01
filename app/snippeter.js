function Snippeter (conf) {
  this.snippets = [];
  this.inputElements = null;
  this.startTag = '#';
  this.listElement = null;

  if ('snippets' in conf) this.snippets = conf.snippets;
  if ('inputElements' in conf) this.inputElements = conf.inputElements;
  if ('startTag' in conf) this.startTag = conf.startTag;
  if ('snippetToHtml' in conf) this.snippetToHtml = conf.snippetToHtml;
  if ('listElement' in conf) this.listElement = conf.listElement;
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

  this.inputElements.keydown(function (event) {
    that.keydown(event);
  });

  this.inputElements.keyup(function (event) {
    that.keyup(event)
  });
}

Snippeter.prototype.keydown = function keydown (event)
{
  var element = $(event.target);
  var text = element.val();
  var caretPos = element.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);
  if (startTagPos >= 0) { //found open tag before caret
    if ( event.keyCode === 13) { //enter
      event.preventDefault();
      this.insertSelected();
    } else if (event.keyCode === 38) { //up
      event.preventDefault();
      this.selectionUp();
    } else if (event.keyCode === 40) { //down
      event.preventDefault();
      this.selectionDown();
    }
  }
}

Snippeter.prototype.keyup = function keyup (event)
{
  var element = $(event.target);
  var text = element.val();
  var caretPos = element.caret();
  var startTagPos = text.substring(0,caretPos).lastIndexOf(this.startTag);
  if (startTagPos >= 0) { //found open tag before caret
    if (event.keyCode === 27) { // Escape
      this.deleteTag(element);
    } else if ( -1 === $.inArray(event.keyCode, [13, 27, 38, 40])) { //other keys than our special keys
      // (27 should not occur here but keep it for safety if code is restructured)
      // search and display snippets
      var searchText = text.substring(startTagPos + this.startTag.length, caretPos);
      var snippets = this.filterSnippets(searchText);
      this.updateList(snippets, searchText, element);
    }
  } else {
    //clean list
    this.updateList(null, null, element);
  }
};

Snippeter.prototype.selectFirst = function selectFirst ()
{
  this.listElement.children('.selected').removeClass('selected');
  this.listElement.children().first().addClass('selected');
}

Snippeter.prototype.selectLast = function selectLast ()
{
  this.listElement.children('.selected').removeClass('selected');
  this.listElement.children().last().addClass('selected');
}

Snippeter.prototype.selectionUp = function selectionUp ()
{
  var selected = this.listElement.children('.selected');
  selected.removeClass('selected');
  if (selected.prev().length) {
    selected.prev().addClass('selected');
  } else {
    this.selectLast();
  }
}

Snippeter.prototype.selectionDown = function selectionDown ()
{
  var selected = this.listElement.children('.selected');
  selected.removeClass('selected');
  if (selected.next().length) {
    selected.next().addClass('selected');
  } else {
    this.selectFirst();
  }
}

Snippeter.prototype.insertSelected = function insertSelected ()
{
  this.listElement.children('.selected').trigger('click');
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

Snippeter.prototype.updateList = function updateList (snippets, searchText, target)
{
  console.log('updateList: ', snippets);

  var triggerUpdate = false;

  if (this.listElement.children().length) {
    triggerUpdate = true;
  }
  this.listElement.empty();

  if (snippets && snippets.length) {
    var that = this;
    snippets.forEach(function (snippet) {
      var snippetHtml = that.snippetToHtml(snippet);
      snippetHtml = that.highlighter(snippetHtml, searchText);
      var snippetElement = $(snippetHtml);
      snippetElement.click(function () {
        that.insert(snippet, target);
      });
      snippetElement.appendTo(that.listElement);
    });

    this.selectFirst();
    triggerUpdate = true;
  }

  if (triggerUpdate) {
    var options = {type: 'update'};
    if (target) {
      options.relatedTarget = target[0];
    }
    this.listElement.trigger(options);
  }
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

  target.trigger('keyup');
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

  target.trigger('keyup');
}

Snippeter.prototype.snippetMatcher = function snippetMatcher (snippet, input) {
  var words = input.split(' ');
  var i;
  for (i = 0; i < words.length; i++) {
    if (words[i] !== ' ' && words[i] !== '') {
      var regExp = new RegExp('(' + words[i] + ')', 'gi');
      if (typeof snippet === 'string' && !snippet.match(regExp)) {
        return false;
      }
      if (typeof snippet === 'object'
          && !(this.snippetKeywords(snippet).match(regExp) || this.snippetValue(snippet).match(regExp))
      )
        return false;
    }
  }
  return true;
};

Snippeter.prototype.snippetToHtml = function snippetToHtml (snippet)
{
  if (typeof snippet === 'string') {
    return '<div>' + snippet + '</div>';
  }
  if (typeof snippet === 'object') {
    return '<div>'
      + '<div class="keywords">' + this.snippetKeywords(snippet) + '</div>'
      + '<div class="value">' + this.snippetValue(snippet) + '</div>'
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

