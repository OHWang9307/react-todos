// Todo Model
// ----------

// Our basic **Todo** model has `title` and `done` attributes.
var Todo = Backbone.Model.extend({

  // Default attributes for the Todo item.
  defaults: function() {
    return {
      title: "",
      done: false
    };
  }

});

// Todo Collection
// ---------------

// The collection of Todos is backed by *localStorage* instead of a remote
// server.
var TodoList = Backbone.Collection.extend({

  // Reference to this collection's model.
  model: Todo,

  // Save all of the todo items under the `"todos-react"` namespace.
  localStorage: new Backbone.LocalStorage("todos-react"),

  // Filter down the list of all todo items that are finished.
  done: function() {
    return this.where({done: true});
  },

  // Filter down the list to only todo items that are still not finished.
  remaining: function() {
    return this.where({done: false});
  }

});

// Backbone/React Integration
// --------------------------

// Updates React components when their Backbone resources change. Expects the
// component to implement a method called `getResource` that returns an object
// that extends `Backbone.Events`.
var BackboneMixin = {

  // Listen to all events on this component's collection or model and force an
  // update when they fire. Let React decide whether the DOM should change.
  componentDidMount: function() {
    this._boundForceUpdate = this.forceUpdate.bind(this, null);
    this.getResource().on("all", this._boundForceUpdate, this);
  },

  // Clean up the listener when the component will be removed.
  componentWillUnmount: function() {
    this.getResource().off("all", this._boundForceUpdate);
  }

};

// Todo List Item Component
// ------------------------

// The DOM for a todo item...
var TodoListItemComponent = React.createClass({

  // If the component updates and is in edit mode, send focus to the `<input>`.
  componentDidUpdate: function(prevProps) {
    if (this.props.editing && !prevProps.editing) {
      this.refs.editInput.getDOMNode().focus();
    }
  },

  // Destroying the model fires a `remove` event on the model's collection,
  // which forces an update and removes this **TodoListItemComponent** from the
  // DOM. We don't have to do any other cleanup!
  destroy: function() {
    this.props.model.destroy();
  },

  // Stop editing if the input gets an "Enter" keypress.
  handleEditKeyPress: function(event) {
    if (13 === event.keyCode) {
      this.stopEditing();
    }
  },

  render: function() {
    var inputStyles = {};
    var viewStyles = {};

    // Hide the `.view` when editing
    if (this.props.editing) {
      viewStyles.display = "none";

    // ... and hide the `<input>` when not editing
    } else {
      inputStyles.display = "none";
    }

    return (
      <li className={this.props.model.get("done") ? "done" : ""}>
        <div className="view" onDoubleClick={this.startEditing} style={viewStyles}>
          <input className="toggle" type="checkbox"
            checked={this.props.model.get("done")}
            onChange={this.toggleDone} />
          <label>{this.props.model.get("title")}</label>
          <a className="destroy" onClick={this.destroy}></a>
        </div>
        <input className="edit" ref="editInput" type="text"
          onBlur={this.stopEditing}
          onChange={this.setTitle}
          onKeyPress={this.handleEditKeyPress}
          style={inputStyles}
          value={this.props.model.get("title")} />
      </li>
    );
  },

  // Set the title of this item's model when the value of the `<input>` changes.
  setTitle: function(event) {
    this.props.model.set("title", event.target.value);
  },

  // Tell the parent component this list item is entering edit mode.
  startEditing: function() {
    this.props.onStartEditing(this.props.model.id);
  },

  // Exit edit mode.
  stopEditing: function() {
    this.props.onStopEditing(this.props.model.id);
  },

  toggleDone: function(event) {
    this.props.model.set("done", event.target.checked);
  }

});

// Todo List Component
// -------------------

// Renders a list of todos.
var TodoListComponent = React.createClass({

  // Start with no list item in edit mode.
  getInitialState: function() {
    return {
      editingModelId: null
    };
  },

  // When a `TodoListItemComponent` starts editing, it passes its model's ID to
  // this callback. Setting the state triggers this component to re-render and
  // render that `TodoListItemComponent` in edit mode.
  setEditingModelId: function(modelId) {
    this.setState({editingModelId: modelId});
  },

  unsetEditingModelId: function(modelId) {
    if (modelId === this.state.editingModelId) {
      this.setState({editingModelId: null});
    }
  },

  render: function() {
    return (
      <ul id="todo-list">
        {this.props.collection.map(function(model) {
          // Pass the `key` attribute[1] a unique ID so React can track the
          // elements properly.
          //
          // [1] http://facebook.github.io/react/docs/multiple-components.html#dynamic-children
          return (
            <TodoListItemComponent
              editing={this.state.editingModelId === model.id}
              key={model.id}
              model={model}
              onStartEditing={this.setEditingModelId}
              onStopEditing={this.unsetEditingModelId} />
          );
        }, this)}
      </ul>
    );
  }

});

// Footer Component
// ----------------

// The footer shows the total number of todos and how many are completed.
var FooterComponent = React.createClass({

  render: function() {
    var clearCompletedStyles = {};

    // Hide the "Clear X completed items" button if there are no completed
    // items.
    if (0 === this.props.itemsDoneCount) {
      clearCompletedStyles.display = "none";
    }

    // Clicking the "Clear X completed items" button calls the
    // "clearCompletedItems" function passed in on `props`.
    return (
      <footer>
        <a id="clear-completed" style={clearCompletedStyles}
            onClick={this.props.clearCompletedItems}>
          Clear {this.props.itemsDoneCount} completed
          {1 === this.props.itemsDoneCount ? " item" : " items"}
        </a>
        <div className="todo-count">
          <b>{this.props.itemsRemainingCount}</b>
          {1 === this.props.itemsRemainingCount ? " item" : " items"} left
        </div>
      </footer>
    );
  }

});

// Main Component
// --------------

// The main component contains the list of todos and the footer.
var MainComponent = React.createClass({

  // Tell the **App** to toggle the *done* state of all **Todo** items.
  toggleAllItemsCompleted: function(event) {
    this.props.toggleAllItemsCompleted(event.target.checked);
  },

  render: function() {
    var style = {};

    // Hide the "Mark all as complete" button and the footer if there are no
    // **Todo** items.
    if (0 === this.props.collection.length) {
      style.display = "none";
    }

    return (
      <section id="main" style={style}>
        <input id="toggle-all" type="checkbox"
          checked={0 === this.props.collection.remaining().length}
          onChange={this.toggleAllItemsCompleted} />
        <label htmlFor="toggle-all">
          Mark all as complete
        </label>
        <TodoListComponent collection={this.props.collection} />
        <FooterComponent
          clearCompletedItems={this.props.clearCompletedItems}
          itemsRemainingCount={this.props.collection.remaining().length}
          itemsDoneCount={this.props.collection.done().length} />
      </section>
    );
  }

});

var AppComponent = React.createClass({

  // Clear all done todo items, destroying their models.
  clearCompletedItems: function() {
    _.invoke(this.props.collection.done(), "destroy");
  },

  // Fetch Todos before the App is rendered to the DOM.
  componentWillMount: function() {
    this.props.collection.fetch();
  },

  // Start the app with a blank `<input>`.
  getInitialState: function() {
    return {
      title: ""
    };
  },

  // Used by the **BackboneMixin** to watch for changes on this component's
  // resource.
  getResource: function() {
    return this.props.collection;
  },

  // Set the state of the title when the `<input>` is changed.
  handleTitleChange: function(event) {
    this.setState({title: event.target.value});
  },

  // If "Enter" is pressed in the main input field, it will submit the form.
  // Create a new **Todo** in *localStorage* and reset the title.
  handleTitleFormSubmit: function(event) {
    event.preventDefault();

    if ("" === this.state.title) return;

    this.props.collection.create({title: this.state.title});
    this.setState({title: ""});
  },

  toggleAllItemsCompleted: function(completed) {
    this.props.collection.each(function(todo) {
      todo.save({"done": completed});
    });
  },

  // Force updates whenever this **App**'s collection receives events.
  mixins: [BackboneMixin],

  render: function() {
    return (
      <div>
        <header>
          <h1>Todos</h1>
          <form onSubmit={this.handleTitleFormSubmit}>
            <input placeholder="What needs to be done?" type="text" name="title"
              onChange={this.handleTitleChange}
              value={this.state.title} />
          </form>
        </header>
        <MainComponent
          clearCompletedItems={this.clearCompletedItems}
          collection={this.props.collection}
          toggleAllItemsCompleted={this.toggleAllItemsCompleted} />
      </div>
    );
  }
})

// Create a new Todo collection and render the **App** into `#todoapp`.
React.render(
  <AppComponent collection={new TodoList()} />,
  document.getElementById("todoapp")
);
