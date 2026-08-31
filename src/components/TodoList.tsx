import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

const STORAGE_KEY = 'moyu-todo-list-v1';
const LEAVING_MS = 200;
const MAX_TEXT = 40;

const loadTodos = (): Todo[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as unknown;
    if (!Array.isArray(list)) return [];
    return list
      .filter((it): it is Todo =>
        typeof it === 'object' && it !== null &&
        typeof (it as Todo).id === 'number' &&
        typeof (it as Todo).text === 'string' &&
        typeof (it as Todo).done === 'boolean'
      )
      .map((it) => ({ id: it.id, text: it.text.slice(0, MAX_TEXT), done: it.done }));
  } catch {
    return [];
  }
};

const persist = (list: Todo[]) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // 隐私模式或磁盘满,内存里依然能用
  }
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [draft, setDraft] = useState('');
  const [leavingId, setLeavingId] = useState<number | null>(null);
  const leaveTimerRef = useRef<number | null>(null);

  // 卸载时清掉挂起的删除动画定时器,避免对已卸载组件继续 setState
  useEffect(() => {
    return () => {
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const update = useCallback((next: Todo[]) => {
    setTodos(next);
    persist(next);
  }, []);

  // 把 item 放到与其 done 状态对应的分组末端:
  // - 已完成 → 列表最末(已完成项按完成顺序排列,最新完成的在最下)
  // - 未完成 → 已完成组之前(若存在已完成组),保证「未完成项一直在最上方」
  const placeAtGroupEnd = (list: Todo[], item: Todo): Todo[] => {
    const rest = list.filter((t) => t.id !== item.id);
    if (item.done) return [...rest, item];
    const restUnfinished = rest.filter((t) => !t.done);
    const restFinished = rest.filter((t) => t.done);
    return [...restUnfinished, item, ...restFinished];
  };

  const addTodo = (e?: FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = Date.now() + Math.floor(Math.random() * 1000);
    update(placeAtGroupEnd(todos, { id, text, done: false }));
    setDraft('');
  };

  const handleInputKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTodo();
    }
  };

  const toggleDone = (id: number) => {
    const item = todos.find((t) => t.id === id);
    if (!item) return;
    update(placeAtGroupEnd(todos, { ...item, done: !item.done }));
  };

  const removeTodo = (id: number) => {
    setLeavingId(id);
    if (leaveTimerRef.current !== null) window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      update(todos.filter((t) => t.id !== id));
      setLeavingId(null);
      leaveTimerRef.current = null;
    }, LEAVING_MS);
  };

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const remain = total - doneCount;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  return (
    <section className="todo-section">
      <header className="header">
        <span className="date">待办事项</span>
        <span className="weekday">
          {total === 0 ? '暂无' : `${remain} 项未完成`}
        </span>
      </header>

      <div className="divider" />

      <form className="todo-add-row" onSubmit={addTodo}>
        <input
          type="text"
          className="no-drag"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleInputKey}
          placeholder="比如 回复客户邮件"
          maxLength={MAX_TEXT}
          aria-label="新增待办"
        />
        <button type="submit" className="todo-add-btn no-drag" disabled={!draft.trim()}>
          添加
        </button>
      </form>

      <div className="todo-list" role="list">
        {total === 0 ? (
          <div className="todo-empty">
            <span className="emoji" aria-hidden>📝</span>
            <span>今天还没有待办，添加一个吧</span>
          </div>
        ) : (
          todos.map((item) => (
            <div
              key={item.id}
              role="listitem"
              className={
                'todo-item' +
                (item.done ? ' done' : '') +
                (item.id === leavingId ? ' leaving' : '')
              }
            >
              <button
                type="button"
                className="todo-check no-drag"
                onClick={() => toggleDone(item.id)}
                aria-label={item.done ? '标记为未完成' : '标记为已完成'}
                aria-pressed={item.done}
              />
              <span className="todo-text">{item.text}</span>
              <button
                type="button"
                className="todo-del no-drag"
                onClick={() => removeTodo(item.id)}
                title="删除"
                aria-label={`删除「${item.text}」`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div className="todo-progress">
        <span className="todo-progress-label">今日</span>
        <div className="tank-track">
          <div className="tank-fill" style={{ width: `${pct}%` }}>
            <span className="tank-fish" aria-hidden>✅</span>
          </div>
        </div>
        <span className="todo-progress-percent">{pct}%</span>
      </div>

      <p className="todo-caption">
        {total === 0
          ? '添加几项，开始今天的计划吧'
          : `共 ${total} 项 · 已完成 ${doneCount} 项`}
      </p>
    </section>
  );
}
