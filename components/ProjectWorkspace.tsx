"use client";

import { useState } from "react";

type Task = { id: string; title: string; status: "TODO" | "IN_PROGRESS" | "DONE"; assignedToUserId?: string | null };
type Note = { id: string; body: string; createdAt: string; authorUserId: string; author: { fullName: string }; attachmentUrl?: string | null; attachmentName?: string | null };
type Participant = { id: string; name: string };

const statusLabels: Record<Task["status"], string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

export default function ProjectWorkspace({
  basePath,
  initialTasks,
  initialNotes,
  role,
  currentUserId,
  participants,
}: {
  basePath: string; // e.g. "/api/orders/abc123" or "/api/team-orders/abc123"
  initialTasks: Task[];
  initialNotes: Note[];
  role: "client" | "provider" | null;
  currentUserId: string;
  participants: Participant[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);
  const [newTask, setNewTask] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newNote, setNewNote] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; name: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FIXED (real gap found during review): the only way to share a file
  // during an active order was buried in chat — this is the real,
  // dedicated document capability the workspace was missing.
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads/workspace-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setPendingAttachment({ url: data.url, name: data.name });
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  }

  function nextStatusFor(current: Task["status"]): Task["status"] {
    if (role === "client") {
      if (current === "DONE") return "TODO"; // reopen
      return current === "TODO" ? "IN_PROGRESS" : "TODO";
    }
    const order: Task["status"][] = ["TODO", "IN_PROGRESS", "DONE"];
    return order[(order.indexOf(current) + 1) % order.length];
  }

  async function addTask() {
    if (!newTask.trim()) return;
    setError(null);
    try {
      const res = await fetch(`${basePath}/workspace/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTask, assignedToUserId: newTaskAssignee || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that task");
        return;
      }
      setTasks((t) => [...t, data.task]);
      setNewTask("");
      setNewTaskAssignee("");
    } catch {
      setError("Network error — please try again.");
    }
  }

  async function cycleStatus(task: Task) {
    const nextStatus = nextStatusFor(task.status);
    const prevTasks = tasks;
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, status: nextStatus } : x)));
    setError(null);
    const res = await fetch(`${basePath}/workspace/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!res.ok) {
      setTasks(prevTasks);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't update that task");
    }
  }

  async function reassignTask(task: Task, assigneeId: string) {
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, assignedToUserId: assigneeId || null } : x)));
    await fetch(`${basePath}/workspace/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToUserId: assigneeId || null }),
    });
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setError(null);
    try {
      const res = await fetch(`${basePath}/workspace/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: newNote,
          ...(pendingAttachment ? { attachmentUrl: pendingAttachment.url, attachmentName: pendingAttachment.name } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't add that note");
        return;
      }
      setNotes((n) => [data.note, ...n]);
      setNewNote("");
      setPendingAttachment(null);
    } catch {
      setError("Network error — please try again.");
    }
  }

  async function deleteNote(noteId: string) {
    const prevNotes = notes;
    setNotes((n) => n.filter((x) => x.id !== noteId));
    const res = await fetch(`${basePath}/workspace/notes/${noteId}`, { method: "DELETE" });
    if (!res.ok) setNotes(prevNotes);
  }

  function participantName(id?: string | null) {
    if (!id) return "Unassigned";
    return participants.find((p) => p.id === id)?.name ?? "Unknown";
  }

  return (
    <div className="flex flex-col gap-10">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</div>}
      {role && (
        <p className="text-xs text-neutral-500 -mb-6">
          {role === "provider"
            ? "You're viewing as the provider — you can mark tasks Done."
            : "You're viewing as the client — only the provider can mark a task Done; you can reopen one if needed."}
        </p>
      )}

      <div>
        <h2 className="text-sm font-bold text-neutral-900 mb-3">Tasks</h2>
        <div className="flex gap-2 mb-4">
          <input
            className="input"
            placeholder="Add a task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
          />
          <select className="input w-auto" value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)}>
            <option value="">Unassigned</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={addTask} className="btn-secondary shrink-0">
            Add
          </button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-neutral-500">No tasks yet.</p>
        ) : (
          <div className="card divide-y divide-neutral-200">
            {tasks.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between gap-3">
                <span className={`text-sm flex-1 ${t.status === "DONE" ? "line-through text-neutral-400" : "text-neutral-800"}`}>{t.title}</span>
                <select
                  className="text-xs border border-neutral-200 rounded px-1.5 py-1 text-neutral-600"
                  value={t.assignedToUserId ?? ""}
                  onChange={(e) => reassignTask(t, e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button onClick={() => cycleStatus(t)} className="badge shrink-0">
                  {statusLabels[t.status]}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-bold text-neutral-900 mb-3">Decision log / notes</h2>
        <div className="flex gap-2 mb-2">
          <input
            className="input"
            placeholder="Log a decision or note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
          />
          <button onClick={addNote} className="btn-secondary shrink-0">
            Add
          </button>
        </div>
        {/* FIXED (real gap found during review): the only way to share a
            file during an active order was buried in chat — reference
            documents, spec sheets, deliverables now have a real, dedicated
            place attached directly to a note. */}
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-brand-700 cursor-pointer hover:underline">
            {uploadingFile ? "Uploading..." : "📎 Attach a document"}
            <input type="file" className="hidden" onChange={handleFileSelect} disabled={uploadingFile} />
          </label>
          {pendingAttachment && (
            <span className="text-xs text-neutral-500">
              {pendingAttachment.name} <button onClick={() => setPendingAttachment(null)} className="text-red-600 hover:underline ml-1">remove</button>
            </span>
          )}
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-neutral-500">No notes yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {notes.map((n) => (
              <div key={n.id} className="card p-3">
                <div className="flex justify-between items-start gap-3">
                  <p className="text-sm text-neutral-800 flex-1">{n.body}</p>
                  {n.authorUserId === currentUserId && (
                    <button onClick={() => deleteNote(n.id)} className="text-xs text-red-600 hover:underline shrink-0">
                      Delete
                    </button>
                  )}
                </div>
                {n.attachmentUrl && (
                  <a href={n.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-700 hover:underline mt-1 inline-block">
                    📎 {n.attachmentName ?? "Download attachment"}
                  </a>
                )}
                <p className="text-xs text-neutral-500 mt-1">
                  {n.author.fullName} · {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
