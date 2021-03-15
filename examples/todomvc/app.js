/**
 * This is 1-to-1 rewrite of hyperapp version:
 * https://github.com/dangvanthanh/hyperapp-todomvc
 */

import { component, html, key, render } from "1more";

const ENTER_KEY = 13;

const uuid = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const assignTodoById = (todos, id, ...todo) => {
  let todoItem = todo[0];
  return todos.map(t => (id === t.id ? Object.assign({}, t, todoItem) : t));
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

let state = {
  input: "",
  placeholder: "What needs to be done?",
  todos: appStore.fetch().map(todo => {
    todo.editing = false;
    return todo;
  }),
  filter: FILTERS.All,
};

const NewTodo = value => ({
  id: uuid(),
  done: false,
  editing: false,
  value,
});

const actions = {
  updateInput: value => {
    state = { ...state, input: value };
    _render();
  },
  addTodo: title => {
    const todos = state.todos.concat(NewTodo(title));
    appStore.save(todos);
    state = { ...state, todos, input: "" };
    _render();
  },
  toggleAll: isCheckedAll => {
    const todos = state.todos.map(t => ({ ...t, done: isCheckedAll }));
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
  toggleTodo: id => {
    const todos = state.todos.map(t =>
      t.id === id ? Object.assign({}, t, { done: !t.done }) : t,
    );
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
  editEnterTodo: id => {
    const todos = assignTodoById(state.todos, id, { editing: true });
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
  removeTodo: id => {
    const todos = state.todos.filter(t => t.id !== id);
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
  editUpdateTodo: (id, newTitle) => {
    const todos = assignTodoById(state.todos, id, {
      editing: false,
      value: newTitle,
    });
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
  filterTodo: filter => {
    state = { ...state, filter };
    _render();
  },
  clearCompleted: () => {
    const todos = state.todos.filter(t => !t.done);
    appStore.save(todos);
    state = { ...state, todos };
    _render();
  },
};

const TodoHeader = component(() => () => {
  return html`
    <header class="header">
      <h1>todos</h1>
    </header>
  `;
});

const TodoInput = component(() => state => {
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
        value=${state.input}
        placeholder=${state.placeholder}
        onkeydown=${onKeyDown}
        oninput=${onInput}
      />
    </div>
  `;
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

const TodoSection = component(() => state => {
  return html`
    <section class="main">
      ${state.todos.filter(t => !t.done).length > 0 ? TodoToggleAll() : ""}
    </section>
  `;
});

const TodoItem = component(() => todo => {
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
});

const TodoList = component(() => ({ todos, filter }) => {
  return html`
    <ul class="todo-list">
      ${todos.filter(filter).map(t => key(t.id, TodoItem(t)))}
    </ul>
  `;
});

const TodoFilterItem = component(() => ({ key, filter }) => {
  return html`
    <li>
      <a
        class=${filter === FILTERS[key] ? "selected" : null}
        onclick=${() => actions.filterTodo(FILTERS[key])}
      >
        ${key}
      </a>
    </li>
  `;
});

const TodoClearCompleted = component(() => () => {
  return html`
    <button class="clear-completed" onclick=${() => actions.clearCompleted()}>
      Clear completed
    </button>
  `;
});

const TodoFilter = component(() => state => {
  const itemsLeft = `${state.todos.filter(t => !t.done).length} item left`;

  return html`
    <footer class="footer">
      <span class="todo-count">${itemsLeft}</span>
      <ul class="filters">
        ${Object.keys(FILTERS).map(filterName =>
          key(
            filterName,
            TodoFilterItem({ key: filterName, filter: state.filter }),
          ),
        )}
      </ul>
      ${state.todos.filter(t => t.done).length > 0 ? TodoClearCompleted() : ""}
    </footer>
  `;
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

const App = component(() => state => {
  return html`
    <div class="container">
      <section class="todoapp">
        ${TodoHeader()} ${TodoInput(state)} ${TodoSection(state)}
        ${TodoList({ todos: state.todos, filter: state.filter })}
        ${TodoFilter(state)}
      </section>
      ${TodoFooter()}
    </div>
  `;
});

const _render = () => {
  render(App(state), document.getElementById("app"));
};
_render();
