/**
 ** More info at http://www.opentip.org
 **
 ** Copyright (c) 2009, Matias Meno
 ** Graphics by Tjandra Mayerhold
 **
 ** Permission is hereby granted, free of charge, to any person obtaining a copy
 ** of this software and associated documentation files (the "Software"), to deal
 ** in the Software without restriction, including without limitation the rights
 ** to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 ** copies of the Software, and to permit persons to whom the Software is
 ** furnished to do so, subject to the following conditions:
 **
 ** The above copyright notice and this permission notice shall be included in
 ** all copies or substantial portions of the Software.
 **
 ** THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 ** IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 ** FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 ** AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 ** LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 ** OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 ** THE SOFTWARE.
 **
 **/


/**
 ** Usage:
 **
 ** <div onmouseover="javascript:Tips.add(this, event, 'Content', { options });"></div>
 **
 ** or externally:
 **
 ** $('elementId').addTip('Content', { options });
 **
 ** For a full documentation, please visit http://www.opentip.org/documentation
 **/


(function( $ ){
  
  /**
   * Returns a jQuery with the created element. This the same as $('<div>') but
   * faster, because it prevents parsing.
   */
  var el = function(nodeName) {
    return $(document.createElement(nodeName));
  }

  /**
   * Returns a string with the first character uppercased
   */
  var ucfirst = function(string) {
    return string.replace(/^\w/, function(val) {
      return val.toUpperCase();
    });
  };

  $.fn.addTip = function() {
    var args = $.makeArray(arguments);
    args.unshift(this);
    this.each(function() {
      Tips.add.apply(Tips, args);
    });
    return this;
  };


  /**
   * Namespace and helper functions for opentips.
   */
  this.Opentip = {

    Version: '1.4.1',
    REQUIRED_JQUERY_VERSION: '1.6.0',
    REQUIRED_JQUERY_UI_VERSION: '1.8.0',
    STICKS_OUT_TOP: 1,
    STICKS_OUT_BOTTOM: 2,
    STICKS_OUT_LEFT: 1,
    STICKS_OUT_RIGHT: 2,
    cached: {},
    debugging: false,
    load: function() {
      function getComparableVersion(version) {
        var v = version.split('.');
        return parseInt(v[0])*100000 + parseInt(v[1])*1000 + parseInt(v[2]);
      }
      if((typeof $ === 'undefined') || (getComparableVersion($.fn.jquery) < getComparableVersion(Opentip.REQUIRED_JQUERY_VERSION))) {
        throw("Opentip requires the jQuery JavaScript framework >= " + Opentip.REQUIRED_JQUERY_VERSION);
      }

      Opentip.useCss3Transitions = Opentip.supports('transition');
      Opentip.useJQueryTransitions = ! Opentip.useCss3Transitions;

      if (Opentip.useCss3Transitions) Opentip.debug('Using CSS3 transitions.');

      if((typeof $.ui === 'undefined') || (getComparableVersion($.version) < getComparableVersion(Opentip.REQUIRED_JQUERY_UI_VERSION))) {
        Opentip.debug('No jQuery UI available (or not the version required). Disabling scriptaculous transitions.');
        Opentip.useJQueryTransitions = false;
      }
    },
    debug: function() {
      if (this.debugging && typeof console !== 'undefined' && typeof console.debug !== 'undefined') console.debug.apply(console, arguments);
    },
    IEVersion: function() {
      if (typeof Opentip.cached.IEVersion !== 'undefined') return Opentip.cached.IEVersion;
      if ($.browser.msie) {
        var version = navigator.userAgent.match('MSIE ([\\d.]+)');
        var IEVersion = version ? (parseFloat(version[1])) : false;
      }
      else IEVersion = false;
      Opentip.cached.IEVersion = IEVersion;
      return IEVersion;
    },
    objectIsEvent: function(obj) {
      // There must be a better way of doing this.
      return (typeof(obj) == 'object' && obj.type && obj.screenX);
    },
    useIFrame: function() {
      return Opentip.IEVersion() ? (Opentip.IEVersion() <= 6) : false;
    },
    lastTipId: 1,
    lastZIndex: 100,
    documentIsLoaded: false,
    postponeCreation: function(createFunction) {
      if (Opentip.documentIsLoaded || !Opentip.IEVersion()) createFunction();
      else {
        $(window).load(createFunction); // Sorry IE users but... well: get another browser!
      }
    },

    // In the future every position attribute will go through this method.
    sanitizePosition: function(arrayPosition) {
      var position;
      if ($.isArray(arrayPosition)) {
        var positionString = '';
        if (arrayPosition[0] == 'center') {
          positionString = arrayPosition[1];
        }
        else if (arrayPosition[1] == 'middle') {
          positionString = arrayPosition[0];
        }
        else {
          positionString = arrayPosition[1] + arrayPosition[0].capitalize();
        }
        if (Opentip.position[positionString] === undefined) throw 'Unknown position: ' + positionString;
        position = Opentip.position[positionString];
      }
      else if (typeof arrayPosition == 'string') {
        if (Opentip.position[arrayPosition] === undefined) throw 'Unknown position: ' + arrayPosition;
        position = Opentip.position[arrayPosition];
      }
      return parseInt(position);
    },


    /* Browser support testing */
    vendors: 'Khtml Ms O Moz Webkit'.split(' '),
    testDiv: document.createElement('div'),
    supports: function(prop) {
      if ( prop in Opentip.testDiv.style ) return true;

      prop = ucfirst(prop);

      var supports = false;
      $.each(Opentip.vendors, function() {
        if (this + prop in Opentip.testDiv.style) {
          supports = true;
          return false;
        }
      });
      return supports;
    }
  };

  this.Opentip.load();





  /**
   * The standard style.
   */

  this.Opentip.styles = {
    standard: {
      // This style contains all default values for other styles.
      // POSITION : [ 'left|right|center', 'top|bottom|middle' ]
      // COORDINATE : [ XVALUE, YVALUE ] (integers)
      title: null,
      className: 'standard', // The class name to be used in the stylesheet
      stem: false, // false (no stem)   ||   true (stem at tipJoint position)   ||   POSITION (for stems in other directions)
      delay: null, // float (in seconds - if null, the default is used: 0.2 for mouseover, 0 for click)
      hideDelay: 0.1, // --
      fixed: false, // If target is not null, elements are always fixed.
      showOn: 'mouseover', // string (the observe string of the trigger element, eg: click, mouseover, etc..)   ||   'creation' (the tooltip will show when being created)   ||   null if you want to handle it yourself.
      hideTrigger: 'trigger', // 'trigger' | 'tip' | 'target' | 'closeButton' | ELEMENT | ELEMENT_ID
      hideOn: null, // string (event eg: click)   ||   null (let Opentip decide)
      offset: [ 0, 0 ], // COORDINATE
      containInViewport: true, // Whether the targetJoint/tipJoint should be changed if the tooltip is not in the viewport anymore.
      autoOffset: true, // If set to true, offsets are calculated automatically to position the tooltip. (pixels are added if there are stems for example)
      showEffect: 'appear', // scriptaculous or CSS3 (in opentip.css) effect
      fallbackShowEffect: 'appear', // At tip creation, this effect will override the showEffect, if useJQueryTransitions == true, and the showEffect does not exist.
      hideEffect: 'fade',
      fallbackHideEffect: 'appear',
      showEffectDuration: 0.3,
      hideEffectDuration: 0.2,
      stemSize: 8, // integer
      tipJoint: [ 'left', 'top' ], // POSITION
      target: null, // null (no target, opentip uses mouse as target)   ||   true (target is the triggerElement)   ||   elementId|element (for another element)
      targetJoint: null, // POSITION (Ignored if target == null)   ||   null (targetJoint is the opposite of tipJoint)
      ajax: false, // Ajax options. eg: { url: 'yourUrl.html', options: { ajaxOptions... } } or { options: { ajaxOptions } /* This will use the href of the A element the tooltip is attached to */ }
      group: null, // You can group opentips together. So when a tooltip shows, it looks if there are others in the same group, and hides them.
      escapeHtml: false,
      style: null
    },
    slick: {
      className: 'slick',
      stem: true
    },
    rounded: {
      className: 'rounded',
      stem: true
    },
    glass: {
      className: 'glass'
    }
  };
  this.Opentip.defaultStyle = 'standard'; // Change this to the style name you want your tooltips to have.



  this.Opentip.position = {
    top: 0,
    topRight: 1,
    right: 2,
    bottomRight: 3,
    bottom: 4,
    bottomLeft: 5,
    left: 6,
    topLeft: 7
  };




  /**
   * On document load
   */
  $(window).ready(function() {
    Opentip.documentIsLoaded = true;

    // Go through all elements, and look for elements that have inline element
    // opentip definitions.
    $('[data-ot]').each(function() {
      var $this = $(this);
      
      var content = $this.data('ot');
      
      if (content === "" || content === "true" || content === "yes") {
        // If no content is set, then we take the title attribute as content.
        content = $this.attr('title') || "";
        // The title attribute in links or images would appear as browser tooltip so we remove it.
        $this.removeAttr('title');
      }

      var options = {};

      if ((options = $this.data('ot-options')) !== undefined) {
        if (!$.isPlainObject(options)) {
          Opentip.debug('Your opentip options object was not correcly formatted as JSON. Be sure to use double quotes, not single quotes for strings.');
          options = {};
        }
      }

      $this.addTip(content, options);
    });

  });



  this.Tips = {
    list: [],
    append: function(tip) {this.list.push(tip);},
    remove: function(element) {
//      if (!element.element) var tip = this.list.find(function(t) {return t.triggerElement === element});
//      else var tip = this.list.find(function(t) {return t === element});
//      if (tip) {
//        tip.deactivate();
//        tip.destroyAllElements();
//        this.list = this.list.without(tip);
//      }
    },
    add: function(element) {
//      if (element._opentipAddedTips) {
//        /* TODO: Now it just returns the first found... try to find the correct one. */
//        var tip = this.list.find(function(t) {return (t.triggerElement === element);});
//        if (tip.options.showOn == 'creation') tip.show();
//        tip.debug('Using an existing opentip.');
//        return;
//      } else setTimeout(function() {element._opentipAddedTips = true;}, 1); // I added a timeout, so that tooltips, defined in an onmouseover or onclick event, will show.
//
//      Opentip.debug('Creating new opentip');
//
//      var tipArguments = [];
//
//      $A(arguments).each(function(arg, idx) {
//        if (idx == 1 && !Opentip.objectIsEvent(arg)) tipArguments.push(null);
//        tipArguments.push(arg);
//      });
//
//
//      // Creating the tooltip object, but not yet activating it, or creating the container elements.
//      var tooltip = new TipClass(tipArguments[0], tipArguments[1], tipArguments[2], tipArguments[3], tipArguments[4]);
//
//      this.append(tooltip);
//
//      var self = this;
//      var createTip = function() {
//        tooltip.create(tipArguments[1]); // Passing the event.
//      }
//
//      Opentip.postponeCreation(createTip);
//
//      return tooltip;
    },
    hideGroup: function(groupName) {
//      this.list.findAll(function(t) {return (t.options.group == groupName);}).invoke('doHide');
    },
    abortShowingGroup: function(groupName) {
//      this.list.findAll(function(t) {return (t.options.group == groupName);}).invoke('abortShowing');
    }
  };



})(jQuery);