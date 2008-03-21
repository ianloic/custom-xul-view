
// Shorthand
if (typeof(Cc) == "undefined") var Cc = Components.classes;
if (typeof(Ci) == "undefined") var Ci = Components.interfaces;
if (typeof(Cu) == "undefined") var Cu = Components.utils;
if (typeof(Cr) == "undefined") var Cr = Components.results;

// Make sure we have the javascript modules we're going to use
if (!window.SBProperties) 
  Cu.import("resource://app/jsmodules/sbProperties.jsm");
if (!window.LibraryUtils) 
  Cu.import("resource://app/jsmodules/sbLibraryUtils.jsm");
if (!window.kPlaylistCommands) 
  Cu.import("resource://app/jsmodules/kPlaylistCommands.jsm");


/* cell classes should look like this */
function Cell() { }
Cell.prototype={}
Cell.prototype.setMediaItem = function Cell_setMediaItem(mediaItem) { }
Cell.prototype.element = undefined; /* DOM element */

function LabelCell(property, width, transform) {
  this.element = document.createElement('label');
  if (width != undefined) {
    this.element.setAttribute('width', width);
    this.element.setAttribute('crop', 'end');
  }
  this.setMediaItem = function setMediaItem(mediaItem) {
    var value = mediaItem.getProperty(property);
    if (transform) {
      value = transform(value);
    }
    this.element.setAttribute('value', value);
  }
}

function ButtonCell(property, width, transform) {
  this.element = document.createElement('button');
  if (width != undefined) {
    this.element.setAttribute('width', width);
    this.element.setAttribute('crop', 'end');
  }
  this.setMediaItem = function setMediaItem(mediaItem) {
    var value = mediaItem.getProperty(property);
    if (transform) {
      value = transform(value);
    }
    this.element.setAttribute('label', value);
  }
}

function create_columns() {
  return [
    new LabelCell(SBProperties.trackNumber, 30),
    new LabelCell(SBProperties.trackName, 150), 
    new LabelCell(SBProperties.albumName, 150),
    new ButtonCell(SBProperties.artistName), 
    new LabelCell(SBProperties.duration, 50),
  ];
}


function Row() {
  this.element = document.createElement("hbox");
  this._columns = create_columns();

  for (var i=0; i<this._columns.length; i++) {
    this.element.appendChild(this._columns[i].element);
  }
}
Row.prototype = {}
Row.prototype.setMediaItem = function (mediaItem) {
  for (var i=0; i<this._columns.length; i++) {
    this._columns[i].setMediaItem(mediaItem);
  }
}


function MediaGrid() {
  this._header = document.getElementById('header');
  this._body = document.getElementById('body');
  this._scrollbar = document.getElementById('scrollbar');
  this._rows = [];
  this._position = 0;
  this._scrollbar.setAttribute('curpos', this._position);

  while (this._body.boxObject.height < document.documentElement.boxObject.height) {
    var row = new Row();
    this._rows.push(row);
    this._body.appendChild(row.element);
  }

  this._scrollbar.setAttribute('maxpos', 
      window.mediaPage.mediaListView.length);
  this.scrollTo(this._position);
  var self = this;
  /*
  this._scrollbar.addEventListener('mousedown', function(event) { self._update(); }, false);
  this._scrollbar.addEventListener('mousemove', function(event) { self._update(); }, false);
  this._scrollbar.addEventListener('mouseup', function(event) { self._update(); }, false);
  */
  window.setInterval(function(){self._update()}, 100);
}
MediaGrid.prototype = {}
MediaGrid.prototype.scrollTo = 
function MediaGrid_scrollTo(index) {
  dump('scrollTo('+index+')\n');
  for (var i=0; i<this._rows.length; i++) {
    var item = window.mediaPage.mediaListView.getItemByIndex(index+i);
    dump('setting row '+i+' to item: '+item.guid+'\n');
    this._rows[i].setMediaItem(item);
  }
}
MediaGrid.prototype._update =
function MediaGrid_update() {
  var pos = parseInt(this._scrollbar.getAttribute('curpos'));
  if (pos != this._position) {
    this._position = pos;
    this.scrollTo(pos);
  }
}

var grid = null;
window.addEventListener('load', function() { grid = new MediaGrid();}, false);



/**
 * Media Page Controller
 *
 * In order to display the contents of a library or list, pages
 * must provide a "window.mediaPage" object implementing
 * the Songbird sbIMediaPage interface. This interface allows
 * the rest of Songbird to talk to the page without knowledge 
 * of what the page looks like.
 *
 * In this particular page most functionality is simply 
 * delegated to the sb-playlist widget.
 */
window.mediaPage = {
    
    // The sbIMediaListView that this page is to display
  _mediaListView: null,
    
    // The sb-playlist XBL binding
  _playlist: null, 
    
  
  /** 
   * Gets the sbIMediaListView that this page is displaying
   */
  get mediaListView()  {
    return this._mediaListView;
  },
  
  
  /** 
   * Set the sbIMediaListView that this page is to display.
   * Called in the capturing phase of window load by the Songbird browser.
   * Note that to simplify page creation mediaListView may only be set once.
   */
  set mediaListView(value)  {
    
    if (!this._mediaListView) {
      this._mediaListView = value;
    } else {
      throw new Error("mediaListView may only be set once.  Please reload the page");
    }
  },
    
    
  /** 
   * Called when the page finishes loading.  
   * By this time window.mediaPage.mediaListView should have 
   * been externally set.  
   */
  onLoad:  function(e) {
   
    if (!this._mediaListView) {
      Components.utils.reportError("Media Page did not receive  " + 
                                   "a mediaListView before the onload event!");
      return;
    } 
    
    this._playlist = document.getElementById("playlist");
    
    //
    // TODO: Do something interesting here!
    //
    
    // Get playlist commands (context menu, keyboard shortcuts, toolbar)
    // Note: playlist commands currently depend on the playlist widget.
    var mgr =
      Components.classes["@songbirdnest.com/Songbird/PlaylistCommandsManager;1"]
                .createInstance(Components.interfaces.sbIPlaylistCommandsManager);
    var cmds = mgr.request(kPlaylistCommands.MEDIAITEM_DEFAULT);
    
    // Set up the playlist widget
    //this._playlist.bind(this._mediaListView, cmds);
  },
    
    
  /** 
   * Called as the window is about to unload
   */
  onUnload:  function(e) {
    if (this._playlist) {
      this._playlist.destroy();
      this._playlist = null;
    }
  },
    
  
  /** 
   * Show/highlight the MediaItem at the given MediaListView index.
   * Called by the Find Current Track button.
   */
  highlightItem: function(aIndex) {
    this._playlist.highlightItem(aIndex);
  },
    
  
  /** 
   * Called when something is dragged over the tabbrowser tab for this window
   */
  canDrop: function(aEvent, aSession) {
    return this._playlist.canDrop(aEvent, aSession);
  },
    
  
  /** 
   * Called when something is dropped on the tabbrowser tab for this window
   */
  onDrop: function(aEvent, aSession) {
    return this._playlist.
        _dropOnTree(this._playlist.mediaListView.length,
                Ci.sbIMediaListViewTreeViewObserver.DROP_AFTER);
  }
    
      
} // End window.mediaPage 


