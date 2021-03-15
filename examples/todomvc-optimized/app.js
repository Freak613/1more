/**
 * Rewriting of simple todomvc app
 * with observable helpers.
 */

import { component, html, key, render } from "1more";
import {
  box,
  write,
  createSelector,
  read,
  keyedSelector,
  subscribe,
  unchanged,
} from "1more/box";
import { memo } from "1more/utils";

const ENTER_KEY = 13;

const uuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const STORAGE_KEY = "todos-1more";

const appStore = {
  fetch: () => JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"),
  save: todos => localStorage.setItem(STORAGE_KEY, JSON.stringify(todos)),
};

const FILTERS = {
  All: () => true,
  Active: ({ done }) => done === false,
  Completed: ({ done }) => done === true,
};

const state = {
  input: box(""),
  placeholder: "What needs to be done?",
  todos: box(
    appStore.fetch().map(todo => {
      todo.age = 0;
      todo.editing = false;
      return todo;
    }),
  ),
  filter: box(FILTERS.All),
};

/**
 * Use `age` flag to mark changed items.
 *
 * Since it's going to be used as a key in
 * WeakMap, creating new object on each change
 * will cause improper cache invalidation.
 */
const NewTodo = value => ({
  id: uuid(),
  age: 0,
  done: false,
  editing: false,
  value,
});

const actions = {
  updateInput: value => {
    write(value, state.input);
  },
  addTodo: title => {
    const todos = read(state.todos).concat(NewTodo(title));
    appStore.save(todos);
    write(todos, state.todos);
    write("", state.input);
  },
  toggleAll: isCheckedAll => {
    const todos = read(state.todos);
    todos.forEach(t => {
      t.age++;
      t.done = isCheckedAll;
    });
    appStore.save(todos);
    /**
     * Keep updating todos observable.
     *
     * Array reference equality will
     * be considered as internal item change.
     */
    write(todos, state.todos);
  },
  toggleTodo: id => {
    const todos = read(state.todos);
    todos.forEach(t => {
      if (t.id === id) {
        t.age++;
        t.done = !t.done;
      }
    });
    appStore.save(todos);
    write(todos, state.todos);
  },
  editEnterTodo: id => {
    const todos = read(state.todos);
    todos.forEach(t => {
      if (t.id === id) {
        t.age++;
        t.editing = true;
      }
    });
    appStore.save(todos);
    write(todos, state.todos);
  },
  removeTodo: id => {
    const todos = read(state.todos).filter(t => t.id !== id);
    appStore.save(todos);
    write(todos, state.todos);
  },
  editUpdateTodo: (id, newTitle) => {
    const todos = read(state.todos);
    todos.forEach(t => {
      if (t.id === id) {
        t.age++;
        t.editing = false;
        t.value = newTitle;
      }
    });
    appStore.save(todos);
    write(todos, state.todos);
  },
  filterTodo: filter => {
    write(filter, state.filter);
  },
  clearCompleted: () => {
    const todos = read(state.todos).filter(t => !t.done);
    appStore.save(todos);
    write(todos, state.todos);
  },
};

/**
 * Create observable of filtered items.
 *
 * It's going to emit on:
 * - state.filter change
 * - when number of filtered items is changed,
 *   for example item added/removed or
 *   `done` flag is changed
 */
const filteredTodos = (() => {
  const filterTodos = (todos, filter) => todos.filter(filter);

  let prev = filterTodos(read(state.todos), read(state.filter));

  const output = box(prev);

  subscribe(todos => {
    const next = filterTodos(todos, read(state.filter));
    if (next.length !== prev.length) {
      prev = next;
      write(prev, output);
    }
  }, state.todos);

  subscribe(filter => {
    prev = filterTodos(read(state.todos), filter);
    write(prev, output);
  }, state.filter);

  return output;
})();

const TodoHeader = component(() => () => {
  return html`
    <header class="header">
      <h1>todos</h1>
    </header>
  `;
});

let todoInputRef;

const getInputValue = createSelector(state.input, () => todoInputRef);

const TodoInput = component(c => {
  todoInputRef = c;

  return () => {
    const onKeyDown = e => {
      if (e.keyCode === ENTER_KEY && e.target.value !== "") {
        actions.addTodo(e.target.value);
      }
    };

    const onInput = e => {
      const input = e.target.value;
      actions.updateInput(input);
    };

    return html`
      <div>
        <input
          type="text"
          class="new-todo"
          value=${getInputValue()}
          placeholder=${state.placeholder}
          onkeydown=${onKeyDown}
          oninput=${onInput}
        />
      </div>
    `;
  };
});

const TodoToggleAll = component(() => () => {
  const onCheck = e => {
    let isCheckedAll = e.target.previousSibling.checked;
    isCheckedAll = !isCheckedAll;
    actions.toggleAll(isCheckedAll);
  };

  return html`
    <div>
      <input type="checkbox" class="toggle-all" id="toggle-all" />
      <label for="toggle-all" onclick=${onCheck}>Mark all as complete</label>
    </div>
  `;
});

let todoSectionRef;

const hasIncompletedTodos = createSelector(
  state.todos,
  () => todoSectionRef,
  todos => todos.filter(t => !t.done).length > 0,
);

const TodoSection = component(c => {
  todoSectionRef = c;

  return () => {
    return html`
      <section class="main">
        ${hasIncompletedTodos() ? TodoToggleAll() : ""}
      </section>
    `;
  };
});

const todoItemsRefs = new WeakMap();

const readTodoAge = keyedSelector(
  /**
   * Look for internal todos changes.
   *
   * For example adding/removal
   * will not trigger recomputation.
   */
  unchanged(state.todos),
  /**
   * Check only visible todos
   */
  () => read(filteredTodos),
  /**
   * Changed todos going
   * to have `age` updated.
   */
  t => t.age,
  todoItemsRefs,
);

const TodoItem = component(c => {
  /**
   * When `todo` prop changed,
   * store component ref under new key.
   */
  const setup = memo(todo => {
    todoItemsRefs.set(todo, c);
  });

  return todo => {
    setup(todo);

    /**
     * Despite this selector doesn't provide
     * useful information, call it
     * from component render phase,
     * to keep age cache up-to-date in
     * case component was re-rendered
     * for reasons unrelated to item age change.
     */
    readTodoAge(todo);

    const cn = [
      "todo",
      todo.done ? "completed" : "",
      todo.editing ? "editing" : "",
    ]
      .filter(v => !!v)
      .join(" ");

    const onDoubleClick = e => {
      actions.editEnterTodo(todo.id);
      const input = e.target.parentNode.parentNode.querySelector(".edit");
      input.focus();
    };

    const onKeyUp = e => {
      if (e.keyCode === ENTER_KEY) {
        actions.editUpdateTodo(todo.id, e.target.value);
      }
    };

    const onBlur = e => {
      actions.editUpdateTodo(todo.id, e.target.value);
    };

    return html`
      <li class=${cn}>
        <div class="view">
          <input
            type="checkbox"
            class="toggle"
            checked=${!!todo.done}
            onclick=${() => actions.toggleTodo(todo.id)}
          />
          <label ondblclick=${onDoubleClick}>${todo.value}</label>
          <button
            class="destroy"
            onclick=${() => actions.removeTodo(todo.id)}
          ></button>
        </div>
        <input
          type="text"
          class="edit"
          value=${todo.value}
          onkeyup=${onKeyUp}
          onblur=${onBlur}
        />
      </li>
    `;
  };
});

let todoListRef;

const getFilteredTodos = createSelector(filteredTodos, () => todoListRef);

const TodoList = component(c => {
  todoListRef = c;

  return () => {
    return html`
      <ul class="todo-list">
        ${getFilteredTodos().map(t => key(t.id, TodoItem(t)))}
      </ul>
    `;
  };
});

const todoFilterItemsRefs = new WeakMap();

const isFilterSelected = keyedSelector(
  state.filter,
  () => Object.values(FILTERS),
  (filter, stateFilter) => filter === stateFilter,
  todoFilterItemsRefs,
);

const TodoFilterItem = component(c => {
  const setup = memo(filter => {
    todoFilterItemsRefs.set(filter, c);
  });

  return filterName => {
    /**
     * To store component ref in WeakMap cache,
     * convert name prop to some object reference.
     * Actual filter callback is good candidate.
     */
    const filter = FILTERS[filterName];

    setup(filter);

    return html`
      <li>
        <a
          class=${isFilterSelected(filter) ? "selected" : null}
          onclick=${() => actions.filterTodo(filter)}
        >
          ${filterName}
        </a>
      </li>
    `;
  };
});

const TodoClearCompleted = component(() => () => {
  return html`
    <button class="clear-completed" onclick=${() => actions.clearCompleted()}>
      Clear completed
    </button>
  `;
});

let todoFilterRef;

const getNumberOfIncompletedTodos = createSelector(
  state.todos,
  () => todoFilterRef,
  todos => todos.filter(t => !t.done).length,
);

const hasCompletedTodos = createSelector(
  state.todos,
  () => todoFilterRef,
  todos => todos.filter(t => t.done).length > 0,
);

const TodoFilter = component(c => {
  todoFilterRef = c;

  return () => {
    const itemsLeft = `${getNumberOfIncompletedTodos()} item left`;

    return html`
      <footer class="footer">
        <span class="todo-count">${itemsLeft}</span>
        <ul class="filters">
          ${Object.keys(FILTERS).map(filterName =>
            key(filterName, TodoFilterItem(filterName)),
          )}
        </ul>
        ${hasCompletedTodos() ? TodoClearCompleted() : ""}
      </footer>
    `;
  };
});

const TodoFooter = component(() => () => {
  return html`
    <footer class="info">
      <p>Double-click to edit a todo</p>
      <p>
        <span>Part of </span>
        <a href="https://todomvc.com">TodoMVC</a>
      </p>
    </footer>
  `;
});

const App = component(() => () => {
  return html`
    <div class="container">
      <section class="todoapp">
        ${TodoHeader()} ${TodoInput()} ${TodoSection()} ${TodoList()}
        ${TodoFilter()}
      </section>
      ${TodoFooter()}
    </div>
  `;
});

render(App(), document.getElementById("app"));
