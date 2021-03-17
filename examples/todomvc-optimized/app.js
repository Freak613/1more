/**
 * Rewriting of simple todomvc app
 * with observable helpers.
 */

import { component, html, key, render } from "1more";
import {
  box,
  read,
  write,
  subscribe,
  useSubscription,
  usePropSubscription,
} from "1more/box";

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
  save: todos =>
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        todos.map(t => ({
          ...t,
          done: read(t.done),
          editing: read(t.editing),
          value: read(t.value),
        })),
      ),
    ),
};

const FILTERS = {
  All: () => true,
  Active: t => read(t.done) === false,
  Completed: t => read(t.done) === true,
};

const state = {
  input: box(""),
  placeholder: "What needs to be done?",
  todos: box(
    appStore.fetch().map(todo => {
      todo.done = box(todo.done);
      todo.editing = box(false);
      todo.value = box(todo.value);
      return todo;
    }),
  ),
  filter: box(FILTERS.All),
};

const NewTodo = value => ({
  id: uuid(),
  done: box(false),
  editing: box(false),
  value: box(value),
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
      write(isCheckedAll, t.done);
    });
    appStore.save(todos);
    write(todos, state.todos);
  },
  toggleTodo: id => {
    const todos = read(state.todos);
    todos.forEach(t => {
      if (t.id === id) {
        write(!read(t.done), t.done);
      }
    });
    appStore.save(todos);
    write(todos, state.todos);
  },
  editEnterTodo: id => {
    const todos = read(state.todos);
    todos.forEach(t => {
      if (t.id === id) {
        write(true, t.editing);
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
        write(false, t.editing);
        write(newTitle, t.value);
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

const TodoInput = component(c => {
  const getInputValue = useSubscription(c, state.input);

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

const TodoSection = component(c => {
  const hasIncompletedTodos = useSubscription(
    c,
    state.todos,
    todos => todos.filter(t => !read(t.done)).length > 0,
  );

  return () => {
    return html`
      <section class="main">
        ${hasIncompletedTodos() ? TodoToggleAll() : ""}
      </section>
    `;
  };
});

const TodoItem = component(c => {
  const isDone = usePropSubscription(c);
  const isEditing = usePropSubscription(c);
  const getValue = usePropSubscription(c);

  return todo => {
    const cn = [
      "todo",
      isDone(todo.done) ? "completed" : "",
      isEditing(todo.editing) ? "editing" : "",
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
            checked=${!!isDone(todo.done)}
            onclick=${() => actions.toggleTodo(todo.id)}
          />
          <label ondblclick=${onDoubleClick}>${getValue(todo.value)}</label>
          <button
            class="destroy"
            onclick=${() => actions.removeTodo(todo.id)}
          ></button>
        </div>
        <input
          type="text"
          class="edit"
          value=${getValue(todo.value)}
          onkeyup=${onKeyUp}
          onblur=${onBlur}
        />
      </li>
    `;
  };
});

const TodoList = component(c => {
  const getFilteredTodos = useSubscription(c, filteredTodos);

  return () => {
    return html`
      <ul class="todo-list">
        ${getFilteredTodos().map(t => key(t.id, TodoItem(t)))}
      </ul>
    `;
  };
});

const TodoFilterItem = component(c => {
  const isSelected = useSubscription(
    c,
    state.filter,
    (stateFilter, filter) => filter === stateFilter,
  );

  return filterName => {
    const filter = FILTERS[filterName];

    return html`
      <li>
        <a
          class=${isSelected(filter) ? "selected" : null}
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

const TodoFilter = component(c => {
  const getNumberOfIncompletedTodos = useSubscription(
    c,
    state.todos,
    todos => todos.filter(t => !read(t.done)).length,
  );

  const hasCompletedTodos = useSubscription(
    c,
    state.todos,
    todos => todos.filter(t => read(t.done)).length > 0,
  );

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
