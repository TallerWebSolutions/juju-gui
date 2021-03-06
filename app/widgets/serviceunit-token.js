/*
This file is part of the Juju GUI, which lets users view and manage Juju
environments within a graphical interface (https://launchpad.net/juju-gui).
Copyright (C) 2012-2013 Canonical Ltd.

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License version 3, as published by
the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranties of MERCHANTABILITY,
SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero
General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

'use strict';


/**
 * Provides the Unit widget, for handling the deployment of units to machines
 * or containers.
 *
 * @module views
 */
YUI.add('juju-serviceunit-token', function(Y) {

  var views = Y.namespace('juju.views'),
      Templates = views.Templates;

  /**
   * The view associated with the machine token.
   *
   * @class ServiceUnitToken
   */
  var ServiceUnitToken = Y.Base.create('ServiceUnitToken', Y.View, [
    Y.Event.EventTracker
  ], {
    template: Templates['serviceunit-token'],

    events: {
      '.unplaced-unit .token-move': {
        click: '_handleMoveIconClick'
      },
      '.unplaced-unit .machines select': {
        change: '_handleMachineSelection'
      },
      '.unplaced-unit .containers select': {
        change: '_handleContainerSelection'
      },
      '.unplaced-unit .actions .move': {
        click: '_placeUnitToken'
      },
      '.unplaced-unit .actions .cancel': {
        click: '_handleCancelClick'
      }
    },

    /**
     * Handles clicks on the Move icon.
     *
     * @method _startMoveHandler
     * @param {Y.Event} e EventFacade object.
     */
    _handleMoveIconClick: function(e) {
      e.preventDefault();
      this._populateMachines();
      this._setStateClass('select-machine');
    },

    /**
     * Handles clicks on the Move action.
     *
     * @method _placeUnitToken
     * @param {Y.Event} e EventFacade object.
     */
    _placeUnitToken: function(e) {
      e.preventDefault();
      var machineValue = this._getSelectedMachine();
      var containerValue = this._getSelectedContainer();
      var constraints = {};

      if (machineValue === 'new' || containerValue === 'new-kvm') {
        constraints = this._getConstraints();
      } else if (!containerValue) {
        // Do nothing, the user has not yet selected a container.
        return;
      }
      this.fire('moveToken', {
        unit: this.get('unit'),
        machine: machineValue,
        container: containerValue,
        constraints: constraints
      });
    },

    /**
      Get the constraints from the form values.

      @method _getConstraints
    */
    _getConstraints: function() {
      var constraintsForm = this.get('container').one('.constraints');
      return {
        'cpu-power': constraintsForm.one('input[name="cpu"]').get('value'),
        mem: constraintsForm.one('input[name="ram"]').get('value'),
        'root-disk': constraintsForm.one('input[name="disk"]').get('value')
      };
    },

    /**
     * Handles clicks on the cancel action.
     *
     * @method _handleCancelClick
     * @param {Y.Event} e EventFacade object.
     */
    _handleCancelClick: function(e) {
      e.preventDefault();
      var container = this.get('container');
      // In lieu of resetting every element, just re-render the HTML.
      container.setHTML(this.template(this.get('unit')));
      this._setStateClass('initial');
    },

    /**
     * Handles changes to the machine selection
     *
     * @method _handleMachineSelection
     * @param {Y.Event} e EventFacade object.
     */
    _handleMachineSelection: function(e) {
      e.preventDefault();
      var machineValue = this._getSelectedMachine();

      if (machineValue === 'new') {
        this._setStateClass('new-machine');
      } else {
        this._populateContainers(machineValue);
        this._setStateClass('select-container');
      }
    },

    /**
     * Handles changes to the container selection
     *
     * @method _handleContainerSelection
     * @param {Y.Event} e EventFacade object.
     */
    _handleContainerSelection: function(e) {
      e.preventDefault();
      var containerValue = this._getSelectedContainer();

      if (containerValue === 'new-kvm') {
        this._setStateClass(containerValue);
      } else {
        this._setStateClass('select-container');
      }
    },

    /**
      Get the selected machine.

      @method _getSelectedMachine
    */
    _getSelectedMachine: function(e) {
      return this.get('container').one('.machines select').get('value');
    },

    /**
      Get the selected container.

      @method _getSelectedContainer
    */
    _getSelectedContainer: function(e) {
      return this.get('container').one('.containers select').get('value');
    },

    /**
      Populate the select with the current machines.

      @method _populateMachines
    */
    _populateMachines: function() {
      var machinesSelect = this.get('container').one('.machines select');
      var machines = this.get('db').machines.filterByParent(null);
      var newMachines = '';
      // Remove current machines. Leave the default options.
      machinesSelect.all('option:not(.default)').remove();
      // Sort machines by id.
      machines.sort(function(obj1, obj2) {
        return obj1.id - obj2.id;
      });
      // Add all the machines to the select
      machines.forEach(function(machine) {
        newMachines += this._createMachineOption(machine);
      }, this);
      machinesSelect.append(newMachines);
    },

    /**
      Populate the select with the current containers.

      @method _populateContainers
      @param {String} parentID A machine id
    */
    _populateContainers: function(parentId) {
      var containersSelect = this.get('container').one('.containers select');
      var containers = this.get('db').machines.filterByParent(parentId);
      var newContainers = '';
      // Remove current containers. Leave the default options.
      containersSelect.all('option:not(.default)').remove();
      // Sort containers by id.
      containers.sort(function(obj1, obj2) {
        // Need to reverse the order as the order will be reversed again
        // when the items are prepended, no appended.
        return obj1.id.split('/')[2] - obj2.id.split('/')[2];
      });
      // Add the bare metal container to the top of the list.
      newContainers += this._createMachineOption(
          {displayName: parentId + '/bare metal', id: 'bare-metal'});
      // Add all the containers to the select.
      containers.forEach(function(container) {
        newContainers += this._createMachineOption(container);
      }, this);
      containersSelect.insert(newContainers, 2);
    },

    /**
      Create an option for a machine or container.

      @method _createMachineOption
      @param {Object} machine A machine object
    */
    _createMachineOption: function(machine) {
      return '<option value="' + machine.id + '">' +
          machine.displayName + '</option>';
    },

    /**
      Makes the token draggable so it can be dropped on a machine, container,
      or column header.

      @method _makeDraggable
    */
    _makeDraggable: function() {
      var container = this.get('container');
      container.setAttribute('draggable', 'true');
      this.addEvent(container.on('dragstart',
          this._makeDragStartHandler(this.getAttrs()), this));
      this.addEvent(container.on('dragend', this._fireDragEndEvent, this));
    },

    /**
      Fires the unit-token-drag-end event

      @method _fireDragEndEvent
    */
    _fireDragEndEvent: function() {
      this.fire('unit-token-drag-end');
    },

    /**
      Generate a function that generates the drag start handler data when
      the drag starts.

      @method _makeDragStartHandler
      @param {Object} attrs The tokens attributes.
      @return {Function} The drag start handler function.
    */
    _makeDragStartHandler: function(attrs) {
      return function(e) {
        var evt = e._event; // We need the real event not the YUI wrapped one.
        var dataTransfer = evt.dataTransfer;
        dataTransfer.effectAllowed = 'move';
        var dragData = {
          id: attrs.unit.id
        };
        dataTransfer.setData('Text', JSON.stringify(dragData));
        // This event is registered on many nested elements, but we only have
        // to handle the drag start once, so stop now.
        evt.stopPropagation();
        this.fire('unit-token-drag-start');
      };
    },

    /**
      Set the state classes on the widget.

      @method _setStateClass
      @param {String} newState the new state.
    */
    _setStateClass: function(newState) {
      var container = this.get('container');
      var existing = container.get('className').split(' ');
      // Remove old state classes.
      existing.forEach(function(className) {
        if (className.indexOf('state-') === 0) {
          container.removeClass(className);
        }
      });
      container.addClass('state-' + newState);
    },

    /**
     * Sets up the DOM nodes and renders them to the DOM.
     *
     * @method render
     */
    render: function() {
      var container = this.get('container'),
          unit = this.get('unit'),
          token;
      container.setHTML(this.template(unit));
      container.addClass('serviceunit-token');
      this._setStateClass('initial');
      token = container.one('.unplaced-unit');
      // This must be setAttribute, not setData, as setData does not
      // manipulate the dom, which we need for our namespaced code
      // to read.
      token.setAttribute('data-id', unit.id);
      this._makeDraggable();
      return this;
    },

    /**
      Removes the view container and all its contents.

      @method destructor
    */
    destructor: function() {
    },

    ATTRS: {
      /**
        The Node instance that contains this token.

        @attribute container
        @type {Object}
       */
      container: {},

      /**
        The model wrapped by this token.

        @attribute unit
        @type {Object}
       */
      unit: {},

      /**
        Reference to the application db

        @attribute db
        @type {Object}
       */
      db: {},

      /**
        Reference to the application env

        @attribute env
        @type {Object}
       */
      env: {}
    }
  });

  views.ServiceUnitToken = ServiceUnitToken;

}, '0.1.0', {
  requires: [
    'base',
    'view',
    'event-tracker',
    'node',
    'juju-templates',
    'handlebars'
  ]
});
