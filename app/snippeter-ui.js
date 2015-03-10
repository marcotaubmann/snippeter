(function ($) {

$.widget( "marcotaubmann.snippeter", {
  //default options
  options: {
    snippets: [],
    activator: '#',
    caretTag: '[caret]',
    excludeSign: '-',
    selectedClass: 'ui-state-focus',
    nonselectedClass: 'ui-menu-item',
    highlightClass: 'ui-state-highlight',
    snippetClass: 'ui-snippeter-snippet',
    keywordsClass: 'ui-snippeter-snippet-keywords ui-priority-secondary',
    valueClass: 'ui-snippeter-snippet-value ui-priority-primary',
    listElement: null // real default set in setOption constrain
  },

  _setOption: function (key, value) {
    if (key === 'listElement') {
      if (value === null) {
        value = $('<div></div>').addClass('ui-menu ui-widget ui-widget-content ui-helper-clearfix ui-snippeter-list');
        this.element.after(value);
      }
      this.list = $(value); // wrapped by $() because value can be a plain js dom element
    }
    this._super(key, value);
  },

  _create: function () {
    var that = this;

    this._setOption('listElement', this.options.listElement);

    this.element.on('keydown', function (event) {
      that._keydown(event);
    });

    this.element.on('keyup click focusin', function (event) {
      if ([9, 13, 27, 38, 40].indexOf(event.keyCode) <= -1)  {
        that._refresh();
      }
    });

    $(document).on('click', function (event) {
      if ( event.target === that.list[0] //clicked list
        || $.contains(that.list[0], event.target) // clicked into list
        || event.target === that.element[0] // clicked into the input element
      )
      {
        return;
      }
      that._clearList();
    });
  },

  _keydown: function (event) {
    if ( event.keyCode === 9) { //tab
      this._clearList();
      return;
    }

    var text = this.element.val();
    var caretPos = this.element.caret();
    var activatorPos = text.substring(0,caretPos).lastIndexOf(this.options.activator);
    if (activatorPos >= 0) { //found activator before caret
      if ( event.keyCode === 13) { //enter
        event.preventDefault();
        this._insertSelected();
      } else if (event.keyCode === 27) { //escape
        this._deactivate();
        this._refresh();
      } else if (event.keyCode === 38) { //up
        event.preventDefault();
        this._selectionUp();
      } else if (event.keyCode === 40) { //down
        event.preventDefault();
        this._selectionDown();
      }
    }
  },

  _selectFirst: function () {
    this.list.children('.' + this.options.selectedClass).removeClass(this.options.selectedClass);
    this.list.children().first().addClass(this.options.selectedClass).trigger('select');
  },

  _selectLast: function () {
    this.list.children('.' + this.options.selectedClass).removeClass(this.options.selectedClass);
    this.list.children().last().addClass(this.options.selectedClass).trigger('select');
  },

  _selectionUp: function () {
    var selected = this.list.children('.' + this.options.selectedClass);
    selected.removeClass(this.options.selectedClass);
    if (selected.prev().length) {
      selected.prev().addClass(this.options.selectedClass).trigger('select');
    } else {
      this._selectLast();
    }
  },

  _selectionDown: function () {
    var selected = this.list.children('.' + this.options.selectedClass);
    selected.removeClass(this.options.selectedClass);
    if (selected.next().length) {
      selected.next().addClass(this.options.selectedClass).trigger('select');
    } else {
      this._selectFirst();
    }
  },

  _insertSelected: function () {
    this.list.children('.' + this.options.selectedClass).trigger('insert');
  },

  _deactivate: function () {
    var text = this.element.val();
    var caretPos = this.element.caret();
    var activatorPos = text.substring(0,caretPos).lastIndexOf(this.options.activator);

    this.element.val(
      text.substring(0, activatorPos)
      + text.substring(caretPos)
    );

    this.element.caret(activatorPos);
  },

  _refresh: function () {
    var text = this.element.val();
    var caretPos = this.element.caret();
    var activatorPos = text.substring(0,caretPos).lastIndexOf(this.options.activator);
    if (activatorPos >= 0) { // found activator before caret
        // search and display snippets
        var searchText = $.trim(text.substring(activatorPos + this.options.activator.length, caretPos));
        var snippets = this._searchSnippets(searchText);
        this._updateList(snippets, searchText);
    } else { // there is no activator before caret
      this._clearList();
    }
  },

  _searchSnippets: function (searchText) {
    if (searchText === '') {
      return this.options.snippets;
    } else {
      var that = this;
      var filtered = this.options.snippets.filter(function (snippet) {
        return that._snippetMatchesSearchText(snippet, searchText);
      });
      return filtered;
    }
  },

  _clearList: function () {
    this._updateList(null, null);
  },

  _updateList: function (snippets, searchText) {
    this.list.hide();
    this.list.empty();

    if (snippets && snippets.length) {
      var that = this;
      snippets.forEach(function (snippet) {
        var highlighted = {
          keywords: that._highlight(that._snippetKeywords(snippet), searchText),
          value: that._highlight(that._snippetValue(snippet), searchText)
        };
        var snippetHtml = that._snippetToHtml(highlighted);
        var snippetElement = $(snippetHtml)
          .addClass(that.options.nonselectedClass);
        snippetElement.on('click insert', function () {
          that._insert(snippet);
          that._refresh();
        });
        snippetElement.appendTo(that.list);
      });

      this._selectFirst();

      this.list.show();
      this.list.css('width', this.element.width())
      this.list.position({
        my: 'left bottom',
        at: 'left top',
        of: this.element
      });
    }
    this.list.trigger('update');
  },

  _snippetMatchesSearchText: function (snippet, searchText) {
    var words = searchText.split(' ');
    var i;
    for (i = 0; i < words.length; i++) {
      var word = words[i];
      if (! this._snippetMatchesWord(snippet, word) ) {
        return false;
      }
    }
    return true;
  },

  _snippetMatchesWord: function (snippet, word) {
    var wordAllowed = true;
    if (word.charAt(0) === this.options.excludeSign) {
      word = word.substring(1);
      wordAllowed = false;
    }
    if (word === ' ' || word === '') {
      return true;
    }

    var regExp = new RegExp('(' + word + ')', 'gi');

    var wordContained = false;
    if (typeof snippet === 'string') {
      wordContained = $.isArray(snippet.replace(this.options.caretTag, '').match(regExp));
    }
    if (typeof snippet === 'object') {
      wordContained = $.isArray(this._snippetKeywords(snippet).match(regExp))
        || $.isArray(this._snippetValue(snippet).replace(this.options.caret, '').match(regExp));
    }

    return wordAllowed === wordContained;
  },

  _snippetToHtml: function (snippet) {
    if (typeof snippet === 'string') {
      return '<div class="' + this.options.snippetClass + ' ' + this.options.valueClass + '">'
        + snippet.replace(this.options.caretTag, '')
        + '</div>';
    }
    if (typeof snippet === 'object') {
      return '<div class="' + this.options.snippetClass + '">'
        + '<div class="' + this.options.keywordsClass + '">' + this._snippetKeywords(snippet) + '</div>'
        + '<div class="' + this.options.valueClass + '">' + this._snippetValue(snippet).replace(this.options.caretTag, '') + '</div>'
        + '</div>';
    }
  },

  _highlight: function (text, search) {
    if (search === '') {
      return text;
    }
    var words = search.split(' ');
    var i;
    for (i = 0; i < words.length; i++) {
      var word = words[i];
      if (word.charAt(0) !== this.options.excludeSign) { // don't highlight exclude sign
        var regExp = new RegExp('(' + word + ')', 'gi');
        text = text.replace(regExp, '<span class="' + this.options.highlightClass + '">$1</span>');
      }
    }
    return text;
  },

  _insert: function (snippet) {
    var text = this.element.val();
    var caretPos = this.element.caret();
    var activatorPos = text.substring(0,caretPos).lastIndexOf(this.options.activator);

    var snippetValue;
    if (typeof snippet === 'string') {
      snippetValue = snippet;
    }
    if (typeof snippet === 'object') {
      snippetValue = this._snippetValue(snippet);
    }

    this.element.val(
      text.substring(0, activatorPos)
      + snippetValue
      + text.substring(caretPos)
    );

    this.element.caret(activatorPos + snippetValue.length);

    var caretTagPos = this.element.val().substring(0, this.element.caret()).lastIndexOf(this.options.caretTag);
    if (caretTagPos >= 0) { // found caretTag
      this.element.val(this.element.val().replace(this.options.caretTag, ''));
      this.element.caret(caretTagPos);
    }
  },

  _snippetKeywords: function (snippet) {
    if (typeof snippet === 'object') {
      return snippet.keywords;
    }
    return '';
  },

  _snippetValue: function (snippet) {
    if (typeof snippet === 'object') {
      return snippet.value;
    }
    return snippet;
  }

});

}(jQuery));
